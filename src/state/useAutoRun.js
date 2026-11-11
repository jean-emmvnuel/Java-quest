import { useEffect, useState } from 'react';
import { runLevel } from '../engine/index.js';

const DEBOUNCE_MS = 800;
const IDLE_MS = 3000;

/**
 * Exécution automatique et silencieuse.
 *
 * - Pendant que l'élève tape, rien ne s'affiche : pas de message, pas de ligne rouge.
 * - Quand il s'arrête de taper, le code est compilé. S'il compile, il est exécuté et rejoué.
 * - S'il ne compile pas encore (code en cours d'écriture), on garde à l'écran
 *   la dernière exécution valide : la scène reste calme.
 * - `idle` passe à true après quelques secondes sans frappe : l'interface peut alors
 *   proposer (sans l'imposer) un bouton d'aide.
 */
export function useAutoRun(level, code, starter = level.starter) {
  const [latest, setLatest] = useState(null);
  const [shown, setShown] = useState(null);
  const [runId, setRunId] = useState(0);
  const [typing, setTyping] = useState(false);
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    setLatest(null);
    setShown(null);
  }, [level]);

  useEffect(() => {
    setIdle(false);
    if (code === starter) {
      setLatest(null);
      setShown(null);
      setTyping(false);
      return undefined;
    }
    setTyping(true);
    const run = setTimeout(() => {
      const res = runLevel(level, code);
      setLatest(res);
      if (!res.compileError) {
        setShown(res);
        setRunId((n) => n + 1);
      }
      setTyping(false);
    }, DEBOUNCE_MS);
    const rest = setTimeout(() => setIdle(true), IDLE_MS);
    return () => { clearTimeout(run); clearTimeout(rest); };
  }, [level, code, starter]);

  return {
    /** dernière exécution réussie à compiler : c'est elle qu'on rejoue */
    result: shown,
    /** erreur de compilation du code actuel (affichée seulement si l'élève demande de l'aide) */
    compileError: !typing && latest?.compileError ? latest.compileError : null,
    /** le code affiché à l'écran ne correspond plus au code tapé */
    stale: typing || !!latest?.compileError,
    typing,
    idle,
    runId,
  };
}
