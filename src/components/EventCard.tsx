import { Heart, Check, Plus, Clock, MapPin } from 'lucide-react';
import type { Event } from '../data/mockData';
import { useTranslation } from '../i18n/useTranslation';
import './EventCard.css';

interface EventCardProps {
  item: Event;
  onToggleFavorite: () => void;
  onClick?: () => void;
  width?: number;
}

export function EventCard({ item, onToggleFavorite, onClick, width }: EventCardProps) {
  const { t } = useTranslation();
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
        {/* Top overlay: status + price */}
        <div className="ecard-img-top">
          <div className="ecard-tags-left">
            {item.isBeta && (
              <span className="ecard-tag ecard-tag--beta">{t('beta')}</span>
            )}
            {item.status === 'inscrit' && (
              <span className="ecard-tag ecard-tag--blue">
                <Check size={10} /> {t('registered')}
              </span>
            )}
            {item.status === 'inscrire' && (
              <span className="ecard-tag ecard-tag--join">
                <Plus size={10} /> {t('register')}
              </span>
            )}
            {item.status === 'organisateur' && (
              <span className="ecard-tag ecard-tag--pink">{t('organizer')}</span>
            )}
            {item.status === 'en_attente' && (
              <span className="ecard-tag ecard-tag--pending">{t('pending')}</span>
            )}
          </div>
          <span className="ecard-price">{item.priceLabel}</span>
        </div>
        {/* Bottom overlay: avatars + count */}
        <div className="ecard-img-bottom">
          <div className="ecard-avatars">
            <div className="ecard-mini-av" style={{ backgroundColor: '#5AC8FA' }} />
            <div className="ecard-mini-av" style={{ backgroundColor: '#FF2D55', marginLeft: -6 }} />
            <div className="ecard-mini-av" style={{ backgroundColor: '#FF9500', marginLeft: -6 }} />
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
        <div className="ecard-meta">
          <Clock size={11} color="#8E8E93" />
          <span>{item.timeShort}</span>
          <span className="ecard-meta-sep" />
          <MapPin size={11} color="#8E8E93" />
          <span className="ecard-meta-loc">{item.location}</span>
        </div>
      </div>
    </div>
  );
}
