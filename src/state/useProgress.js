import { useCallback, useEffect, useState } from 'react';
import { LEVELS } from '../content/index.js';

// Progression du joueur, sauvegardée dans le navigateur :
// niveau courant, code de chaque niveau, étoiles gagnées, indices utilisés.

const KEY = 'javaquest.progress.v2';

const empty = () => ({ current: LEVELS[0].id, codes: {}, stars: {}, hints: {}, sawSolution: {} });

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...empty(), ...JSON.parse(raw) };
  } catch { /* stockage indisponible : on repart de zéro */ }
  return empty();
}

/** 3 étoiles sans aide, 2 avec des indices, 1 après avoir regardé la solution. */
export function starsFor(hintsUsed, sawSolution) {
  if (sawSolution) return 1;
  return hintsUsed > 0 ? 2 : 3;
}

export function useProgress() {
  const [state, setState] = useState(load);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignoré */ }
  }, [state]);

  const patch = (field, id, value) => setState((s) => ({ ...s, [field]: { ...s[field], [id]: value } }));

  const level = LEVELS.find((l) => l.id === state.current) ?? LEVELS[0];

  return {
    level,
    levelIndex: LEVELS.indexOf(level),
    code: state.codes[level.id] ?? level.starter,
    hintsUsed: state.hints[level.id] ?? 0,
    stars: state.stars,
    totalStars: Object.values(state.stars).reduce((a, b) => a + b, 0),
    goTo: useCallback((id) => setState((s) => ({ ...s, current: id })), []),
    setCode: (code) => patch('codes', level.id, code),
    useHint: () => patch('hints', level.id, (state.hints[level.id] ?? 0) + 1),
    showSolution: () => {
      patch('sawSolution', level.id, true);
      patch('codes', level.id, level.solution);
    },
    /** Enregistre la réussite ; renvoie le nombre d'étoiles gagnées. */
    complete: () => {
      const earned = starsFor(state.hints[level.id] ?? 0, state.sawSolution[level.id]);
      if ((state.stars[level.id] ?? 0) < earned) patch('stars', level.id, earned);
      return earned;
    },
  };
}
