import Icon from '../common/Icon.jsx';
import Logo from './Logo.jsx';
import './topbar.css';

export default function TopBar({ level, levelIndex, total, totalStars, maxStars, onPrev, onNext, onOpenMap }) {
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
      <button className="star-count" onClick={onOpenMap} type="button" aria-label="Voir la carte des missions">
        <Icon name="star" size={20} />
        <span>{totalStars}<small>/{maxStars}</small></span>
      </button>
    </header>
  );
}
