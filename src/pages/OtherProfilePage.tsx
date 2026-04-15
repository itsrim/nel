import { ChevronLeft, AlertTriangle, ShieldCheck, MapPin, Calendar, Award, MessageCircle, UserMinus } from 'lucide-react';
import { useNavigationStore } from '../store/useNavigationStore';
import { useMessagingStore } from '../store/useMessagingStore';
import './OtherProfilePage.css';

interface OtherProfilePageProps {
  id: string;
}

export function OtherProfilePage({ id }: OtherProfilePageProps) {
  const { closeDetail, openDetail } = useNavigationStore();
  const { suggestions, profileVisits, friends } = useMessagingStore();

  // Find profile in suggestions, visites de profil ou amis
  const profile =
    suggestions.find((s) => s.id === id) ||
    profileVisits.find((v) => v.id === id) ||
    friends.find((f) => f.profilId === id);

  if (!profile) return null;

  const p = profile as Record<string, unknown>;
  const displayName = (p.pseudo as string | undefined) || (p.name as string);
  const messageConversationId = (p.mainChatConversationId as string | undefined) || 'c1';
  const reliability =
    typeof p.stats === 'object' && p.stats != null && 'reliability' in p.stats
      ? Number((p.stats as { reliability: number }).reliability).toFixed(1)
      : '5.0';

  return (
    <div className="other-profile-page">
      <div className="op-hero">
        <img src={profile.imageUrl || (profile as any).avatarUrl} alt={displayName} className="op-hero-image" />
        <div className="op-hero-gradient" />
        
        <header className="op-header">
          <button className="op-back-btn" onClick={closeDetail}>
            <ChevronLeft size={28} color="#fff" />
          </button>
          <button className="op-report-btn">
            <AlertTriangle size={24} color="#FFCC00" />
          </button>
        </header>

        <div className="op-hero-content">
          <h1 className="op-title">
            {displayName}, {(p.age as number | null | undefined) ?? '—'}
          </h1>
          {(profile as any).verified && (
            <div className="op-verified-row">
              <ShieldCheck size={18} color="#34C759" />
              <span>Profil vérifié</span>
            </div>
          )}
        </div>
      </div>

      <div className="op-content">
        <div className="op-bio-card">
          <p className="op-bio-text">{(profile as any).bio || "Pas de bio pour le moment."}</p>
          <div className="op-divider" />
          {(profile as any).city && (
            <div className="op-info-row">
              <MapPin size={18} color="#8E8E93" />
              <span>{(profile as any).city}</span>
            </div>
          )}
          <div className="op-info-row">
            <Calendar size={18} color="#8E8E93" />
            <span>Membre depuis {(profile as any).memberSince || "2024"}</span>
          </div>
        </div>

        <div className="op-stats-row">
          <div className="op-stat-cell">
            <span className="op-stat-value">{reliability}</span>
            <span className="op-stat-label">Fiabilité</span>
          </div>
          <div className="op-stat-cell">
            <span className="op-stat-value">{(profile as any).stats?.events || "0"}</span>
            <span className="op-stat-label">Événements</span>
          </div>
          <div className="op-stat-cell">
            <span className="op-stat-value">{(profile as any).stats?.friends || "0"}</span>
            <span className="op-stat-label">Amis</span>
          </div>
        </div>

        <h2 className="op-section-title">Badges</h2>
        <div className="op-badges-wrap">
          {((profile as any).badges || ['Pionnier']).map((b: string) => (
            <div key={b} className="op-badge-pill">
              <Award size={16} color="#FFB300" />
              <span>{b}</span>
            </div>
          ))}
        </div>

        <div className="op-actions">
          <button type="button" className="op-btn-message" onClick={() => openDetail('chat', messageConversationId)}>
            <MessageCircle size={20} />
            <span>Message</span>
          </button>
          <button type="button" className="op-btn-remove">
            <UserMinus size={20} />
            <span>Retirer des amis</span>
          </button>
        </div>
      </div>
    </div>
  );
}
