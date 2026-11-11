import { tokenize } from './lexer.js';
import { parse } from './parser.js';
import { check } from './checker.js';
import { JavaError } from './errors.js';

// Chaque niveau définit un « cadre » : des lignes fixes avant et après la zone où l'élève écrit.
// Par défaut, l'élève écrit le corps de main (missions 1 à 5) ; plus tard il écrit
// des méthodes (mission 6) ou des classes entières (missions 7 et 8).
export const HEADER = ['public class Main {', '    public static void main(String[] args) {'];
export const FOOTER = ['    }', '}'];
export const MAIN_FRAME = { before: HEADER, after: FOOTER, indent: 8 };
export const FIRST_LINE = HEADER.length + 1;

/** Le texte complet du fichier Main.java : cadre + code de l'élève. */
export function fullSource(source, frame = MAIN_FRAME) {
  return [...frame.before, source, ...frame.after].join('\n');
}

/** Compile le fichier. Renvoie { ast } ou { error }. */
export function compile(source, objects, frame = MAIN_FRAME) {
  try {
    const tokens = tokenize(fullSource(source, frame), 1);
    const ast = parse(tokens);
    check(ast, objects);
    return { ast };
  } catch (err) {
    if (err instanceof JavaError) return { error: err };
    throw err;
  }
}
