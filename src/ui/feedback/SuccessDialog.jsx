import { useEffect, useMemo, useRef } from 'react';
import Mascot from '../common/Mascot.jsx';
import Stars from '../common/Stars.jsx';
import Icon from '../common/Icon.jsx';
import { playStar, playSuccess } from './sound.js';
import './feedback.css';

const CHEERS = ['Excellent !', 'Bravo !', 'Génial !', 'Parfait !', 'Super travail !', 'Tu assures !'];
const CONFETTI = Array.from({ length: 28 }, (_, i) => i);

/** Bandeau de réussite qui monte du bas de l'écran, avec étoiles, confettis et sons. */
export default function SuccessDialog({ open, stars, gained, streak, multi, onNext, onStay, hasNext }) {
  const btn = useRef(null);
  const stay = useRef(onStay);
  stay.current = onStay;
  const cheer = useMemo(() => CHEERS[Math.floor(Math.random() * CHEERS.length)], [open]);

  useEffect(() => {
    if (!open) return undefined;
    btn.current?.focus({ preventScroll: true });
    playSuccess();
    const timers = Array.from({ length: stars }, (_, i) => setTimeout(() => playStar(i), 420 + i * 170));
    const onKey = (e) => { if (e.key === 'Escape') stay.current(); };
    window.addEventListener('keydown', onKey);
    return () => { timers.forEach(clearTimeout); window.removeEventListener('keydown', onKey); };
  }, [open, stars]);

  if (!open) return null;
  return (
    <div className="win-root" role="dialog" aria-modal="true" aria-label="Niveau réussi">
      <div className="win-scrim" onClick={onStay} />
      <div className="confetti" aria-hidden="true">
        {CONFETTI.map((i) => <span key={i} style={{ '--i': i, '--x': `${(i * 37) % 100}%`, '--d': `${(i % 7) * 60}ms` }} />)}
      </div>
      <div className="win-sheet">
        <div className="win-row">
          <div className="win-mascot"><Mascot mood="party" size={84} /></div>
          <div className="win-text">
            <h2>{cheer}</h2>
            <p>{multi ? 'Ton programme marche dans toutes les situations testées.' : 'Ton programme fait exactement ce qui était demandé.'}</p>
            <div className="win-rewards">
              <Stars count={stars} size={34} animate />
              {gained > 0 && <span className="reward-chip reward-stars">+{gained} <Icon name="star" size={14} /></span>}
              {streak > 0 && <span className="reward-chip reward-streak">🔥 {streak} jour{streak > 1 ? 's' : ''}</span>}
            </div>
            {stars < 3 && <p className="win-tip">Rejoue-le sans aide pour décrocher les 3 étoiles.</p>}
          </div>
        </div>
        <div className="win-actions">
          <button className="btn btn-ghost" onClick={onStay} type="button">Revoir mon code</button>
          {hasNext && (
            <button ref={btn} className="btn btn-green btn-big" onClick={onNext} type="button">
              Continuer <Icon name="right" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
