import { compileError } from './errors.js';

export const KEYWORDS = new Set([
  'int', 'double', 'boolean', 'char', 'long', 'float', 'byte', 'short', 'void', 'var',
  'if', 'else', 'while', 'for', 'do', 'break', 'continue', 'return', 'switch', 'case', 'default',
  'true', 'false', 'null', 'new', 'final', 'static', 'public', 'private', 'protected', 'class', 'this', 'super', 'abstract', 'interface',
]);

const OPS = [
  '>>>=', '<<=', '>>=', '>>>', '++', '--', '&&', '||', '==', '!=', '<=', '>=', '+=', '-=', '*=', '/=',
  '%=', '<<', '>>', '->', '::', '+', '-', '*', '/', '%', '=', '<', '>', '!', '(', ')', '{', '}', '[',
  ']', ';', ',', '.', '?', ':', '&', '|', '^', '~', '@',
];

const ID_START = /[\p{L}_$]/u;
const ID_PART = /[\p{L}\p{N}_$]/u;

const ESCAPES = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', '0': '\0', '"': '"', "'": "'", '\\': '\\', s: ' ' };

/**
 * Découpe le code source en jetons (tokens).
 * @param {string} src
 * @param {number} firstLine numéro de la première ligne (le code de l'élève commence après l'en-tête)
 */
export function tokenize(src, firstLine = 1) {
  const tokens = [];
  let i = 0;
  let line = firstLine;
  const n = src.length;

  const push = (t, v, extra) => tokens.push({ t, v, line, ...extra });

  while (i < n) {
    const c = src[i];

    if (c === '\n') { line++; i++; continue; }
    if (c === ' ' || c === '\t' || c === '\r') { i++; continue; }

    // Commentaires
    if (c === '/' && src[i + 1] === '/') {
      while (i < n && src[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      const start = line;
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) {
        if (src[i] === '\n') line++;
        i++;
      }
      if (i >= n) throw compileError('Commentaire /* non fermé : il manque */.', start);
      i += 2;
      continue;
    }

    // Nombres
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      let j = i;
      let isDouble = false;
      while (j < n && /[0-9_]/.test(src[j])) j++;
      if (src[j] === '.' && /[0-9]/.test(src[j + 1] || '')) {
        isDouble = true;
        j++;
        while (j < n && /[0-9_]/.test(src[j])) j++;
      } else if (src[j] === '.' && !ID_START.test(src[j + 1] || '')) {
        isDouble = true; // ex : 5.
        j++;
      }
      if (/[eE]/.test(src[j] || '')) {
        isDouble = true;
        j++;
        if (/[+-]/.test(src[j])) j++;
        while (j < n && /[0-9]/.test(src[j])) j++;
      }
      let text = src.slice(i, j).replace(/_/g, '');
      const suffix = src[j];
      if (suffix === 'd' || suffix === 'D' || suffix === 'f' || suffix === 'F') { isDouble = true; j++; }
      else if (suffix === 'L' || suffix === 'l') {
        throw compileError('Les nombres de type long (suffixe L) ne sont pas encore au programme de Java Quest.', line, 'Utilise un int sans le L.');
      }
      if (ID_PART.test(src[j] || '')) {
        throw compileError(`Nombre mal écrit : « ${src.slice(i, j + 1)} ».`, line, 'Un nom de variable ne peut pas commencer par un chiffre.');
      }
      const value = Number(text);
      if (!isDouble && value > 2147483647) {
        throw compileError(`Nombre entier trop grand : ${text}. Un int va jusqu'à 2147483647.`, line);
      }
      push('num', value, { isDouble, text: src.slice(i, j) });
      i = j;
      continue;
    }

    // Identifiants et mots-clés
    if (ID_START.test(c)) {
      let j = i + 1;
      while (j < n && ID_PART.test(src[j])) j++;
      const word = src.slice(i, j);
      push(KEYWORDS.has(word) ? 'kw' : 'id', word);
      i = j;
      continue;
    }

    // Chaînes de caractères
    if (c === '"') {
      let j = i + 1;
      let value = '';
      while (j < n && src[j] !== '"') {
        if (src[j] === '\n') {
          throw compileError('Chaîne de caractères non fermée : il manque le guillemet " de fin.', line);
        }
        if (src[j] === '\\') {
          const e = src[j + 1];
          if (!(e in ESCAPES)) throw compileError(`Séquence d'échappement inconnue : \\${e}`, line, 'Les plus utiles : \\n (retour à la ligne), \\t (tabulation), \\" (guillemet).');
          value += ESCAPES[e];
          j += 2;
        } else {
          value += src[j++];
        }
      }
      if (j >= n) throw compileError('Chaîne de caractères non fermée : il manque le guillemet " de fin.', line);
      push('str', value);
      i = j + 1;
      continue;
    }

    // Caractères
    if (c === "'") {
      let j = i + 1;
      let value;
      if (src[j] === '\\') {
        const e = src[j + 1];
        if (!(e in ESCAPES)) throw compileError(`Séquence d'échappement inconnue : \\${e}`, line);
        value = ESCAPES[e];
        j += 2;
      } else {
        value = src[j];
        j++;
      }
      if (src[j] !== "'" || value === undefined || value === "'" || value === '\n') {
        throw compileError("Caractère mal écrit : un char contient exactement un caractère entre apostrophes, par exemple 'A'.", line,
          'Pour du texte de plusieurs lettres, utilise un String avec des guillemets : "Bonjour".');
      }
      push('char', value.charCodeAt(0));
      i = j + 1;
      continue;
    }

    // Opérateurs et ponctuation
    const op = OPS.find((o) => src.startsWith(o, i));
    if (op) {
      push('op', op);
      i += op.length;
      continue;
    }

    if (c === '«' || c === '»' || c === '“' || c === '”') {
      throw compileError(`Guillemet « ${c} » non reconnu par Java.`, line, 'En Java, les chaînes s\'écrivent entre guillemets droits : "texte".');
    }
    throw compileError(`Caractère inattendu : « ${c} ».`, line);
  }

  tokens.push({ t: 'eof', v: '', line });
  return tokens;
}
