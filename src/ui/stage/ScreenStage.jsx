import { useEffect, useRef } from 'react';
import Mascot from '../common/Mascot.jsx';

const MOOD = { idle: 'happy', playing: 'think', passed: 'party', failed: 'oops', error: 'oops' };

/**
 * Écran animé pour les niveaux « console » : chaque nouvelle ligne affichée par
 * System.out.println s'écrit lettre par lettre, et Bit réagit à l'exécution.
 */
export default function ScreenStage({ out, status, error }) {
  const body = useRef(null);
  const text = out ?? '';
  const lines = text.split('\n');
  const partial = lines.pop(); // texte après le dernier println (System.out.print)
  const empty = !text && status === 'idle';

  useEffect(() => {
    if (body.current) body.current.scrollTop = body.current.scrollHeight;
  }, [text]);

  return (
    <div className={`screen screen-${status}`}>
      <div className="screen-bar">
        <span className="screen-dot" />
        <span className="screen-dot" />
        <span className="screen-dot" />
        <span className="screen-title">Console</span>
      </div>
      <div className="screen-body" ref={body} aria-live="polite">
        {empty && <p className="screen-wait">Ton programme écrira ici…<span className="caret" /></p>}
        {lines.map((l, i) => (
          <div key={`${i}:${l}`} className="screen-line" style={{ '--n': Math.max(l.length, 1) }}>
            <span className="screen-text">{l || ' '}</span>
          </div>
        ))}
        {(partial || status === 'playing') && (
          <div key={`p:${partial}`} className="screen-line screen-partial" style={{ '--n': Math.max(partial.length, 1) }}>
            <span className="screen-text">{partial}</span>
            {status === 'playing' && <span className="caret" />}
          </div>
        )}
        {error && <div className="screen-line screen-error"><span className="screen-text">{`⚠ ${error.message}`}</span></div>}
      </div>
      <div className={`screen-bit bit-${status}`}>
        <Mascot mood={MOOD[status] ?? 'happy'} size={64} />
      </div>
    </div>
  );
}
