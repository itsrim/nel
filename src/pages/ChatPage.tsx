import { useState, useMemo, useCallback } from 'react';
import { Crown, Eye, Heart, Plus, Search } from 'lucide-react';
import { useNavigationStore } from '../store/useNavigationStore';
import { useMessagingStore } from '../store/useMessagingStore';
import {
  formatRelativeTime,
  formatVisitTimeAgo,
  formatBadgeCount,
  formatSuggestionCaption,
  type Conversation,
  type SuggestionProfile,
} from '../data/mockData';
import { buildConversationMiniSlots } from '../lib/conversationMiniSlots';
import './ChatPage.css';

/* ── Helpers ── */

function truncateStoryLabel(title: string, max = 11): string {
  if (title.length <= max) return title;
  return `${title.slice(0, max - 1)}…`;
}

function groupStoryVariant(id: string): 0 | 1 | 2 {
  let s = 0;
  for (let i = 0; i < id.length; i++) s = (s + id.charCodeAt(i)) % 3;
  return s as 0 | 1 | 2;
}

function buildMasonryColumns(items: SuggestionProfile[], columnCount: number): SuggestionProfile[][] {
  const cols: SuggestionProfile[][] = Array.from({ length: columnCount }, () => []);
  const heights = Array(columnCount).fill(0);
  for (const item of items) {
    const w = 1 / item.aspectRatio;
    let minI = 0;
    for (let c = 1; c < columnCount; c++) {
      if (heights[c] < heights[minI]) minI = c;
    }
    cols[minI].push(item);
    heights[minI] += w;
  }
  return cols;
}

/* ── Sub-components ── */

type SubTab = 'suggestions' | 'messages' | 'visites';

function FavoriteStripAvatar({ conversation }: { conversation: Conversation }) {
  const v = groupStoryVariant(conversation.id);
  const { getEventByConversationId, friends, viewerProfileAvatarUrl } = useMessagingStore();
  const linked = getEventByConversationId(conversation.id);
  const memberN = conversation.members?.length ?? 0;
  /** Comme la liste : ≤ 2 membres → deux demi-ronds côte à côte (pas une grille 2×2 qui déborde). */
  const useDualStrip = v === 1 && memberN <= 2;
  const count = v === 0 ? 2 : v === 1 ? (useDualStrip ? 2 : 4) : 3;
  const slots = buildConversationMiniSlots(
    conversation,
    linked,
    friends,
    viewerProfileAvatarUrl,
    count,
  );
  const gradient = conversation.avatarGradient;

  const slotDiv = (i: number, className: string, fallbackBg: string) => {
    const s = slots[i];
    if (s?.hasImage && s.src) {
      return <img key={i} className={`${className} chat-slot-img`} src={s.src} alt="" />;
    }
    return <div key={i} className={className} style={{ background: fallbackBg }} />;
  };

  return (
    <div
      className="story-avatar"
      style={{ background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` }}
    >
      {v === 0 && (
        <div className="story-split2">
          {slotDiv(0, 'story-split-half', 'rgba(0,0,0,0.28)')}
          {slotDiv(1, 'story-split-half', 'rgba(255,255,255,0.22)')}
        </div>
      )}
      {v === 1 && useDualStrip && (
        <div className="story-split2">
          {slotDiv(0, 'story-split-half', 'rgba(0,0,0,0.28)')}
          {slotDiv(1, 'story-split-half', 'rgba(255,255,255,0.22)')}
        </div>
      )}
      {v === 1 && !useDualStrip && (
        <div className="story-grid4">
          {[0, 1, 2, 3].map((i) =>
            slotDiv(i, 'story-quad', `rgba(255,255,255,${0.22 + i * 0.08})`),
          )}
        </div>
      )}
      {v === 2 && (
        <div className="story-triple">
          <div className="story-triple-top">
            {slotDiv(0, 'story-triple-mini', 'rgba(255,255,255,0.28)')}
            {slotDiv(1, 'story-triple-mini', 'rgba(0,0,0,0.2)')}
          </div>
          {slotDiv(2, 'story-triple-bottom', 'rgba(255,255,255,0.18)')}
        </div>
      )}
    </div>
  );
}

function FavoriteStripItem({ conversation }: { conversation: Conversation }) {
  const { openDetail } = useNavigationStore();
  const label = truncateStoryLabel(conversation.title);
  return (
    <button className="story-cell" aria-label={conversation.title} onClick={() => openDetail('chat', conversation.id)}>
      <div className="story-ring">
        <FavoriteStripAvatar conversation={conversation} />
        {conversation.unreadCount > 0 && (
          <span className="story-badge">{formatBadgeCount(conversation.unreadCount)}</span>
        )}
      </div>
      <span className="story-label">{label}</span>
    </button>
  );
}

function NewGroupStripItem() {
  return (
    <button className="story-cell" aria-label="Nouveau groupe">
      <div className="story-new-ring">
        <Plus size={34} color="rgba(255,255,255,0.92)" />
      </div>
      <span className="story-label-new">+ Groupe</span>
    </button>
  );
}

function ListAvatar({ item }: { item: Conversation }) {
  const { getEventByConversationId, friends, viewerProfileAvatarUrl } = useMessagingStore();
  const linked = getEventByConversationId(item.id);
  const isGroup = item.type === 'group';
  const slots = buildConversationMiniSlots(item, linked, friends, viewerProfileAvatarUrl, isGroup ? 2 : 1);

  return (
    <div className="list-avatar-wrap">
      <div
        className="list-avatar"
        style={{ background: `linear-gradient(135deg, ${item.avatarGradient[0]}, ${item.avatarGradient[1]})` }}
      >
        {isGroup ? (
          <div className="group-split">
            {[0, 1].map((i) => {
              const s = slots[i];
              return (
                <div key={i} className="group-half">
                  {s?.hasImage && s.src ? (
                    <img className="chat-slot-img" src={s.src} alt="" />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        background: i === 0 ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.25)',
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ) : slots[0]?.hasImage && slots[0].src ? (
          <img className="list-avatar-dm-img" src={slots[0].src} alt="" />
        ) : (
          <span className="list-avatar-letter">{item.title.slice(0, 1)}</span>
        )}
      </div>
      {item.unreadCount > 0 && (
        <span className="list-badge">{formatBadgeCount(item.unreadCount)}</span>
      )}
    </div>
  );
}

function ConversationRow({ item }: { item: Conversation }) {
  const { openDetail } = useNavigationStore();
  const isGroup = item.type === 'group';
  return (
    <button className="conv-row" aria-label={item.title} onClick={() => openDetail('chat', item.id)}>
      <div className="conv-row-inner">
        <div className="avatar-column">
          <ListAvatar item={item} />
        </div>
        <div className="row-body">
          <div className="row-top">
            <div className="name-row">
              <span className="conv-name">{item.title}</span>
              {isGroup && <span className="groupe-tag">Groupe</span>}
            </div>
            <span className="conv-time">{formatRelativeTime(item.updatedAt)}</span>
          </div>
          <p className="conv-preview">{item.lastMessagePreview}</p>
        </div>
      </div>
    </button>
  );
}

function SubTabPill({
  label, active, onPress, badge, badgeVariant, icon: Icon, activeUnderline,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  badge?: number;
  badgeVariant?: 'red' | 'gold';
  icon?: React.ComponentType<{ size?: number; color?: string }>;
  activeUnderline?: 'light' | 'gold';
}) {
  const underlineClass =
    active && activeUnderline === 'gold' ? 'sub-tab--underline-gold' :
    active && activeUnderline === 'light' ? 'sub-tab--underline-light' : '';

  return (
    <button className={`sub-tab ${underlineClass}`} onClick={onPress}>
      {Icon && <Icon size={16} color={active ? '#fff' : '#8E8E93'} />}
      <span className={`sub-tab-text ${active ? 'sub-tab-text--active' : ''}`}>{label}</span>
      {badge != null && badge > 0 && (
        <span className={`sub-tab-badge ${badgeVariant === 'gold' ? 'sub-tab-badge--gold' : 'sub-tab-badge--red'}`}>
          {formatBadgeCount(badge)}
        </span>
      )}
    </button>
  );
}

/* ── Main ── */

export function ChatPage() {
  const { openDetail } = useNavigationStore();
  const { conversations, profileVisits, suggestions, favoriteConversationIds } = useMessagingStore();
  const [sub, setSub] = useState<SubTab>('messages');
  const [visitLikedById, setVisitLikedById] = useState<Record<string, boolean>>({});
  const [suggestionLikedById, setSuggestionLikedById] = useState<Record<string, boolean>>({});

  const toggleVisitLike = useCallback((id: string) => {
    setVisitLikedById((p) => ({ ...p, [id]: !p[id] }));
  }, []);

  const toggleSuggestionLike = useCallback((id: string) => {
    setSuggestionLikedById((p) => ({ ...p, [id]: !p[id] }));
  }, []);

  const sorted = useMemo(
    () => [...conversations].sort((a, b) => b.updatedAt - a.updatedAt),
    [conversations],
  );

  const favoriteConversationsStrip = useMemo(() => {
    const byId = new Map(conversations.map((c) => [c.id, c]));
    return favoriteConversationIds.map((id) => byId.get(id)).filter((c): c is Conversation => c !== undefined);
  }, [conversations, favoriteConversationIds]);

  const messagesTabBadge = useMemo(
    () => conversations.reduce((s, c) => s + c.unreadCount, 0),
    [conversations],
  );

  const visitesTabBadge = useMemo(
    () => profileVisits.filter((v) => v.friendRequest).length + profileVisits.length,
    [profileVisits],
  );

  const suggestionColumns = useMemo(
    () => buildMasonryColumns(suggestions, 2),
    [suggestions],
  );

  const sortedVisits = useMemo(
    () => [...profileVisits].sort((a, b) => {
      const ra = a.friendRequest ? 1 : 0;
      const rb = b.friendRequest ? 1 : 0;
      if (rb !== ra) return rb - ra;
      return b.lastVisitAt - a.lastVisitAt;
    }),
    [profileVisits],
  );

  return (
    <div className="chat-page">
      {/* Header gradient with favorite conversations */}
      <div className="chat-header-gradient">
        <div className="favorites-section">
          <p className="favorites-title">Conversations favoris</p>
          <div className="stories-wrap">
            <div className="stories-scroll">
              {favoriteConversationsStrip.map((c) => (
                <FavoriteStripItem key={c.id} conversation={c} />
              ))}
              <NewGroupStripItem />
            </div>
            <div className="stories-right-fade" />
          </div>
        </div>
      </div>

      {/* Sub-tab bar */}
      <div className="sub-tab-bar">
        <div className="sub-tab-scroll">
          <SubTabPill label="Messages" active={sub === 'messages'} onPress={() => setSub('messages')} badge={messagesTabBadge} badgeVariant="red" activeUnderline="light" />
          <SubTabPill label="Suggestions" active={sub === 'suggestions'} onPress={() => setSub('suggestions')} activeUnderline="light" />
          <SubTabPill label="Visites" active={sub === 'visites'} onPress={() => setSub('visites')} badge={visitesTabBadge} badgeVariant="gold" icon={Eye} activeUnderline="gold" />
        </div>
        <button className="search-btn-small" aria-label="Rechercher">
          <Search size={22} color="#8E8E93" />
        </button>
      </div>

      {/* Content */}
      <div className="chat-content">
        {sub === 'messages' && (
          <div className="conv-list">
            {sorted.map((item) => (
              <ConversationRow key={item.id} item={item} />
            ))}
          </div>
        )}

        {sub === 'visites' && (
          <div className="visits-list">
            {/* Premium banner */}
            <div className="premium-banner">
              <div className="premium-banner-icon">
                <Crown size={28} color="#fff" />
              </div>
              <div className="premium-banner-texts">
                <span className="premium-banner-title">Fonctionnalité Premium</span>
                <span className="premium-banner-sub">{profileVisits.length} personnes ont visité votre profil.</span>
              </div>
            </div>
            {sortedVisits.map((v) => (
              <div key={v.id} className="visit-card" onClick={() => openDetail('profile', v.id)}>
                <div className="visit-avatar-wrap">
                  <img src={v.avatarUrl} alt={v.name} className="visit-avatar" />
                  {v.friendRequest && (
                    <span className="visit-friend-badge">Demande d'ami</span>
                  )}
                  {v.visitMultiplier && v.visitMultiplier > 1 && (
                    <span className="visit-mult-badge">×{v.visitMultiplier}</span>
                  )}
                </div>
                <div className="visit-card-body">
                  <span className="visit-name-age">{v.name}, {v.age}</span>
                  <div className="visit-meta-row">
                    <Eye size={14} color="#8E8E93" />
                    <span className="visit-time">{formatVisitTimeAgo(v.lastVisitAt)}</span>
                  </div>
                </div>
                <button
                  className={`visit-like-btn ${visitLikedById[v.id] ? 'visit-like-btn--active' : ''}`}
                  onClick={() => toggleVisitLike(v.id)}
                >
                  <Heart size={18} color="#fff" fill={visitLikedById[v.id] ? '#fff' : 'none'} />
                  <span>Like</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {sub === 'suggestions' && (
          <div className="suggestions-masonry">
            {suggestionColumns.map((col, ci) => (
              <div key={ci} className="suggestion-col">
                {col.map((item) => {
                  const liked = !!suggestionLikedById[item.id];
                  return (
                    <div key={item.id} className="suggestion-card">
                      <div className="suggestion-img-press" onClick={() => openDetail('profile', item.id)}>
                        <img
                          src={item.imageUrl}
                          alt={item.pseudo}
                          className="suggestion-img"
                          style={{ aspectRatio: item.aspectRatio }}
                          loading="lazy"
                        />
                        <div className="suggestion-img-fade" />
                        <span className="suggestion-caption">
                          {formatSuggestionCaption(item.pseudo, item.age)}
                        </span>
                      </div>
                      <button
                        className="suggestion-heart-btn"
                        onClick={() => toggleSuggestionLike(item.id)}
                        aria-label={liked ? 'Retirer le like' : 'Aimer'}
                      >
                        <Heart size={22} color={liked ? '#FF4081' : '#fff'} fill={liked ? '#FF4081' : 'none'} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
