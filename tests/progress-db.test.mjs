// Vérifie la base SQLite de progression : schéma, écriture / relecture, code de reprise.
import initSqlJs from 'sql.js';
import { migrate, hasProgress, readState, writeState, encodeResumeCode, decodeResumeCode } from '../src/state/progressDb.js';

let failures = 0;
const check = (cond, msg) => { if (cond) console.log(`  ✓ ${msg}`); else { failures++; console.log(`  ✗ ${msg}`); } };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

console.log('Base de progression (SQLite)');
const SQL = await initSqlJs();
const db = new SQL.Database();
migrate(db);
migrate(db); // relancer la migration ne casse rien
check(!hasProgress(db), 'une base neuve est vide');

const state = {
  current: 'm2-3',
  savedAt: 1731500000000,
  codes: { 'm1-1': 'System.out.println("Bonjour");', 'm2-3': 'int a = 1;' },
  stars: { 'm1-1': 3, 'm2-1': 2 },
  hints: { 'm2-1': 1 },
  sawSolution: { 'm2-2': true },
  streak: { days: 4, last: '2026-11-13' },
};
writeState(db, state);
check(hasProgress(db), 'la progression est enregistrée');
check(same(readState(db), state), 'relecture identique à ce qui a été écrit');

// Le fichier exporté (celui gardé dans IndexedDB) se rouvre avec la même progression
const reopened = new SQL.Database(db.export());
migrate(reopened);
check(same(readState(reopened), state), 'le fichier .sqlite exporté se rouvre à l\'identique');

writeState(db, { ...state, codes: {}, stars: { 'm1-1': 9 }, hints: {}, sawSolution: {} });
const after = readState(db);
check(same(after.codes, {}) && same(after.stars, { 'm1-1': 3 }), 'réécriture complète, étoiles limitées à 3');

const rows = db.exec("SELECT COUNT(*) FROM level_progress")[0].values[0][0];
check(rows === 1, 'aucune ligne orpheline après réécriture');

console.log('Code de reprise');
const code = await encodeResumeCode(state);
check(code.startsWith('JQ1.') && /^[\w.-]+$/.test(code), `format JQ1.… (${code.length} caractères)`);
const { savedAt, ...withoutDate } = state;
check(same(await decodeResumeCode(`  ${code.slice(0, 20)}\n${code.slice(20)} `), withoutDate), 'aller-retour sans perte (espaces ignorés)');
for (const [bad, why] of [['bonjour', 'texte quelconque'], ['JQ1.abc', 'code tronqué']]) {
  let err = null;
  try { await decodeResumeCode(bad); } catch (e) { err = e; }
  check(err && err.message.length > 0, `refusé avec un message clair : ${why}`);
}

if (failures) { console.log(`\n${failures} échec(s)`); process.exit(1); }
console.log('\nBase de progression : tout est bon.');
