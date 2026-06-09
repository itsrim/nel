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
} from 'lucide-react';
import { useState, useMemo, useCallback } from 'react';
import { useNavigationStore } from '../store/useNavigationStore';
import { useMessagingStore } from '../store/useMessagingStore';
import { ReportModal } from '../components/ReportModal';
import { ProProfileDetails } from '../components/ProProfileDetails';
import { ProfileKarmaBadge } from '../components/ProfileKarmaBadge';
import { KARMA_DEFAULT } from '../lib/karma';
import { hasViewerPremiumAccess } from '../lib/viewerEntitlements';
import { ProfileBadgesSection } from '../components/ProfileBadgesSection';
import { useTranslation } from '../i18n/useTranslation';
import { isEventDateBeforeToday } from '../lib/eventDateKey';
import { formatBadgeCount } from '../data/mockData';
import type { Event } from '../data/mockData';
import './ProfilePage.css';
import './OtherProfilePage.css';
import '../components/ProContactLinks.css';

interface OtherProfilePageProps {
  id: string;
}

type OtherProfileTab = 'favorites' | 'friends' | 'history';

export function OtherProfilePage({ id }: OtherProfilePageProps) {
  const { t } = useTranslation();
  const { closeDetail, openDetail } = useNavigationStore();
  const {
    suggestions,
    profileVisits,
    friends,
    sendFriendRequest,
    removeMutualFriend,
    friendRequestSentProfilIds,
    friendRequestRejectedProfilIds,
    nelDemoIsAdmin,
    events,
    conversations,
    toggleEventFavorite,
    updateProfileBadges,
  } = useMessagingStore();

  const [reportOpen, setReportOpen] = useState(false);
  const [activeOpTab, setActiveOpTab] = useState<OtherProfileTab>('favorites');

  const showInsightTabs = useMessagingStore(hasViewerPremiumAccess);

  // Find profile in suggestions, visites de profil ou amis
  const profile =
    friends.find((f) => f.profilId === id) ||
    suggestions.find((s) => s.id === id) ||
    profileVisits.find((v) => v.id === id);

  if (!profile) return null;

  const friendRecord = friends.find((f) => f.profilId === id);
  const profileBadges = friendRecord?.badges?.length
    ? friendRecord.badges
    : ((profile as { badges?: string[] }).badges ?? ['Pionnier']);
  const isMutualFriend = friendRecord?.mutualFriend === true;
  const requestSent = friendRequestSentProfilIds.includes(id);
  const requestRejected = friendRequestRejectedProfilIds.includes(id);

  const p = profile as unknown as Record<string, unknown>;
  const displayName = (p.pseudo as string | undefined) || (p.name as string);
  const messageConversationId = friendRecord?.mainChatConversationId;
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
            <ChevronLeft size={28} color="#fff" />
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
          <p className="op-bio-text">{(profile as { bio?: string }).bio || 'Pas de bio pour le moment.'}</p>
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
          ) : (profile as { city?: string }).city ? (
            <div className="op-info-row">
              <MapPin size={18} color="#8E8E93" />
              <span>{(profile as { city?: string }).city}</span>
            </div>
          ) : null}
          <div className="op-info-row">
            <Calendar size={18} color="#8E8E93" />
            <span>Membre depuis {(profile as { memberSince?: string }).memberSince || '2024'}</span>
          </div>
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
          editable={nelDemoIsAdmin}
          onChange={(next) => updateProfileBadges(id, next)}
          className="op-badges-wrap"
          chipClassName="op-badge-pill"
        />

        {showInsightTabs ? (
          <>
            <div id="op-profile-tabs-anchor" className="profile-tabs op-profile-tabs">
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
            </div>

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
            <>
              {messageConversationId ? (
                <button
                  type="button"
                  className="op-btn-message"
                  onClick={() => openDetail('chat', messageConversationId)}
                >
                  <MessageCircle size={20} />
                  <span>Message</span>
                </button>
              ) : null}
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
            </>
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
