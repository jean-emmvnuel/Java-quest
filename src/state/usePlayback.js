import { useEffect, useState } from 'react';
import { focusRun } from '../engine/index.js';

export const SPEEDS = { slow: 850, normal: 380, fast: 120 };

/**
 * Rejoue la trace d'exécution étape par étape, comme une vidéo :
 * lecture automatique, pause, avancer / reculer, vitesse.
 * Si toutes les situations testées réussissent, elles sont jouées l'une après l'autre.
 */
export function usePlayback(result, runId) {
  const [runIdx, setRunIdx] = useState(0);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState('normal');
  const [finished, setFinished] = useState(false);

  const runs = result && !result.compileError ? result.runs : [];
  const run = runs[runIdx] ?? null;
  const steps = run?.steps ?? [];
  const current = steps[Math.min(step, steps.length - 1)] ?? null;
  const atEnd = !!run && step >= steps.length - 1;

  // Nouvelle exécution : on démarre la lecture automatiquement
  useEffect(() => {
    setFinished(false);
    setStep(0);
    if (!result || result.compileError) {
      setPlaying(false);
      setRunIdx(0);
      return;
    }
    setRunIdx(result.passed ? 0 : focusRun(result));
    setPlaying(true);
  }, [result, runId]);

  useEffect(() => {
    if (!playing || !run) return undefined;
    if (atEnd) {
      // Réussite : on enchaîne les situations testées, sauf si c'est long (on peut les ouvrir d'un clic)
      const totalSteps = runs.reduce((n, r) => n + r.steps.length, 0);
      if (result.passed && runIdx < runs.length - 1 && totalSteps <= 160) {
        const t = setTimeout(() => { setRunIdx((i) => i + 1); setStep(0); }, 600);
        return () => clearTimeout(t);
      }
      setPlaying(false);
      setFinished(true);
      return undefined;
    }
    // Les longues exécutions (projets) sont rejouées plus vite pour durer environ 30 secondes au plus,
    // sauf en vitesse « Lent » : on peut toujours avancer pas à pas.
    const scale = speed === 'slow' ? 1 : Math.min(1, 75 / Math.max(steps.length, 1));
    const base = Math.max(45, SPEEDS[speed] * scale);
    const delay = current?.kind === 'cond' ? base * 1.2 : base;
    const t = setTimeout(() => setStep((s) => s + 1), delay);
    return () => clearTimeout(t);
  }, [playing, run, atEnd, result, runIdx, runs.length, speed, current, steps.length]);

  // En pas à pas, atteindre la fin compte aussi comme « terminé »
  useEffect(() => {
    if (atEnd && !playing && run) setFinished(true);
  }, [atEnd, playing, run]);

  const stop = () => setPlaying(false);

  return {
    run,
    runIdx,
    steps,
    step,
    current,
    playing,
    speed,
    finished,
    setSpeed,
    togglePlay: () => {
      if (atEnd) setStep(0);
      setPlaying((p) => !p);
    },
    prev: () => { stop(); setStep((s) => Math.max(0, s - 1)); },
    next: () => { stop(); setStep((s) => Math.min(steps.length - 1, s + 1)); },
    seek: (v) => { stop(); setStep(v); },
    restart: () => { setStep(0); setPlaying(true); },
    stepMode: () => { stop(); setStep(0); },
    showRun: (i) => { stop(); setRunIdx(i); setStep(0); },
  };
}
