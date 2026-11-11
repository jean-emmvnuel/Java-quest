import { useEffect, useRef } from 'react';
import { MISSIONS, PROJECTS } from '../../content/index.js';
import Icon from '../common/Icon.jsx';
import Stars from '../common/Stars.jsx';
import './missions.css';

/** Carte du monde : les missions comme des îles, les niveaux comme des étapes sur un chemin. */
export default function MissionMap({ open, onClose, currentId, stars, onPick }) {
  const panel = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    panel.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <div className={`sheet-root ${open ? 'open' : ''}`} aria-hidden={!open}>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Carte des missions" ref={panel} tabIndex={-1}>
        <header className="sheet-head">
          <div>
            <h2>Carte des missions</h2>
            <p>Chaque mission se passe dans un lieu de la vie de tous les jours.</p>
          </div>
          <button className="round-btn" onClick={onClose} aria-label="Fermer" type="button"><Icon name="close" /></button>
        </header>

        <div className="sheet-scroll">
          {MISSIONS.map((m) => <Island key={m.id} m={m} stars={stars} currentId={currentId} onPick={onPick} />)}

          <section className="projects">
            <h3>Projets de la vie réelle</h3>
            <p>De vraies applications, construites étape par étape : chaque étape reprend ton code de l'étape précédente.</p>
            {PROJECTS.filter((p) => !p.upcoming).map((p) => (
              <Island key={p.id} m={p} stars={stars} currentId={currentId} onPick={onPick} />
            ))}
            <div className="project-grid">
              {PROJECTS.filter((p) => p.upcoming).map((p) => (
                <div key={p.id} className="project">
                  <Icon name="lock" size={16} />
                  <h4>{p.title}</h4>
                  <p>{p.summary}</p>
                  <span className="soon">Bientôt</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/** Une mission (ou un projet) : en-tête, étoiles gagnées et chemin des niveaux. */
function Island({ m, stars, currentId, onPick }) {
  const got = m.levels.reduce((a, l) => a + (stars[l.id] ?? 0), 0);
  const hue = m.project ? 145 : (m.num * 47) % 360;
  return (
    <section className={`island ${m.upcoming ? 'locked' : ''} ${m.project ? 'island-project' : ''}`} style={{ '--hue': hue }}>
      <div className="island-head">
        <span className="island-num">{m.upcoming ? <Icon name="lock" size={18} /> : m.project ? '★' : m.num}</span>
        <div>
          <h3>{m.title} <span className="island-place">· {m.place}</span></h3>
          <p>{m.summary}</p>
        </div>
        {!m.upcoming && <span className="island-stars"><Icon name="star" size={16} /> {got}/{m.levels.length * 3}</span>}
        {m.upcoming && <span className="soon">Bientôt</span>}
      </div>
      {!m.upcoming && (
        <ol className="path">
          {m.levels.map((l) => (
            <li key={l.id}>
              <button
                type="button"
                className={`node ${stars[l.id] ? 'done' : ''} ${l.id === currentId ? 'current' : ''}`}
                onClick={() => onPick(l.id)}
                title={l.title}
              >
                <span className="node-dot">{l.id.split('-')[1]}</span>
                <span className="node-title">{l.title}</span>
                <Stars count={stars[l.id] ?? 0} size={12} />
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
