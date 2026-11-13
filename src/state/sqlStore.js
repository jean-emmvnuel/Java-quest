// Ouvre la base SQLite de progression dans le navigateur.
// Le moteur (≈ 650 Ko de WebAssembly) est chargé après le premier affichage,
// puis le fichier de la base est relu depuis IndexedDB et réécrit après chaque changement.

import { migrate, hasProgress, readState, writeState } from './progressDb.js';

const IDB_NAME = 'javaquest';
const IDB_STORE = 'files';
const FILE = 'progress.sqlite';

function idb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbRequest(db, mode, run) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, mode);
    const req = run(tx.objectStore(IDB_STORE));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Renvoie { state, save(state), exportFile() } ; `state` vaut null si la base est vide.
 * Lève une erreur si SQLite ou IndexedDB ne sont pas disponibles (le jeu garde alors le localStorage).
 */
export async function openProgressStore() {
  const [{ default: initSqlJs }, { default: wasmUrl }] = await Promise.all([
    import('sql.js'),
    import('sql.js/dist/sql-wasm.wasm?url'),
  ]);
  const [SQL, files] = await Promise.all([initSqlJs({ locateFile: () => wasmUrl }), idb()]);
  const bytes = await idbRequest(files, 'readonly', (s) => s.get(FILE));
  const db = new SQL.Database(bytes ? new Uint8Array(bytes) : undefined);
  migrate(db);

  let timer = null;
  const flush = () => {
    timer = null;
    return idbRequest(files, 'readwrite', (s) => s.put(db.export(), FILE)).catch(() => { /* ignoré */ });
  };
  // Écrire le fichier en entier à chaque frappe serait inutile : on regroupe les changements.
  const schedule = () => { clearTimeout(timer); timer = setTimeout(flush, 400); };
  const onHide = () => { if (timer) { clearTimeout(timer); flush(); } };
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('pagehide', onHide);

  return {
    state: hasProgress(db) ? readState(db) : null,
    save(state) {
      writeState(db, state);
      schedule();
    },
    /** Le fichier .sqlite de la base, pour le télécharger. */
    exportFile: () => db.export(),
  };
}
