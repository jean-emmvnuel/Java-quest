import { compile } from './java/compile.js';
import { execute } from './java/interpreter.js';
import { createWorld } from './world/map.js';
import { API, objectsFor } from './world/objects.js';

/**
 * Compile le code de l'élève, l'exécute dans chaque situation de test du niveau
 * et vérifie le résultat. Tout se passe dans le navigateur.
 */
export function runLevel(level, source) {
  const { ast, error } = compile(source, objectsFor(level.objects), level.frame);
  if (error) return { compileError: error, runs: [], passed: false };

  const runs = level.tests.map((test, index) => {
    const res = execute(ast, { world: createWorld(test.world), api: API });
    let failure = null;
    if (res.error) failure = res.error.message;
    else failure = level.check(res, { test, index, source, ast });
    return { ...res, label: test.label || null, failure, passed: !failure };
  });

  const ruleFailure = runs.every((r) => r.passed) ? (level.rules?.(source, ast) ?? null) : null;
  return { runs, ruleFailure, passed: runs.every((r) => r.passed) && !ruleFailure };
}

/** Situation à montrer en priorité : la première qui échoue, sinon la première. */
export function focusRun(result) {
  const i = result.runs.findIndex((r) => !r.passed);
  return i === -1 ? 0 : i;
}
