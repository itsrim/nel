import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';
import { useMessagingStore } from '../store/useMessagingStore';
import './ReportModal.css';

export interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Titre du dialogue (ex. signalement profil / sortie). */
  title: string;
  kind: 'profile' | 'event';
  subjectId: string;
  /** Nom affiché du profil ou titre de la sortie (file admin). */
  subjectLabel: string;
}

export function ReportModal({ isOpen, onClose, title, kind, subjectId, subjectLabel }: ReportModalProps) {
  const submitAdminReport = useMessagingStore((s) => s.submitAdminReport);
  const [explanation, setExplanation] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setExplanation('');
      setError('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    const t = explanation.trim();
    if (!t) {
      setError('Veuillez décrire le problème.');
      return;
    }
    setError('');
    try {
      submitAdminReport({ kind, subjectId, subjectLabel, explanation: t });
    } finally {
      onClose();
    }
  };

  /** Hors de la pile de détails / scroll du parent : sinon les clics peuvent ne pas atteindre le bouton Envoyer. */
  return createPortal(
    <div className="rm-root" role="dialog" aria-modal="true" aria-labelledby="rm-title">
      <div className="rm-backdrop" onClick={onClose} aria-hidden />
      <div
        className="rm-panel"
        role="document"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rm-icon-wrap" aria-hidden>
          <AlertTriangle size={28} color="#FFCC00" />
        </div>
        <h2 id="rm-title" className="rm-title">
          {title}
        </h2>
        <p className="rm-hint">Décrivez ce qui vous semble inapproprié ou dangereux.</p>
        <label className="rm-label" htmlFor="rm-explanation">
          Explication <span className="rm-required">(obligatoire)</span>
        </label>
        <textarea
          id="rm-explanation"
          className="rm-textarea"
          rows={5}
          value={explanation}
          onChange={(e) => {
            setExplanation(e.target.value);
            if (error) setError('');
          }}
          placeholder="Exemple : contenu offensant, arnaque, incitation à la haine…"
          autoFocus
        />
        {error ? <p className="rm-error">{error}</p> : null}
        <div className="rm-actions">
          <button type="button" className="rm-btn rm-btn--ghost" onClick={onClose}>
            Annuler
          </button>
          <button type="button" className="rm-btn rm-btn--primary" onClick={handleSubmit}>
            Envoyer
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
