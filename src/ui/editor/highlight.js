// Coloration syntaxique légère pour Java : renvoie une liste de lignes,
// chaque ligne étant une liste de segments { c: classe CSS, t: texte }.

const KW = new Set([
  'public', 'private', 'protected', 'static', 'final', 'class', 'void', 'new', 'return', 'if', 'else', 'while', 'for',
  'do', 'break', 'continue', 'switch', 'case', 'default', 'true', 'false', 'null', 'var', 'this', 'extends', 'implements',
]);
const TYPES = new Set(['int', 'double', 'boolean', 'char', 'long', 'float', 'byte', 'short', 'String', 'System', 'Math']);

const RE = /(\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$))|("(?:\\.|[^"\\\n])*"?)|('(?:\\.|[^'\\\n])*'?)|(\b\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?[dDfFlL]?\b)|([\p{L}_$][\p{L}\p{N}_$]*)(\s*\()?|(\n)|([^\n])/gu;

export function highlight(src) {
  const lines = [[]];
  const add = (c, t) => {
    t.split('\n').forEach((p, i) => {
      if (i > 0) lines.push([]);
      if (p) lines[lines.length - 1].push({ c, t: p });
    });
  };
  for (const m of src.matchAll(RE)) {
    const [, com, str, chr, num, id, paren, nl, other] = m;
    if (com) add('tk-com', com);
    else if (str || chr) add('tk-str', str || chr);
    else if (num) add('tk-num', num);
    else if (id) {
      add(KW.has(id) ? 'tk-kw' : TYPES.has(id) ? 'tk-type' : paren ? 'tk-fn' : 'tk-id', id);
      if (paren) add('', paren);
    } else if (nl) add('', '\n');
    else add('', other);
  }
  return lines;
}
