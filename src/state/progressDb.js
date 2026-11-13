// Progression du joueur dans une vraie base SQL (SQLite), exécutée dans le navigateur.
//
// - Le moteur SQLite (sql.js, compilé en WebAssembly) tourne en mémoire ;
//   le fichier de la base est enregistré dans IndexedDB après chaque changement.
// - Les fonctions « pures » (schéma, lecture, écriture, code de reprise) reçoivent la base
//   en paramètre : elles sont testées sous Node (tests/progress-db.test.mjs).

export const SCHEMA_VERSION = 1;

export const SCHEMA = `
  CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value TEXT
  );
  CREATE TABLE IF NOT EXISTS level_progress (
    level_id     TEXT PRIMARY KEY,
    code         TEXT,
    stars        INTEGER NOT NULL DEFAULT 0 CHECK (stars BETWEEN 0 AND 3),
    hints        INTEGER NOT NULL DEFAULT 0,
    saw_solution INTEGER NOT NULL DEFAULT 0
  );
`;

/** Crée les tables si besoin et note la version du schéma. */
export function migrate(db) {
  db.exec(SCHEMA);
  db.run("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema', ?)", [String(SCHEMA_VERSION)]);
}

const getMeta = (db, key) => {
  const st = db.prepare('SELECT value FROM meta WHERE key = ?');
  try {
    st.bind([key]);
    return st.step() ? st.get()[0] : null;
  } finally { st.free(); }
};

/** La base contient-elle déjà une progression ? */
export function hasProgress(db) {
  return getMeta(db, 'current') !== null;
}

/** Lit toute la progression et la renvoie sous la forme utilisée par useProgress. */
export function readState(db) {
  const state = {
    current: getMeta(db, 'current'),
    savedAt: Number(getMeta(db, 'saved_at')) || 0,
    codes: {}, stars: {}, hints: {}, sawSolution: {},
    streak: { days: Number(getMeta(db, 'streak_days')) || 0, last: getMeta(db, 'streak_last') },
  };
  const st = db.prepare('SELECT level_id, code, stars, hints, saw_solution FROM level_progress');
  try {
    while (st.step()) {
      const [id, code, stars, hints, saw] = st.get();
      if (code !== null) state.codes[id] = code;
      if (stars > 0) state.stars[id] = stars;
      if (hints > 0) state.hints[id] = hints;
      if (saw) state.sawSolution[id] = true;
    }
  } finally { st.free(); }
  return state;
}

/** Remplace la progression enregistrée par `state` (dans une seule transaction). */
export function writeState(db, state) {
  const ids = new Set([
    ...Object.keys(state.codes ?? {}), ...Object.keys(state.stars ?? {}),
    ...Object.keys(state.hints ?? {}), ...Object.keys(state.sawSolution ?? {}),
  ]);
  db.exec('BEGIN');
  try {
    const meta = db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)');
    for (const [k, v] of [
      ['current', state.current],
      ['saved_at', String(state.savedAt ?? Date.now())],
      ['streak_days', String(state.streak?.days ?? 0)],
      ['streak_last', state.streak?.last ?? null],
    ]) meta.run([k, v]);
    meta.free();

    db.exec('DELETE FROM level_progress');
    const row = db.prepare('INSERT INTO level_progress (level_id, code, stars, hints, saw_solution) VALUES (?, ?, ?, ?, ?)');
    for (const id of ids) {
      row.run([
        id,
        state.codes?.[id] ?? null,
        Math.max(0, Math.min(3, state.stars?.[id] ?? 0)),
        state.hints?.[id] ?? 0,
        state.sawSolution?.[id] ? 1 : 0,
      ]);
    }
    row.free();
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

// ——— Code de reprise ———————————————————————————————————————————————————————
// Toute la progression, compressée puis écrite en base64url, préfixée par « JQ1. ».
// On le copie sur un appareil et on le colle sur un autre : aucun serveur n'est nécessaire.

const PREFIX = 'JQ1.';

const toB64url = (bytes) => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64url = (text) => {
  const s = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};
const pipe = async (bytes, stream) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());

export async function encodeResumeCode(state) {
  const { current, codes, stars, hints, sawSolution, streak } = state;
  const json = new TextEncoder().encode(JSON.stringify({ current, codes, stars, hints, sawSolution, streak }));
  return PREFIX + toB64url(await pipe(json, new CompressionStream('deflate-raw')));
}

/** Décode un code de reprise ; lève une erreur lisible s'il est invalide. */
export async function decodeResumeCode(code) {
  const clean = String(code).replace(/\s+/g, '');
  if (!clean.startsWith(PREFIX)) throw new Error('Ce code ne vient pas de Java Quest.');
  let data;
  try {
    const bytes = await pipe(fromB64url(clean.slice(PREFIX.length)), new DecompressionStream('deflate-raw'));
    data = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error('Ce code est incomplet ou abîmé : vérifie qu\'il a été copié en entier.');
  }
  if (!data || typeof data.current !== 'string') throw new Error('Ce code ne contient pas de progression.');
  return {
    current: data.current,
    codes: data.codes ?? {}, stars: data.stars ?? {}, hints: data.hints ?? {},
    sawSolution: data.sawSolution ?? {}, streak: data.streak ?? { days: 0, last: null },
  };
}
