import { useEffect, useMemo, useState } from 'react';
import { LEVELS } from './content/index.js';
import { createWorld, MAIN_FRAME } from './engine/index.js';
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
import Rich from './ui/common/Rich.jsx';
import MissionProgress from './ui/lesson/MissionProgress.jsx';
import { isSoundOn, setSound, playTap } from './ui/feedback/sound.js';
import { reportVisit } from './services/visits.js';
import MobileTabs from './ui/mobile/MobileTabs.jsx';

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
  const { result, compileError, stale, typing, idle, runId } = useAutoRun(level, code, progress.starter);
  const pb = usePlayback(result, runId);

  const [preview, setPreview] = useState(0);
  const [mapOpen, setMapOpen] = useState(false);
  const [win, setWin] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundOn);
  // Téléphone : une seule section visible à la fois (Consigne, Code ou Résultat)
  const [tab, setTab] = useState('lesson');
  const [seenRun, setSeenRun] = useState(0);
  const [typingFocus, setTypingFocus] = useState(false);

  // Toute nouvelle frappe referme l'aide : on laisse l'élève écrire tranquillement
  useEffect(() => { setHelpOpen(false); }, [code]);

  // Signal de visite anonyme (une fois par jour au maximum, voir services/visits.js)
  useEffect(() => { reportVisit(`${level.id} ${level.title}`); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Changement de niveau : on revient à la première situation
  useEffect(() => { setPreview(0); setWin(null); setTab('lesson'); }, [level]);
  useEffect(() => { if (tab === 'result') setSeenRun(runId); }, [tab, runId]);

  // Réussite : on enregistre les étoiles et on fête ça
  useEffect(() => {
    if (pb.finished && result?.passed) setWin({ runId, ...progress.complete() });
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

  let stageStatus = 'idle';
  if (pb.run) {
    if (!pb.finished) stageStatus = 'playing';
    else if (result.passed) stageStatus = 'passed';
    else stageStatus = pb.run.error ? 'error' : 'failed';
  }

  let status = { cls: '', text: 'À toi de jouer' };
  if (typing || stale) status = { cls: 'busy', text: 'Tu écris…' };
  else if (pb.playing) status = { cls: '', text: 'Exécution' };
  else if (result?.passed) status = { cls: 'ok', text: 'Réussi' };

  const goTo = (id) => { playTap(); progress.goTo(id); setMapOpen(false); };

  return (
    <div className={`app ${typingFocus ? 'kbd-open' : ''}`}>
      <TopBar
        level={level}
        levelIndex={levelIndex}
        total={LEVELS.length}
        totalStars={progress.totalStars}
        streak={progress.streak}
        playedToday={progress.playedToday}
        soundOn={soundOn}
        onToggleSound={() => { setSound(!soundOn); setSoundOn(!soundOn); }}
        maxStars={LEVELS.length * 3}
        onPrev={() => goTo(LEVELS[levelIndex - 1].id)}
        onNext={() => goTo(nextLevel.id)}
        onOpenMap={() => setMapOpen(true)}
      />

      <main className="layout level-enter" key={level.id} data-tab={tab}>
        <div className="col">
          <div className="pane pane-lesson">
          <MissionProgress mission={level.mission} currentId={level.id} stars={progress.stars} onPick={goTo} />
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
          <button className="btn btn-blue mobile-only pane-next" onClick={() => setTab('code')} type="button">
            J'écris mon code <Icon name="right" />
          </button>
          </div>

          <div className="pane pane-code">
          <section className="panel code-card">
            <div className="code-head">
              <span className="file-tab">Main.java</span>
              <button className={`run-status ${status.cls}`} onClick={() => setTab('result')} type="button">{status.text}</button>
            </div>
            <CodeEditor value={code} onChange={progress.setCode} activeLine={activeLine} errorLine={errorLine} frame={level.frame ?? MAIN_FRAME} onFocusChange={setTypingFocus} />
            <div className="code-foot">
              <button className="btn btn-ghost" onClick={pb.restart} disabled={!pb.run} type="button">
                <Icon name="replay" /> <span className="btn-label">Rejouer</span>
              </button>
              <button className="btn btn-ghost" onClick={pb.stepMode} disabled={!pb.run} type="button">
                <Icon name="step" /> <span className="btn-label">Pas à pas</span>
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
          {pb.run && (
            <button className={`mini-result mobile-only mini-${stageStatus}`} onClick={() => setTab('result')} type="button">
              <span className="mini-head">
                <span className="mini-status">{{ playing: '▶ Exécution', passed: '✓ Réussi', failed: '✗ À corriger', error: '! Erreur' }[stageStatus] ?? '…'}</span>
                <span className="mini-step">{pb.step + 1}/{pb.steps.length}</span>
              </span>
              <span className="mini-bar"><span style={{ width: `${pb.steps.length > 1 ? (pb.step / (pb.steps.length - 1)) * 100 : 0}%` }} /></span>
              <Rich text={current?.desc ?? ''} className="mini-desc" />
              {current?.out && <span className="mini-out">{current.out.trim().split('\n').pop()}</span>}
              <span className="mini-cta">Voir le résultat <Icon name="right" size={16} /></span>
            </button>
          )}
          {canHelp && !helpOpen && (
            <button className="help-btn mobile-only" onClick={() => setHelpOpen(true)} type="button">
              <Mascot mood="think" size={34} />
              Pourquoi ça ne marche pas ?
            </button>
          )}
          {canHelp && helpOpen && <div className="mobile-only"><Feedback state={help} /></div>}
          </div>
        </div>

        <div className="col col-right pane pane-result">
          <Stage
            world={world}
            tests={level.tests}
            testIndex={testIndex}
            results={pb.finished ? result?.runs : null}
            onPickTest={(i) => (pb.run ? pb.showRun(i) : setPreview(i))}
            moveMs={Math.round(Math.min(380, SPEEDS[pb.speed] * 0.85))}
            sceneKey={`${level.id}-${testIndex}`}
            status={stageStatus}
            progress={pb.steps.length > 1 ? pb.step / (pb.steps.length - 1) : 0}
            event={current?.event}
            stepKey={pb.step}
            error={runtimeError}
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
                <Memory vars={current?.vars ?? []} frames={current?.frames ?? []} />
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

      <MobileTabs
        tab={tab}
        onChange={(t) => { playTap(); setTab(t); window.scrollTo({ top: 0 }); }}
        badge={!!result && runId !== seenRun && tab !== 'result'}
        resultTone={stageStatus === 'passed' ? 'ok' : stageStatus === 'failed' || stageStatus === 'error' ? 'ko' : null}
      />

      <MissionMap open={mapOpen} onClose={() => setMapOpen(false)} currentId={level.id} stars={progress.stars} onPick={goTo} />

      <SuccessDialog
        open={!!win && win.runId === runId}
        stars={win?.earned ?? 0}
        gained={win?.gained ?? 0}
        streak={progress.streak}
        multi={level.tests.length > 1}
        hasNext={!!nextLevel}
        onNext={() => goTo(nextLevel.id)}
        onStay={() => setWin(null)}
      />
    </div>
  );
}
