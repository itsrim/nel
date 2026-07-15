import { Heart, Check, Clock, MapPin } from 'lucide-react';
import type { Event } from '../data/mockData';
import { useTranslation } from '../i18n/useTranslation';
import { useAuthStore } from '../store/useAuthStore';
import { useMessagingStore } from '../store/useMessagingStore';
import { effectiveViewerEventStatus, resolveEventHostIsPro } from '../lib/eventHost';
import { resolveEventParticipantAvatars } from '../lib/eventParticipantAvatars';
import {
  getEventThemeBadgeColors,
  resolveEventCoverTheme,
} from '../constants/defaultEventCoverThemes';
import { hasViewerProAccess } from '../lib/viewerEntitlements';
import './EventCard.css';

interface EventCardProps {
  item: Event;
  onToggleFavorite: () => void;
  onClick?: () => void;
  width?: number;
}

export function EventCard({ item, onToggleFavorite, onClick, width }: EventCardProps) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { conversations, friends, viewerProfileAvatarUrl } = useMessagingStore();
  const viewerProAccess = useMessagingStore(hasViewerProAccess);
  const viewerContext = user
    ? { id: user.id, displayName: user.displayName }
    : null;
  const hostIsPro = resolveEventHostIsPro(item, friends, viewerProAccess, viewerContext);
  const viewerStatus = effectiveViewerEventStatus(item, viewerContext, {
    conversationMembers: conversations.find((c) => c.id === item.conversationId)
      ?.members,
  });
  const coverTheme = resolveEventCoverTheme(item);
  const themeBadgeColors = coverTheme
    ? getEventThemeBadgeColors(coverTheme.tag)
    : null;
  const participantAvatars = resolveEventParticipantAvatars(
    item,
    conversations,
    friends,
    viewerProfileAvatarUrl,
    3,
    viewerContext,
  );
  const CARD_IMAGE_ASPECT = 2.05;
  const imgH = width ? Math.round(width / CARD_IMAGE_ASPECT) : 90;

  return (
    <div className="ecard" style={width ? { width } : undefined} onClick={onClick}>
      <div className="ecard-img-wrap" style={{ height: imgH }}>
        <img
          src={item.imageUri}
          alt={item.title}
          className="ecard-img"
          loading="lazy"
        />
        <span className="ecard-price ecard-price--corner">
          {item.priceLabel?.trim() || item.price?.trim() || 'Gratuit'}
        </span>
        {viewerStatus === 'inscrit' ? (
          <span className="ecard-status-badge ecard-status-badge--registered ecard-status-badge--on-img">
            <Check size={10} aria-hidden />
            {t('registered')}
          </span>
        ) : null}
        <div
          className={`ecard-img-top${viewerStatus === 'inscrit' ? ' ecard-img-top--with-status-badge' : ''}`}
        >
          <div className="ecard-tags-left">
            {item.isBeta && (
              <span className="ecard-tag ecard-tag--beta">{t('beta')}</span>
            )}
            {hostIsPro && (
              <span className="ecard-tag ecard-tag--pro">{t('pro')}</span>
            )}
            {viewerStatus === 'organisateur' && (
              <span className="ecard-tag ecard-tag--pink">{t('organizer')}</span>
            )}
            {viewerStatus === 'en_attente' && (
              <span className="ecard-tag ecard-tag--pending">{t('pending')}</span>
            )}
          </div>
        </div>
        {/* Bottom overlay: avatars + count */}
        <div className="ecard-img-bottom">
          <div className="ecard-avatars">
            {participantAvatars.map((src, i) => (
              <img
                key={`${src}-${i}`}
                src={src}
                alt=""
                className="ecard-mini-av"
                style={i > 0 ? { marginLeft: -6 } : undefined}
              />
            ))}
          </div>
          <span className="ecard-count">{item.participantCount}/{item.participantMax}</span>
        </div>
      </div>
      {/* Card body */}
      <div className="ecard-body">
        <div className="ecard-title-row">
          <span className="ecard-title">{item.title}</span>
          <button
            className="ecard-fav-btn"
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            aria-label={item.isFavorite ? t('removeFavorite') : t('addFavorite')}
          >
            <Heart
              size={16}
              fill={item.isFavorite ? '#FF4081' : 'none'}
              color={item.isFavorite ? '#FF4081' : '#8E8E93'}
            />
          </button>
        </div>
        <div className="ecard-body-footer">
          <div className="ecard-meta">
            <Clock size={11} color="#8E8E93" />
            <span>{item.timeShort}</span>
            <span className="ecard-meta-sep" />
            <MapPin size={11} color="#8E8E93" />
            <span className="ecard-meta-loc">{item.location}</span>
          </div>
          {coverTheme && themeBadgeColors ? (
            <span
              className="ecard-theme-tag ecard-theme-tag--footer"
              style={{
                backgroundColor: themeBadgeColors.bg,
                color: themeBadgeColors.fg,
              }}
            >
              #{coverTheme.tag}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
