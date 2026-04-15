import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import './QuestionnaireModal.css';

interface QuestionnaireModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EMOJIS = [
  { emoji: '😄', key: 'great' },
  { emoji: '😊', key: 'good' },
  { emoji: '😐', key: 'ok' },
  { emoji: '😔', key: 'low' },
  { emoji: '😢', key: 'sad' },
  { emoji: '🥰', key: 'loved' },
  { emoji: '😴', key: 'tired' },
  { emoji: '😤', key: 'tense' },
  { emoji: '🌟', key: 'hope' },
];

const BADGES = [
  'Travail', 'Argent', 'Aide', 'Santé', 'Fatigue', 'Douleur', 
  'Bonheur', 'Famille', 'Amour', 'Sport', 'Amis', 'Stress', 
  'Calme', 'Nature', 'Créativité'
];

export function QuestionnaireModal({ isOpen, onClose }: QuestionnaireModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<string | null>(null);
  const [note, setNote] = useState('');

  // Generate random stars for the background
  const stars = useMemo(() => {
    return Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.5 + 0.3
    }));
  }, []);

  if (!isOpen) return null;

  const handleNext = () => {
    if (step < 3) setStep((s) => (s + 1) as 1 | 2 | 3);
    else {
      // Complete
      onClose();
      setStep(1);
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  return (
    <div className="q-modal-overlay">
      <div className="q-modal-twilight">
        {stars.map(star => (
          <div 
            key={star.id} 
            className="q-star" 
            style={{ 
              left: `${star.left}%`, 
              top: `${star.top}%`, 
              width: `${star.size}px`, 
              height: `${star.size}px`,
              opacity: star.opacity
            }} 
          />
        ))}
      </div>

      <div className="q-modal-content">
        <header className="q-header">
          <div className="q-header-spacer" />
          <button className="q-close-btn" onClick={onClose}>
            <X size={30} color="#fff" />
          </button>
        </header>

        <div className="q-body">
          <p className="q-kicker">Comment ça va ?</p>
          <p className="q-step-badge">ÉTAPE {step} SUR 3</p>
          
          <h2 className="q-title">
            {step === 1 && "Quelle est votre humeur ?"}
            {step === 2 && "Qu'est-ce qui occupe votre esprit ?"}
            {step === 3 && "Une petite note pour vous-même ?"}
          </h2>
          
          <p className="q-subtitle">
            {step === 1 && "Choisissez l'emoji qui vous ressemble le plus aujourd'hui."}
            {step === 2 && "Sélectionnez un thème qui a marqué votre journée."}
            {step === 3 && "C'est privé, juste pour votre historique."}
          </p>

          <div className="q-options-container">
            {step === 1 && (
              <div className="emoji-grid">
                {EMOJIS.map(e => (
                  <button 
                    key={e.key} 
                    className={`emoji-btn ${selectedEmoji === e.key ? 'active' : ''}`}
                    onClick={() => { setSelectedEmoji(e.key); handleNext(); }}
                  >
                    {e.emoji}
                  </button>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="badge-wrap">
                {BADGES.map(b => (
                  <button 
                    key={b} 
                    className={`badge-chip ${selectedBadge === b ? 'active' : ''}`}
                    onClick={() => { setSelectedBadge(b); handleNext(); }}
                  >
                    {b}
                  </button>
                ))}
              </div>
            )}

            {step === 3 && (
              <textarea 
                className="q-textarea"
                placeholder="Écrivez quelque chose ici..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            )}
          </div>

          <div className="q-actions">
            {step === 3 && (
              <button className="q-primary-btn" onClick={handleNext}>
                Continuer <Check size={22} style={{marginLeft: 8}} />
              </button>
            )}
            <button className="q-skip-btn" onClick={handleSkip}>
              Passer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper hook for memoization if needed, but here we can just use useMemo if available
function useMemo<T>(factory: () => T, deps: any[]): T {
  return useState(factory)[0];
}
