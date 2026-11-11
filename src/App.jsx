import { useEffect, useMemo, useState } from 'react';
import { LEVELS } from './content/index.js';
import { createWorld } from './engine/index.js';
import { useProgress } from './state/useProgress.js';
import { useAutoRun } from './state/useAutoRun.js';
import { usePlayback, SPEEDS } from './state/usePlayback.js';
import TopBar from './ui/layout/TopBar.jsx';
import Lesson from './ui/lesson/Lesson.jsx';
import CodeEditor from './ui/editor/CodeEditor.jsx';
import Stage from './ui/stage/Stage.jsx';
import StepBar from './ui/inspector/StepBar.jsx';
import Memory from './ui/inspector/Memory.jsx';
import ConsoleView from './ui/inspector/ConsoleView.jsx';
import Feedback from './ui/feedback/Feedback.jsx';
import SuccessDialog from './ui/feedback/SuccessDialog.jsx';
import MissionMap from './ui/missions/MissionMap.jsx';
import Mascot from './ui/common/Mascot.jsx';
import Icon from './ui/common/Icon.jsx';

/**
 * Explication de ce qui ne va pas — affichée seulement si l'élève la demande
 * (bouton « Pourquoi ça ne marche pas ? »), jamais pendant qu'il tape.
 */
function helpFor({ compileError, result, pb }) {
  if (compileError) {
    return { tone: 'error', title: `Ligne ${compileError.line}`, text: compileError.message, hint: compileError.hint };
  }
  if (!result || !pb.finished || result.passed) return null;
  const failed = result.runs.find((r) => !r.passed);
  const where = failed?.label ? ` (${failed.label})` : '';
  if (failed?.error) {
    return { tone: 'error', title: `Le programme s'est arrêté${where}`, text: failed.error.message, hint: failed.error.hint };
  }
  return { tone: 'warn', title: `Presque !${where}`, text: failed?.failure ?? result.ruleFailure };
}

export default function App() {
  const progress = useProgress();
  const { level, levelIndex, code } = progress;
  const { result, compileError, stale, typing, idle, runId } = useAutoRun(level, code);
  const pb = usePlayback(result, runId);

  const [preview, setPreview] = useState(0);
  const [mapOpen, setMapOpen] = useState(false);
  const [win, setWin] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);

  // Toute nouvelle frappe referme l'aide : on laisse l'élève écrire tranquillement
  useEffect(() => { setHelpOpen(false); }, [code]);

  // Changement de niveau : on revient à la première situation
  useEffect(() => { setPreview(0); setWin(null); }, [level]);

  // Réussite : on enregistre les étoiles et on fête ça
  useEffect(() => {
    if (pb.finished && result?.passed) setWin({ runId, stars: progress.complete() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pb.finished, result, runId]);

  // Flèches du clavier pour avancer / reculer pas à pas (hors éditeur)
  useEffect(() => {
    const onKey = (e) => {
      if (!pb.run || e.target.closest?.('textarea, input')) return;
      if (e.key === 'ArrowRight') pb.next();
      if (e.key === 'ArrowLeft') pb.prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pb]);

  const testIndex = pb.run ? pb.runIdx : preview;
  const test = level.tests[testIndex] ?? level.tests[0];
  const initialWorld = useMemo(() => createWorld(test.world), [test]);
  const current = pb.current;
  const world = useMemo(() => ({
    ...(current?.world ?? initialWorld),
    screen: current?.out ?? '',
    energyShown: test.world.energy !== undefined,
  }), [current, initialWorld, test]);

  const help = helpFor({ compileError, result, pb });
  const canHelp = !!help && idle && !typing;
  const errorLine = helpOpen && compileError ? compileError.line : null;
  const activeLine = stale ? null : current?.line;
  const nextLevel = LEVELS[levelIndex + 1];
  const solved = !!progress.stars[level.id];
  const runtimeError = pb.run?.error && current?.kind === 'error' ? pb.run.error : null;

  let status = { cls: '', text: 'À toi de jouer' };
  if (typing || stale) status = { cls: 'busy', text: 'Tu écris…' };
  else if (pb.playing) status = { cls: '', text: 'Exécution' };
  else if (result?.passed) status = { cls: 'ok', text: 'Réussi' };

  const goTo = (id) => { progress.goTo(id); setMapOpen(false); };

  return (
    <div className="app">
      <TopBar
        level={level}
        levelIndex={levelIndex}
        total={LEVELS.length}
        totalStars={progress.totalStars}
        maxStars={LEVELS.length * 3}
        onPrev={() => goTo(LEVELS[levelIndex - 1].id)}
        onNext={() => goTo(nextLevel.id)}
        onOpenMap={() => setMapOpen(true)}
      />

      <main className="layout">
        <div className="col">
          <div className="title-block">
            <p className="eyebrow">{level.mission.place}</p>
            <h1>{level.title}</h1>
          </div>

          <Lesson
            key={level.id}
            level={level}
            hintsUsed={progress.hintsUsed}
            onHint={progress.useHint}
            onSolution={progress.showSolution}
          />

          <section className="panel code-card">
            <div className="code-head">
              <span className="file-tab">Main.java</span>
              <span className={`run-status ${status.cls}`}>{status.text}</span>
            </div>
            <CodeEditor value={code} onChange={progress.setCode} activeLine={activeLine} errorLine={errorLine} />
            <div className="code-foot">
              <button className="btn btn-ghost" onClick={pb.restart} disabled={!pb.run} type="button">
                <Icon name="replay" /> Rejouer
              </button>
              <button className="btn btn-ghost" onClick={pb.stepMode} disabled={!pb.run} type="button">
                <Icon name="step" /> Pas à pas
              </button>
              <span className="spacer" />
              <button
                className={`btn btn-green ${solved ? 'btn-pulse' : ''}`}
                onClick={() => goTo(nextLevel.id)}
                disabled={!solved || !nextLevel}
                type="button"
              >
                Suivant <Icon name="right" />
              </button>
            </div>
          </section>
        </div>

        <div className="col col-right">
          <Stage
            world={world}
            tests={level.tests}
            testIndex={testIndex}
            results={pb.finished ? result?.runs : null}
            onPickTest={(i) => (pb.run ? pb.showRun(i) : setPreview(i))}
            moveMs={Math.round(Math.min(380, SPEEDS[pb.speed] * 0.85))}
            sceneKey={`${level.id}-${testIndex}`}
          />

          {canHelp && !helpOpen && (
            <button className="help-btn" onClick={() => setHelpOpen(true)} type="button">
              <Mascot mood="think" size={34} />
              Pourquoi ça ne marche pas ?
            </button>
          )}
          {canHelp && helpOpen && <Feedback state={help} />}

          {pb.run ? (
            <>
              <StepBar pb={pb} />
              <div className="duo">
                <Memory vars={current?.vars ?? []} />
                <ConsoleView out={current?.out ?? ''} error={runtimeError} />
              </div>
            </>
          ) : !(canHelp && helpOpen) && (
            <section className="panel welcome">
              <Mascot mood="happy" size={44} />
              <p>Écris ton code dans la <strong>zone jaune</strong> : il s'exécute tout seul et tu vois le résultat ici, étape par étape.</p>
            </section>
          )}
        </div>
      </main>

      <MissionMap open={mapOpen} onClose={() => setMapOpen(false)} currentId={level.id} stars={progress.stars} onPick={goTo} />

      <SuccessDialog
        open={!!win && win.runId === runId}
        stars={win?.stars ?? 0}
        multi={level.tests.length > 1}
        hasNext={!!nextLevel}
        onNext={() => goTo(nextLevel.id)}
        onStay={() => setWin(null)}
      />
    </div>
  );
}
