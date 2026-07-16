import {
  ChevronLeft,
  AlertTriangle,
  ShieldCheck,
  MapPin,
  Calendar,
  Award,
  MessageCircle,
  UserMinus,
  UserPlus,
  HeartCrack,
  Heart,
  Users,
  Clock,
  Sparkles,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useState, useMemo, useCallback } from 'react';
import { useNavigationStore } from '../store/useNavigationStore';
import { useMessagingStore } from '../store/useMessagingStore';
import { ReportModal } from '../components/ReportModal';
import { ProProfileDetails } from '../components/ProProfileDetails';
import { ProfileKarmaBadge } from '../components/ProfileKarmaBadge';
import { HScrollRail } from '../components/HScrollRail';
import { KARMA_DEFAULT } from '../lib/karma';
import { syncProfessionalVerifiedFromProfile } from '../lib/proVerification';
import { hasReachedDailyFriendRequestLimit } from '../lib/eventDateKey';
import { hasViewerPremiumAccess } from '../lib/viewerEntitlements';
import { ProfileBadgesSection } from '../components/ProfileBadgesSection';
import { useTranslation } from '../i18n/useTranslation';
import { isEventDateBeforeToday } from '../lib/eventDateKey';
import { formatBadgeCount } from '../data/mockData';
import type { Event } from '../data/mockData';
import './ProfilePage.css';
import './OtherProfilePage.css';
import './ProProfilePage.css';
import '../components/ProContactLinks.css';

interface OtherProfilePageProps {
  id: string;
}

type OtherProfileTab = 'favorites' | 'friends' | 'history';

type AdminProfileDraft = {
  name: string;
  age: string;
  bio: string;
  city: string;
  memberSince: string;
  karma: string;
  verified: boolean;
  isPro: boolean;
  websiteUrl: string;
  socialUrl: string;
  phone: string;
  proAddress: string;
  statsEvents: string;
  statsFriends: string;
};

export function OtherProfilePage({ id }: OtherProfilePageProps) {
  const { t } = useTranslation();
  const { closeDetail, openDetail, setActiveTab } = useNavigationStore();
  const {
    suggestions,
    profileVisits,
    friends,
    sendFriendRequest,
    removeMutualFriend,
    openOrCreateDmConversation,
    friendRequestSentProfilIds,
    friendRequestRejectedProfilIds,
    friendRequestDailySentDateKey,
    isAdmin,
    events,
    conversations,
    toggleEventFavorite,
    updateProfile,
    adminDeleteProfile,
  } = useMessagingStore();

  const [reportOpen, setReportOpen] = useState(false);
  const [activeOpTab, setActiveOpTab] = useState<OtherProfileTab>('favorites');
  const [adminEditing, setAdminEditing] = useState(false);
  const [adminDraft, setAdminDraft] = useState<AdminProfileDraft>({
    name: '',
    age: '',
    bio: '',
    city: '',
    memberSince: '',
    karma: '',
    verified: false,
    isPro: false,
    websiteUrl: '',
    socialUrl: '',
    phone: '',
    proAddress: '',
    statsEvents: '0',
    statsFriends: '0',
  });

  const showInsightTabs = useMessagingStore(hasViewerPremiumAccess);

  // Fiche enrichie (amis / profils) + libellé public toujours issu de viewer_settings
  // via l’annuaire suggestions (registered members).
  const friendRecord = friends.find((f) => f.profilId === id);
  const suggestionRecord = suggestions.find((s) => s.id === id);
  const visitRecord = profileVisits.find((v) => v.id === id);
  const profile = friendRecord || suggestionRecord || visitRecord;

  if (!profile) return null;

  const profileBadges = friendRecord && Array.isArray(friendRecord.badges)
    ? friendRecord.badges
    : Array.isArray((profile as { badges?: string[] }).badges)
      ? ((profile as { badges?: string[] }).badges as string[])
      : ["Pionnier"];
  const isMutualFriend = friendRecord?.mutualFriend === true;
  const requestSent = friendRequestSentProfilIds.includes(id);
  const requestRejected = friendRequestRejectedProfilIds.includes(id);
  const dailyFriendRequestLimitReached = hasReachedDailyFriendRequestLimit(
    friendRequestDailySentDateKey,
  );

  const p = profile as unknown as Record<string, unknown>;
  const displayName =
    suggestionRecord?.pseudo?.trim() ||
    (typeof p.name === 'string' && p.name.trim()) ||
    (typeof p.pseudo === 'string' && p.pseudo.trim()) ||
    visitRecord?.name?.trim() ||
    id;
  const profileAvatarUrl =
    ('imageUrl' in profile ? profile.imageUrl : profile.avatarUrl) as string;
  const profileKarma = friendRecord?.karma ?? KARMA_DEFAULT;

  const friendsBadgeCount = useMemo(() => {
    const n = (p.stats as { friends?: number } | undefined)?.friends;
    if (typeof n === 'number' && n > 0) return Math.min(99, n);
    return Math.min(99, Math.max(0, friends.filter((f) => f.profilId !== id).length));
  }, [p.stats, friends, id]);

  const theirEvents = useMemo((): Event[] => {
    const refName = (friendRecord?.name ?? displayName ?? '').trim();
    const firstTok = refName.split(/\s+/)[0] ?? '';
    return events.filter((ev) => {
      const conv = conversations.find((c) => c.id === ev.conversationId);
      if (conv?.members?.some((m) => m.profilId === id)) return true;
      const hostN = ev.hostName?.trim() ?? '';
      if (refName && hostN === refName) return true;
      if (firstTok && hostN.startsWith(firstTok)) return true;
      return false;
    });
  }, [events, conversations, id, friendRecord?.name, displayName]);

  const theirFavoritesAndHosted = useMemo(
    () =>
      theirEvents.filter(
        (e) =>
          (e.isFavorite || e.status === 'organisateur') && !isEventDateBeforeToday(e.dateKey),
      ),
    [theirEvents],
  );

  const theirHistory = useMemo(
    () =>
      theirEvents.filter(
        (e) =>
          isEventDateBeforeToday(e.dateKey) &&
          (e.status === 'inscrit' || e.status === 'organisateur' || e.isFavorite),
      ),
    [theirEvents],
  );

  const otherFriendsPreview = useMemo(
    () => friends.filter((f) => f.profilId !== id).slice(0, 24),
    [friends, id],
  );

  const selectOpTab = useCallback((next: OtherProfileTab) => {
    setActiveOpTab((cur) => (cur === next ? cur : next));
  }, []);

  const handleContact = useCallback(() => {
    const conversationId = openOrCreateDmConversation({
      profilId: id,
      displayName,
      avatarUrl: profileAvatarUrl,
    });
    setActiveTab('chat');
    openDetail('chat', conversationId);
  }, [openOrCreateDmConversation, id, displayName, profileAvatarUrl, setActiveTab, openDetail]);

  const buildAdminDraft = useCallback((): AdminProfileDraft => {
    const stats = (p.stats as { events?: number; friends?: number } | undefined);
    return {
      name: displayName,
      age: String((p.age as number | null | undefined) ?? friendRecord?.age ?? ''),
      bio: (p.bio as string | undefined) || friendRecord?.bio || '',
      city: friendRecord?.city || (p.city as string | undefined) || '',
      memberSince:
        friendRecord?.memberSince ||
        (profile as { memberSince?: string }).memberSince ||
        '2024',
      karma: String(profileKarma),
      verified:
        friendRecord?.verified ??
        (profile as { verified?: boolean }).verified ??
        false,
      isPro: friendRecord?.isPro ?? (profile as { isPro?: boolean }).isPro ?? false,
      websiteUrl: friendRecord?.websiteUrl || '',
      socialUrl: friendRecord?.socialUrl || '',
      phone: friendRecord?.phone || '',
      proAddress: friendRecord?.proAddress || '',
      statsEvents: String(stats?.events ?? '0'),
      statsFriends: String(stats?.friends ?? '0'),
    };
  }, [p, displayName, friendRecord, profile, profileKarma]);

  const startAdminEdit = useCallback(() => {
    setAdminDraft(buildAdminDraft());
    setAdminEditing(true);
  }, [buildAdminDraft]);

  const handleAdminDeleteProfile = useCallback(() => {
    if (!window.confirm(t('adminDeleteProfileConfirm'))) return;
    adminDeleteProfile(id);
    closeDetail();
  }, [adminDeleteProfile, closeDetail, id, t]);

  const handleAdminSave = useCallback(() => {
    const ageNum = adminDraft.age.trim() ? parseInt(adminDraft.age, 10) : null;
    const karmaNum = parseInt(adminDraft.karma, 10);
    const eventsNum = parseInt(adminDraft.statsEvents, 10);
    const friendsNum = parseInt(adminDraft.statsFriends, 10);
    const name = adminDraft.name.trim();
    updateProfile(id, {
      name,
      pseudo: name,
      age: Number.isFinite(ageNum) ? ageNum : null,
      bio: adminDraft.bio,
      city: adminDraft.city,
      memberSince: adminDraft.memberSince,
      verified: adminDraft.verified,
      isPro: adminDraft.isPro,
      karma: Number.isFinite(karmaNum) ? karmaNum : 5,
      websiteUrl: adminDraft.websiteUrl,
      socialUrl: adminDraft.socialUrl,
      phone: adminDraft.phone,
      proAddress: adminDraft.proAddress,
      stats: {
        events: Number.isFinite(eventsNum) ? eventsNum : 0,
        friends: Number.isFinite(friendsNum) ? friendsNum : 0,
      },
    });
    if (adminDraft.isPro) {
      syncProfessionalVerifiedFromProfile(id, adminDraft.verified);
    }
    setAdminEditing(false);
  }, [adminDraft, id, updateProfile]);

  return (
    <div className="other-profile-page">
      <div className="op-hero">
        <img
          src={'imageUrl' in profile ? profile.imageUrl : profile.avatarUrl}
          alt={displayName}
          className="op-hero-image"
        />
        <div className="op-hero-gradient" />

        <header className="op-header">
          <button type="button" className="op-back-btn" onClick={closeDetail} aria-label="Retour">
            <ChevronLeft size={28} color="currentColor" />
          </button>
          <button
            type="button"
            className="op-report-btn"
            onClick={() => setReportOpen(true)}
            aria-label="Signaler ce profil"
          >
            <AlertTriangle size={24} color="#FFCC00" />
          </button>
        </header>

        <div className="op-hero-content">
          <h1 className="op-title">
            {displayName}, {(p.age as number | null | undefined) ?? '—'}
          </h1>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            {(profile as { verified?: boolean }).verified && (
              <div className="op-verified-row">
                <ShieldCheck size={18} color="#34C759" />
                <span>Profil vérifié</span>
              </div>
            )}
            {(profile as { isPro?: boolean }).isPro && (
              <div className="op-pro-row">
                <Award size={18} color="#FFB300" />
                <span>Professionnel</span>
              </div>
            )}
            <ProfileKarmaBadge karma={profileKarma} className="op-karma-badge" />
          </div>
        </div>
      </div>

      <div className="op-content">
        <div className="op-bio-card">
          {isAdmin && adminEditing ? (
            <div className="op-admin-edit">
              <input
                value={adminDraft.name}
                onChange={(e) =>
                  setAdminDraft((d) => ({ ...d, name: e.target.value }))
                }
                placeholder={t('name')}
                className="hero-input"
              />
              <div className="hero-edit-row">
                <input
                  value={adminDraft.age}
                  onChange={(e) =>
                    setAdminDraft((d) => ({ ...d, age: e.target.value }))
                  }
                  placeholder={t('age')}
                  className="hero-input hero-input--age"
                />
                <input
                  value={adminDraft.city}
                  onChange={(e) =>
                    setAdminDraft((d) => ({ ...d, city: e.target.value }))
                  }
                  placeholder={t('cityPlaceholder')}
                  className="hero-input hero-input--city"
                />
              </div>
              <textarea
                value={adminDraft.bio}
                onChange={(e) =>
                  setAdminDraft((d) => ({ ...d, bio: e.target.value }))
                }
                placeholder={t('bio')}
                className="bio-textarea"
              />
              <input
                value={adminDraft.memberSince}
                onChange={(e) =>
                  setAdminDraft((d) => ({ ...d, memberSince: e.target.value }))
                }
                placeholder={t('memberSince')}
                className="hero-input"
              />
              <input
                value={adminDraft.karma}
                onChange={(e) =>
                  setAdminDraft((d) => ({ ...d, karma: e.target.value }))
                }
                placeholder={t('karmaShort')}
                className="hero-input"
                inputMode="numeric"
              />
              <div className="hero-edit-row">
                <input
                  value={adminDraft.statsEvents}
                  onChange={(e) =>
                    setAdminDraft((d) => ({ ...d, statsEvents: e.target.value }))
                  }
                  placeholder={t('events')}
                  className="hero-input hero-input--age"
                  inputMode="numeric"
                />
                <input
                  value={adminDraft.statsFriends}
                  onChange={(e) =>
                    setAdminDraft((d) => ({ ...d, statsFriends: e.target.value }))
                  }
                  placeholder={t('friends')}
                  className="hero-input hero-input--city"
                  inputMode="numeric"
                />
              </div>
              <label className="op-admin-check">
                <input
                  type="checkbox"
                  checked={adminDraft.verified}
                  onChange={(e) =>
                    setAdminDraft((d) => ({ ...d, verified: e.target.checked }))
                  }
                />
                <span>{t('verified')}</span>
              </label>
              <label className="op-admin-check">
                <input
                  type="checkbox"
                  checked={adminDraft.isPro}
                  onChange={(e) =>
                    setAdminDraft((d) => ({ ...d, isPro: e.target.checked }))
                  }
                />
                <span>{t('professional')}</span>
              </label>
              {adminDraft.isPro ? (
                <>
                  <input
                    value={adminDraft.proAddress}
                    onChange={(e) =>
                      setAdminDraft((d) => ({ ...d, proAddress: e.target.value }))
                    }
                    placeholder={t('proAddressPlaceholder')}
                    className="hero-input"
                  />
                  <input
                    value={adminDraft.websiteUrl}
                    onChange={(e) =>
                      setAdminDraft((d) => ({ ...d, websiteUrl: e.target.value }))
                    }
                    placeholder={t('proWebsitePlaceholder')}
                    className="hero-input"
                  />
                  <input
                    value={adminDraft.socialUrl}
                    onChange={(e) =>
                      setAdminDraft((d) => ({ ...d, socialUrl: e.target.value }))
                    }
                    placeholder={t('proSocialPlaceholder')}
                    className="hero-input"
                  />
                  <input
                    value={adminDraft.phone}
                    onChange={(e) =>
                      setAdminDraft((d) => ({ ...d, phone: e.target.value }))
                    }
                    placeholder={t('proPhonePlaceholder')}
                    className="hero-input"
                  />
                </>
              ) : null}
              <div className="edit-save-cancel">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setAdminEditing(false)}
                >
                  {t('cancel')}
                </button>
                <button type="button" className="save-btn" onClick={handleAdminSave}>
                  {t('save')}
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="op-bio-text">
                {(profile as { bio?: string }).bio ||
                  friendRecord?.bio ||
                  'Pas de bio pour le moment.'}
              </p>
              <div className="op-divider" />
              {friendRecord?.isPro ? (
                <ProProfileDetails
                  city={friendRecord.city}
                  address={friendRecord.proAddress}
                  websiteUrl={friendRecord.websiteUrl}
                  socialUrl={friendRecord.socialUrl}
                  phone={friendRecord.phone}
                  className="pro-contact-links--profile"
                />
              ) : (profile as { city?: string }).city || friendRecord?.city ? (
                <div className="op-info-row">
                  <MapPin size={18} color="#8E8E93" />
                  <span>{friendRecord?.city || (profile as { city?: string }).city}</span>
                </div>
              ) : null}
              <div className="op-info-row">
                <Calendar size={18} color="#8E8E93" />
                <span>
                  Membre depuis{' '}
                  {(profile as { memberSince?: string }).memberSince ||
                    friendRecord?.memberSince ||
                    '2024'}
                </span>
              </div>
              {isAdmin ? (
                <div className="op-admin-actions">
                  <button type="button" className="edit-btn" onClick={startAdminEdit}>
                    <Pencil size={16} color="#FBBF24" />
                    <span>{t('adminEditProfile')}</span>
                  </button>
                  <button
                    type="button"
                    className="op-admin-delete-btn"
                    onClick={handleAdminDeleteProfile}
                  >
                    <Trash2 size={16} color="#FF453A" />
                    <span>{t('adminDeleteProfile')}</span>
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className="op-stats-row">
          <div className="op-stat-cell">
            <span className="op-stat-value op-stat-value--karma">{profileKarma}</span>
            <span className="op-stat-label op-stat-label--with-icon">
              <Sparkles size={12} color="#A78BFA" aria-hidden />
              {t("karmaShort")}
            </span>
          </div>
          <div className="op-stat-cell">
            <span className="op-stat-value">{(profile as { stats?: { events?: number } }).stats?.events ?? '0'}</span>
            <span className="op-stat-label">Événements</span>
          </div>
          <div className="op-stat-cell">
            <span className="op-stat-value">{(profile as { stats?: { friends?: number } }).stats?.friends ?? '0'}</span>
            <span className="op-stat-label">Amis</span>
          </div>
        </div>

        <h2 className="op-section-title">Badges</h2>
        <ProfileBadgesSection
          badges={profileBadges}
          suggestions={[]}
          editable={false}
          className="op-badges-wrap"
          chipClassName="op-badge-pill"
        />

        {isMutualFriend ? (
          <button
            type="button"
            className="pro-profile-contact-btn"
            onClick={handleContact}
          >
            <MessageCircle size={20} aria-hidden />
            {t('proContactButton')}
          </button>
        ) : null}

        {showInsightTabs ? (
          <>
            <HScrollRail
              id="op-profile-tabs-anchor"
              className="profile-tabs-rail op-profile-tabs"
              scrollClassName="profile-tabs"
              fadeTone="ink"
            >
              <button
                type="button"
                className={`p-tab ${activeOpTab === 'favorites' ? 'p-tab--active' : ''}`}
                onClick={() => selectOpTab('favorites')}
              >
                <div className="p-tab-inner">
                  <Heart size={18} color={activeOpTab === 'favorites' ? '#FF4B81' : '#8E8E93'} />
                  <span>Favoris & créées</span>
                  <span className="p-tab-badge" style={{ background: '#FF4B81' }}>
                    {formatBadgeCount(theirFavoritesAndHosted.length)}
                  </span>
                </div>
              </button>
              <button
                type="button"
                className={`p-tab ${activeOpTab === 'friends' ? 'p-tab--active' : ''}`}
                onClick={() => selectOpTab('friends')}
              >
                <div className="p-tab-inner">
                  <Users size={18} color={activeOpTab === 'friends' ? '#8B5CF6' : '#8E8E93'} />
                  <span>Amis</span>
                  <span className="p-tab-badge" style={{ background: '#8B5CF6' }}>
                    {formatBadgeCount(friendsBadgeCount)}
                  </span>
                </div>
              </button>
              <button
                type="button"
                className={`p-tab ${activeOpTab === 'history' ? 'p-tab--active' : ''}`}
                onClick={() => selectOpTab('history')}
              >
                <div className="p-tab-inner">
                  <Clock size={18} color={activeOpTab === 'history' ? '#6B7280' : '#8E8E93'} />
                  <span>Passés</span>
                  <span className="p-tab-badge" style={{ background: '#6B7280' }}>
                    {formatBadgeCount(theirHistory.length)}
                  </span>
                </div>
              </button>
            </HScrollRail>

            <div className="tab-container op-tab-container">
              {activeOpTab === 'favorites' && (
                <div className="favorites-list">
                  {theirFavoritesAndHosted.map((e) => (
                    <div
                      key={e.id}
                      role="button"
                      tabIndex={0}
                      className="p-event-row"
                      aria-label={`Ouvrir la sortie ${e.title}`}
                      onMouseDown={(ev) => ev.preventDefault()}
                      onClick={() => openDetail('event', e.id)}
                      onKeyDown={(ev) => {
                        if (ev.key === 'Enter' || ev.key === ' ') {
                          ev.preventDefault();
                          openDetail('event', e.id);
                        }
                      }}
                    >
                      <img src={e.imageUri} alt={e.title} className="p-event-img" />
                      <div className="p-event-info">
                        <div className="p-event-title">{e.title}</div>
                        <div className="p-event-meta">
                          {e.dateLabel} · {e.timeShort}
                          {e.status === 'organisateur' ? (
                            <span className="p-event-meta-tag"> · Organisateur</span>
                          ) : null}
                        </div>
                      </div>
                      <Heart
                        size={20}
                        fill={e.isFavorite ? '#FF4B81' : 'transparent'}
                        color="#FF4B81"
                        onClick={(clickEv) => {
                          clickEv.stopPropagation();
                          toggleEventFavorite(e.id);
                        }}
                        style={{ cursor: 'pointer' }}
                      />
                    </div>
                  ))}
                  {theirFavoritesAndHosted.length === 0 ? (
                    <div className="empty-hint">
                      Aucune sortie à venir (favori ou organisateur) liée à ce profil. Les dates passées sont
                      dans « Passés ».
                    </div>
                  ) : null}
                </div>
              )}

              {activeOpTab === 'friends' && (
                <div className="friends-list">
                  {otherFriendsPreview.map((f) => (
                    <div key={f.profilId} className="friend-card">
                      <img src={f.imageUrl} alt={f.name} className="friend-av" />
                      <div className="friend-info">
                        <div className="friend-name">{f.name}</div>
                        <div className="friend-sub">
                          {f.age} ans · {f.city} · {f.eventsInCommon} communs
                        </div>
                      </div>
                      <button
                        type="button"
                        className="view-btn"
                        onClick={() => openDetail('profile', f.profilId)}
                        aria-label={`Voir le profil de ${f.name}`}
                      >
                        Voir
                      </button>
                    </div>
                  ))}
                  {otherFriendsPreview.length === 0 ? (
                    <div className="empty-hint">Aucun aperçu réseau pour ce profil.</div>
                  ) : null}
                </div>
              )}

              {activeOpTab === 'history' && (
                <div className="history-list">
                  {theirHistory.map((e) => (
                    <div
                      key={e.id}
                      role="button"
                      tabIndex={0}
                      className="p-event-row"
                      aria-label={`Ouvrir la sortie ${e.title}`}
                      onMouseDown={(ev) => ev.preventDefault()}
                      onClick={() => openDetail('event', e.id)}
                      onKeyDown={(ev) => {
                        if (ev.key === 'Enter' || ev.key === ' ') {
                          ev.preventDefault();
                          openDetail('event', e.id);
                        }
                      }}
                    >
                      <img src={e.imageUri} alt={e.title} className="p-event-img" />
                      <div className="p-event-info">
                        <div className="p-event-title">{e.title}</div>
                        <div className="p-event-meta">
                          {e.dateLabel} · {e.timeShort}
                        </div>
                      </div>
                    </div>
                  ))}
                  {theirHistory.length === 0 ? (
                    <div className="empty-hint">Aucune sortie passée liée à ce profil.</div>
                  ) : null}
                </div>
              )}

            </div>
          </>
        ) : null}

        <div className="op-actions">
          {isMutualFriend ? (
            <button
              type="button"
              className="op-btn-remove"
              onClick={() => {
                if (window.confirm('Retirer cette personne de vos amis ?')) {
                  removeMutualFriend(id);
                }
              }}
            >
              <UserMinus size={20} />
              <span>Retirer des amis</span>
            </button>
          ) : requestRejected ? (
            <button type="button" className="op-btn-friend-state op-btn-friend-state--rejected" disabled>
              <HeartCrack size={20} color="#FF9F0A" />
              <span>Demande d’ami refusée</span>
            </button>
          ) : requestSent ? (
            <button type="button" className="op-btn-friend-state op-btn-friend-state--sent" disabled>
              <UserPlus size={20} color="#8E8E93" />
              <span>Demande envoyée</span>
            </button>
          ) : dailyFriendRequestLimitReached ? (
            <button
              type="button"
              className="op-btn-friend-state op-btn-friend-state--daily-limit"
              disabled
            >
              <UserPlus size={20} color="#8E8E93" />
              <span>{t('friendRequestDailyLimit')}</span>
            </button>
          ) : (
            <button type="button" className="op-btn-friend-request" onClick={() => sendFriendRequest(id)}>
              <UserPlus size={20} />
              <span>Demande d’ami</span>
            </button>
          )}
        </div>
      </div>

      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Signaler ce profil"
        kind="profile"
        subjectId={id}
        subjectLabel={displayName}
      />
    </div>
  );
}
