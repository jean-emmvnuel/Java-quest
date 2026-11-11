import { useEffect, useRef } from 'react';
import Mascot from '../common/Mascot.jsx';
import Stars from '../common/Stars.jsx';
import './feedback.css';

const CONFETTI = Array.from({ length: 18 }, (_, i) => i);

export default function SuccessDialog({ open, stars, multi, onNext, onStay, hasNext }) {
  const btn = useRef(null);
  useEffect(() => { if (open) btn.current?.focus(); }, [open]);
  if (!open) return null;
  return (
    <div className="win-root" role="dialog" aria-modal="true" aria-label="Niveau réussi">
      <div className="scrim win-scrim" onClick={onStay} />
      <div className="win-card">
        <div className="confetti" aria-hidden="true">
          {CONFETTI.map((i) => <span key={i} style={{ '--i': i }} />)}
        </div>
        <Mascot mood="party" size={92} />
        <h2>Bravo, niveau réussi !</h2>
        <Stars count={stars} size={40} animate />
        <p>
          {multi ? 'Ton programme marche dans toutes les situations testées.' : 'Ton programme fait exactement ce qui était demandé.'}
          {stars < 3 && ' Rejoue-le sans aide pour gagner les 3 étoiles.'}
        </p>
        <div className="win-actions">
          <button className="btn btn-ghost" onClick={onStay} type="button">Revoir mon code</button>
          {hasNext && <button ref={btn} className="btn btn-green" onClick={onNext} type="button">Niveau suivant</button>}
        </div>
      </div>
    </div>
  );
}
