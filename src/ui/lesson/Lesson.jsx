import { useState } from 'react';
import Rich from '../common/Rich.jsx';
import Icon from '../common/Icon.jsx';
import Mascot from '../common/Mascot.jsx';
import { OBJECT_TYPES } from '../../engine/index.js';
import './lesson.css';

/** La consigne : Bit raconte la situation, puis l'objectif, la notion, les objets et les indices. */
export default function Lesson({ level, hintsUsed, onHint, onSolution }) {
  // Sur téléphone, la notion est repliée au départ pour garder la consigne courte
  const [notionOpen, setNotionOpen] = useState(() => !(typeof window !== 'undefined' && window.matchMedia?.('(max-width: 720px)').matches));
  return (
    <section className="lesson" aria-label="Consigne">
      <div className="bubble-row">
        <Mascot mood="happy" size={58} />
        <p className="bubble">{level.story}</p>
      </div>

      <div className="panel goal">
        <h3 className="goal-title">Ta mission</h3>
        {level.goal.map((g, i) => <Rich key={i} as="p" text={g} />)}
      </div>

      <div className={`notion ${notionOpen ? 'open' : ''}`}>
        <button className="notion-head" onClick={() => setNotionOpen((o) => !o)} aria-expanded={notionOpen} type="button">
          <Icon name="book" />
          <span className="notion-title">À savoir : {level.notion.title}</span>
          <Icon name="down" className="chev" />
        </button>
        <div className="notion-body">
          <div>
            <p>{level.notion.text}</p>
            <pre className="notion-code">{level.notion.code}</pre>
          </div>
        </div>
      </div>

      {level.objects.length > 0 && (
        <details className="objects">
          <summary>Ce que les objets savent faire</summary>
          <ul>
            {level.objects.flatMap((n) => Object.entries(OBJECT_TYPES[n].methods).map(([m, d]) => (
              <li key={`${n}.${m}`}>
                <code className="inline-code">{`${n}.${m}(${d.params.join(', ')})`}</code>
                <span>{d.doc}</span>
              </li>
            )))}
          </ul>
        </details>
      )}

      <div className="hints">
        {level.hints.slice(0, hintsUsed).map((h, i) => (
          <p key={i} className="hint"><Icon name="bulb" size={16} /><Rich text={h} /></p>
        ))}
        {hintsUsed < level.hints.length ? (
          <button className="text-btn" onClick={onHint} type="button">
            <Icon name="bulb" size={16} /> {hintsUsed === 0 ? 'Besoin d\'un indice ?' : 'Encore un indice'}
          </button>
        ) : (
          <button className="text-btn muted" onClick={onSolution} type="button">Voir une solution (1 étoile)</button>
        )}
      </div>
    </section>
  );
}
