import { useEffect, useRef, useState } from 'react';
import Icon from '../common/Icon.jsx';
import Logo from './Logo.jsx';
import './topbar.css';

/** Rejoue une petite animation quand une valeur augmente (étoiles, série). */
function useBump(value) {
  const prev = useRef(value);
  const [bump, setBump] = useState(0);
  useEffect(() => {
    if (value > prev.current) setBump((b) => b + 1);
    prev.current = value;
  }, [value]);
  return bump;
}

export default function TopBar({ level, levelIndex, total, totalStars, maxStars, streak, playedToday, soundOn, onToggleSound, onPrev, onNext, onOpenMap }) {
  const starBump = useBump(totalStars);
  const streakBump = useBump(streak);
  return (
    <header className="topbar">
      <Logo />
      <nav className="level-nav" aria-label="Niveaux">
        <button className="round-btn" disabled={levelIndex === 0} onClick={onPrev} aria-label="Niveau précédent" type="button"><Icon name="left" /></button>
        <button className="level-pill" onClick={onOpenMap} type="button">
          <span className="level-mission">Mission {level.mission.num} · {level.mission.title}</span>
          <span className="level-name">Niveau {level.id} <Icon name="down" size={14} /></span>
        </button>
        <button className="round-btn" disabled={levelIndex >= total - 1} onClick={onNext} aria-label="Niveau suivant" type="button"><Icon name="right" /></button>
      </nav>
      <div className="top-right">
        <span key={`s${streakBump}`} className={`chip-stat streak ${playedToday ? 'lit' : ''} ${streakBump ? 'bump' : ''}`} title={playedToday ? 'Série en cours : bravo !' : 'Réussis un niveau aujourd\'hui pour garder ta série'}>
          <span className="flame" aria-hidden="true">🔥</span>
          <span>{streak}</span>
          <span className="sr-only"> jour{streak > 1 ? 's' : ''} de suite</span>
        </span>
        <button key={`t${starBump}`} className={`chip-stat star-count ${starBump ? 'bump' : ''}`} onClick={onOpenMap} type="button" aria-label={`${totalStars} étoiles sur ${maxStars}, voir la carte`}>
          <Icon name="star" size={20} />
          <span>{totalStars}<small>/{maxStars}</small></span>
        </button>
        <button className="round-btn sound-btn" onClick={onToggleSound} aria-label={soundOn ? 'Couper le son' : 'Activer le son'} aria-pressed={soundOn} type="button">
          {soundOn ? '🔊' : '🔇'}
        </button>
      </div>
    </header>
  );
}
