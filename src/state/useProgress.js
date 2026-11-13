import { useCallback, useEffect, useRef, useState } from 'react';
import { LEVELS } from '../content/index.js';
import { openProgressStore } from './sqlStore.js';
import { encodeResumeCode, decodeResumeCode } from './progressDb.js';

// Progression du joueur : niveau courant, code de chaque niveau, étoiles gagnées, indices utilisés.
// Elle est enregistrée dans une base SQLite du navigateur (voir progressDb.js) ;
// le localStorage en garde une copie de secours, lue instantanément au démarrage
// et utilisée seule si SQLite ou IndexedDB ne sont pas disponibles.

const KEY = 'javaquest.progress.v2';

const empty = () => ({ current: LEVELS[0].id, codes: {}, stars: {}, hints: {}, sawSolution: {}, streak: { days: 0, last: null } });

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => ymd(new Date());
const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return ymd(d); };

/** Série de jours : +1 si on a joué hier, on repart à 1 sinon. */
function nextStreak(streak) {
  const d = today();
  if (streak?.last === d) return streak;
  return { days: streak?.last === yesterday() ? streak.days + 1 : 1, last: d };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...empty(), ...JSON.parse(raw) };
  } catch { /* stockage indisponible : on repart de zéro */ }
  return empty();
}

/** Garde un niveau courant valide (un niveau a pu être renommé ou retiré). */
const sanitize = (s) => (LEVELS.some((l) => l.id === s.current) ? s : { ...s, current: LEVELS[0].id });

/** 3 étoiles sans aide, 2 avec des indices, 1 après avoir regardé la solution. */
export function starsFor(hintsUsed, sawSolution) {
  if (sawSolution) return 1;
  return hintsUsed > 0 ? 2 : 3;
}

export function useProgress() {
  const [state, setStateRaw] = useState(load);
  // 'loading' → 'sql' (base SQLite prête) ou 'local' (secours localStorage)
  const [storage, setStorage] = useState('loading');
  const store = useRef(null);

  // Chaque changement est horodaté : au démarrage, la copie la plus récente l'emporte.
  const setState = useCallback((fn) => setStateRaw((s) => ({ ...fn(s), savedAt: Date.now() })), []);

  useEffect(() => {
    let alive = true;
    openProgressStore()
      .then((st) => {
        if (!alive) return;
        store.current = st;
        setStateRaw((local) => (st.state && st.state.savedAt >= (local.savedAt ?? 0) ? sanitize({ ...empty(), ...st.state }) : local));
        setStorage('sql');
      })
      .catch(() => { if (alive) setStorage('local'); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignoré */ }
    if (store.current) {
      try { store.current.save(state); } catch { /* le localStorage reste à jour */ }
    }
  }, [state, storage]);

  const patch = (field, id, value) => setState((s) => ({ ...s, [field]: { ...s[field], [id]: value } }));

  const level = LEVELS.find((l) => l.id === state.current) ?? LEVELS[0];
  const levelIndex = LEVELS.indexOf(level);
  // Projets : une étape reprend le code écrit à l'étape précédente (sinon la solution précédente)
  const prev = level.carry ? LEVELS[levelIndex - 1] : null;
  const starter = (prev && state.codes[prev.id]) ?? level.starter;

  return {
    level,
    levelIndex,
    starter,
    code: state.codes[level.id] ?? starter,
    hintsUsed: state.hints[level.id] ?? 0,
    stars: state.stars,
    totalStars: Object.values(state.stars).reduce((a, b) => a + b, 0),
    streak: state.streak?.last === today() || state.streak?.last === yesterday() ? state.streak.days : 0,
    playedToday: state.streak?.last === today(),
    storage,
    /** Code à copier pour reprendre la partie sur un autre appareil. */
    resumeCode: () => encodeResumeCode(state),
    /** Remplace la progression par celle d'un code de reprise (lève une erreur si le code est invalide). */
    importCode: async (code) => {
      const next = await decodeResumeCode(code);
      setState(() => sanitize({ ...empty(), ...next }));
    },
    /** Fichier .sqlite de la base (null si SQLite n'est pas disponible). */
    exportDatabase: () => store.current?.exportFile() ?? null,
    goTo: useCallback((id) => setState((s) => ({ ...s, current: id })), []),
    setCode: (code) => patch('codes', level.id, code),
    useHint: () => patch('hints', level.id, (state.hints[level.id] ?? 0) + 1),
    showSolution: () => {
      patch('sawSolution', level.id, true);
      patch('codes', level.id, level.solution);
    },
    /** Enregistre la réussite ; renvoie les étoiles obtenues et celles gagnées en plus. */
    complete: () => {
      const earned = starsFor(state.hints[level.id] ?? 0, state.sawSolution[level.id]);
      const before = state.stars[level.id] ?? 0;
      if (before < earned) patch('stars', level.id, earned);
      setState((s) => ({ ...s, streak: nextStreak(s.streak) }));
      return { earned, gained: Math.max(0, earned - before) };
    },
  };
}
