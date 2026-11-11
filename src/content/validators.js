import { atGoal } from '../engine/world/map.js';

// Outils partagés par les niveaux pour valider le résultat d'une exécution.

/** Retire les commentaires du code (pour les règles du type « pas de 25 en dur »). */
export function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}
export const stripStrings = (src) => src.replace(/"(?:\\.|[^"\\])*"/g, '""');
export const codeOnly = (src) => stripStrings(stripComments(src));
export const count = (src, re) => (codeOnly(src).match(re) || []).length;
export const hasNumber = (src, n) => new RegExp(`(^|[^\\w.])${String(n).replace('.', '\\.')}(?![\\w.])`).test(codeOnly(src));

export const lines = (out) => out.replace(/\r/g, '').replace(/\n$/, '').split('\n');

export function expectOutput(run, expected) {
  const got = run.out.replace(/\r/g, '');
  const want = `${expected.join('\n')}\n`;
  if (got === want) return null;
  if (!got) return 'La console est vide : rien n\'a été affiché.';
  const g = lines(got);
  for (let i = 0; i < Math.max(g.length, expected.length); i++) {
    if (g[i] !== expected[i]) {
      if (g[i] === undefined) return `Il manque la ligne ${i + 1} : « ${expected[i]} ».`;
      if (expected[i] === undefined) return `Ligne ${i + 1} en trop : « ${g[i]} ».`;
      return `Ligne ${i + 1} : la console affiche « ${g[i]} » au lieu de « ${expected[i]} ».`;
    }
  }
  return 'La console ne correspond pas exactement au résultat attendu (vérifie les espaces et les retours à la ligne).';
}

/** Valeur finale d'une variable (telle qu'affichée dans la mémoire). */
export const finalVar = (run, name) => run.steps[run.steps.length - 1].vars.find((v) => v.name === name);
export const timesChanged = (run, name) => run.steps.filter((s) => s.vars.some((v) => v.name === name && v.changed)).length;

export const chestCheck = (run, code) => {
  if (run.world.chest.open) return null;
  if (run.world.chest.wrong !== null) return `Le coffre a refusé le code ${run.world.chest.wrong}. Il attend ${code}.`;
  return 'Le coffre n\'a pas été ouvert : as-tu appelé coffre.ouvrir(…) ?';
};

export const goalCheck = (run) => (atGoal(run.world) ? null : 'Le robot n\'est pas arrivé sur la zone d\'arrivée.');
