import Scene from './Scene.jsx';
import Segmented from '../common/Segmented.jsx';
import './stage.css';

/** L'écran de jeu : situations testées (onglets) + le monde. */
export default function Stage({ world, tests, testIndex, onPickTest, results, moveMs, sceneKey }) {
  const tabs = tests.length > 1
    ? tests.map((t, i) => {
      const r = results?.[i];
      return { id: String(i), label: `${r ? (r.passed ? '✓ ' : '✗ ') : ''}${t.label}`, tone: r ? (r.passed ? 'ok' : 'ko') : undefined };
    })
    : null;
  return (
    <section className="stage" style={{ '--move': `${moveMs}ms` }}>
      {tabs && (
        <div className="stage-tabs">
          <span className="stage-tabs-label">Situations testées</span>
          <Segmented value={String(testIndex)} options={tabs} onChange={(id) => onPickTest(Number(id))} label="Situations testées" small />
        </div>
      )}
      <div className="stage-view">
        <Scene key={sceneKey} world={world} />
      </div>
    </section>
  );
}
