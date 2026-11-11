import Scene from './Scene.jsx';
import ScreenStage from './ScreenStage.jsx';
import Segmented from '../common/Segmented.jsx';
import './stage.css';

const STATUS = {
  idle: { label: 'En attente', icon: '…' },
  playing: { label: 'Exécution', icon: '▶' },
  passed: { label: 'Réussi', icon: '✓' },
  failed: { label: 'À corriger', icon: '✗' },
  error: { label: 'Erreur', icon: '!' },
};

/** Un niveau « console » n'a pas d'objet du monde : on affiche alors un écran animé. */
const isConsoleOnly = (w) => !w.goal && !w.chest && !w.door && !w.sensor && !w.lever && (!!w.terminal || !w.robot);

/**
 * La vue de résultat : situations testées (onglets), barre de progression de l'exécution,
 * puis le monde animé (robot, coffre…) ou l'écran de la console.
 */
export default function Stage({ world, tests, testIndex, onPickTest, results, moveMs, sceneKey, status = 'idle', progress = 0, event, stepKey, error }) {
  const tabs = tests.length > 1
    ? tests.map((t, i) => {
      const r = results?.[i];
      return { id: String(i), label: `${r ? (r.passed ? '✓ ' : '✗ ') : ''}${t.label}`, tone: r ? (r.passed ? 'ok' : 'ko') : undefined };
    })
    : null;
  const s = STATUS[status] ?? STATUS.idle;
  const consoleOnly = isConsoleOnly(world);

  return (
    <section className={`stage stage-${status}`} style={{ '--move': `${moveMs}ms` }}>
      {tabs && (
        <div className="stage-tabs">
          <span className="stage-tabs-label">Situations testées</span>
          <Segmented value={String(testIndex)} options={tabs} onChange={(id) => onPickTest(Number(id))} label="Situations testées" small />
        </div>
      )}
      <div className="stage-progress" aria-hidden="true"><span style={{ width: `${Math.round(progress * 100)}%` }} /></div>
      <div className={`stage-view ${consoleOnly ? 'stage-console' : ''}`}>
        <span key={status} className={`stage-badge badge-${status}`}><b>{s.icon}</b> {s.label}</span>
        {consoleOnly
          ? <ScreenStage key={sceneKey} out={world.screen} status={status} error={error} />
          : <Scene key={sceneKey} world={world} event={event} stepKey={stepKey} status={status} />}
      </div>
    </section>
  );
}
