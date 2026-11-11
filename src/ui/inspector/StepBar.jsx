import Icon from '../common/Icon.jsx';
import Rich from '../common/Rich.jsx';
import Segmented from '../common/Segmented.jsx';

const SPEED_OPTIONS = [
  { id: 'slow', label: 'Lent' },
  { id: 'normal', label: 'Normal' },
  { id: 'fast', label: 'Rapide' },
];

/** Ce que fait le programme à l'étape courante, avec les commandes de lecture. */
export default function StepBar({ pb }) {
  const { current, step, steps, playing } = pb;
  const kind = current?.kind ?? 'idle';
  const tag = current?.line ? `Ligne ${current.line}` : kind === 'end' ? 'Fin' : 'Départ';
  return (
    <section className="panel stepbar" aria-label="Exécution pas à pas">
      <div className={`explain explain-${kind}`} aria-live="polite">
        <span className="explain-tag">{tag}</span>
        <Rich text={current?.desc ?? ''} className="explain-text" />
      </div>
      <div className="transport">
        <button className="round-btn" onClick={pb.prev} disabled={step <= 0} aria-label="Étape précédente" type="button"><Icon name="left" /></button>
        <button className="round-btn round-btn-main" onClick={pb.togglePlay} aria-label={playing ? 'Pause' : 'Lecture'} type="button">
          <Icon name={playing ? 'pause' : 'play'} size={20} />
        </button>
        <button className="round-btn" onClick={pb.next} disabled={step >= steps.length - 1} aria-label="Étape suivante" type="button"><Icon name="right" /></button>
        <input
          className="scrubber"
          type="range"
          min="0"
          max={Math.max(steps.length - 1, 0)}
          value={step}
          onChange={(e) => pb.seek(Number(e.target.value))}
          aria-label="Position dans l'exécution"
          style={{ '--p': steps.length > 1 ? `${(step / (steps.length - 1)) * 100}%` : '0%' }}
        />
        <span className="step-count">{step + 1}/{steps.length}</span>
        <Segmented value={pb.speed} options={SPEED_OPTIONS} onChange={pb.setSpeed} label="Vitesse" small />
      </div>
    </section>
  );
}
