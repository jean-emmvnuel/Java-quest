import { compileError } from './errors.js';

// Vérification « à la compilation », comme javac : types, variables, classes,
// héritage, visibilité (private), valeurs de retour…
// Le programme est refusé AVANT d'être exécuté si quelque chose ne va pas.
// Chaque expression reçoit son type statique dans node.st, utilisé ensuite à l'exécution.

const NUMERIC = new Set(['int', 'double', 'char']);
const PRIMS = new Set(['int', 'double', 'boolean', 'char']);
const isNumeric = (t) => NUMERIC.has(t);
const promote = (a, b) => (a === 'double' || b === 'double' ? 'double' : 'int');
export const isArray = (t) => typeof t === 'string' && t.endsWith('[]');
export const elemOf = (t) => t.slice(0, -2);

// ArrayList<T> : les types de base s'écrivent avec leur « enveloppe » (Integer, Double…)
export const WRAPPERS = { Integer: 'int', Double: 'double', Boolean: 'boolean', Character: 'char' };
export const isList = (t) => typeof t === 'string' && t.startsWith('ArrayList<') && t.endsWith('>');
export const listElem = (t) => { const a = t.slice(10, -1); return WRAPPERS[a] ?? a; };
const ANY_LIST = 'ArrayList<?>';

export const LIST_METHODS = {
  add: (E) => [{ params: [E], ret: 'void' }, { params: ['int', E], ret: 'void' }],
  get: (E) => [{ params: ['int'], ret: E }],
  set: (E) => [{ params: ['int', E], ret: 'void' }],
  remove: (E) => [{ params: ['int'], ret: E }],
  size: () => [{ params: [], ret: 'int' }],
  isEmpty: () => [{ params: [], ret: 'boolean' }],
  contains: (E) => [{ params: [E], ret: 'boolean' }],
  indexOf: (E) => [{ params: [E], ret: 'int' }],
  clear: () => [{ params: [], ret: 'void' }],
};

export const MATH_METHODS = {
  abs: { arity: 1, ret: (ts) => (ts[0] === 'double' ? 'double' : 'int') },
  max: { arity: 2, ret: (ts) => promote(ts[0], ts[1]) },
  min: { arity: 2, ret: (ts) => promote(ts[0], ts[1]) },
  sqrt: { arity: 1, ret: () => 'double' },
  pow: { arity: 2, ret: () => 'double' },
  round: { arity: 1, ret: () => 'int' },
  floor: { arity: 1, ret: () => 'double' },
  ceil: { arity: 1, ret: () => 'double' },
};

export const STRING_METHODS = {
  length: { params: [], ret: 'int' },
  charAt: { params: ['int'], ret: 'char' },
  toUpperCase: { params: [], ret: 'String' },
  toLowerCase: { params: [], ret: 'String' },
  equals: { params: ['String'], ret: 'boolean' },
  equalsIgnoreCase: { params: ['String'], ret: 'boolean' },
  isEmpty: { params: [], ret: 'boolean' },
  contains: { params: ['String'], ret: 'boolean' },
  indexOf: { params: ['String'], ret: 'int' },
  startsWith: { params: ['String'], ret: 'boolean' },
  endsWith: { params: ['String'], ret: 'boolean' },
  trim: { params: [], ret: 'String' },
  substring: { params: ['int'], optional: ['int'], ret: 'String' },
  split: { params: ['String'], ret: 'String[]' },
  replace: { params: ['String', 'String'], ret: 'String' },
};

function levenshtein(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return d[a.length][b.length];
}

function closest(name, candidates) {
  let best = null;
  let bestD = Infinity;
  for (const c of candidates) {
    const dist = levenshtein(name.toLowerCase(), c.toLowerCase());
    if (dist < bestD) { bestD = dist; best = c; }
  }
  return bestD <= Math.max(1, Math.floor(name.length / 3)) ? best : null;
}

const sigOf = (params) => params.map((p) => p.type).join(', ');

/**
 * @param {object} program AST du fichier
 * @param {Record<string, {type:string, methods:Record<string,{params:string[], ret:string}>}>} objects objets du monde (robot…)
 */
export function check(program, objects = {}) {
  const classes = new Map();

  // ---------- Types ----------
  const isClass = (t) => classes.has(t);
  const isRef = (t) => t === 'String' || t === 'null' || isArray(t) || isList(t) || isClass(t);
  /** La classe elle-même, puis ses parents et ses interfaces (dans cet ordre). */
  const ancestors = (name) => {
    const out = [];
    const seen = new Set();
    const queue = [name];
    while (queue.length) {
      const n = queue.shift();
      if (seen.has(n) || !classes.has(n)) continue;
      seen.add(n);
      const c = classes.get(n);
      out.push(c);
      if (c.superName) queue.push(c.superName);
      queue.push(...c.interfaces);
    }
    return out;
  };
  const isSub = (a, b) => a === b || ancestors(a).some((c) => c.name === b);

  function assignError(dst, src) {
    if (dst === src) return null;
    if (src === 'void') return 'cette méthode ne renvoie rien (void) : il n\'y a pas de valeur à ranger.';
    if (dst === 'double' && (src === 'int' || src === 'char')) return null;
    if (dst === 'int' && src === 'char') return null;
    if (src === 'null' && isRef(dst)) return null;
    if (isClass(dst) && isClass(src) && isSub(src, dst)) return null;
    if (isList(dst) && src === ANY_LIST) return null;
    if (isList(dst) && isList(src)) return `une ${src} n'est pas une ${dst} : le type des éléments doit être le même.`;
    if (dst === 'int' && src === 'double') return 'conversion avec perte possible de double vers int.';
    if (dst === 'char' && (src === 'int' || src === 'double')) return `conversion avec perte possible de ${src} vers char.`;
    if (isClass(dst) && isClass(src) && isSub(dst, src)) return `un ${src} n'est pas forcément un ${dst}.`;
    return `types incompatibles : un ${src} ne peut pas être converti en ${dst}.`;
  }

  function assignHint(dst, src) {
    if (dst === 'int' && src === 'double') return 'Un int ne contient que des entiers. Déclare la variable en double, ou force la conversion avec (int).';
    if (dst === 'String' && src !== 'void') return 'Pour transformer une valeur en texte, tu peux la coller à une chaîne : "" + valeur.';
    if (src === 'String' && isNumeric(dst)) return 'Les guillemets créent du texte (String). Pour un nombre, écris-le sans guillemets.';
    if (dst === 'boolean') return 'Un boolean vaut seulement true ou false.';
    if (dst === 'char' && src === 'String') return 'Un char s\'écrit entre apostrophes simples : \'A\'.';
    if (isArray(dst) && !isArray(src)) return 'C\'est un tableau : pour une seule case, écris nom[indice].';
    return undefined;
  }

  function validType(t, line, allowVar = false) {
    if (t === 'var' && allowVar) return;
    let base = t;
    while (isArray(base)) base = elemOf(base);
    if (isList(base)) {
      const arg = base.slice(10, -1);
      if (WRAPPERS[arg] || arg === 'String' || isClass(arg)) return;
      throw compileError(`Type d'éléments inconnu dans ${base} : ${arg}.`, line, 'Exemples : ArrayList<String>, ArrayList<Integer>, ArrayList<Compte>.');
    }
    if (base === 'ArrayList' || base === 'List') throw compileError('Précise le type des éléments de la liste : ArrayList<String>, ArrayList<Integer>…', line);
    if (WRAPPERS[base]) throw compileError(`${base} s'utilise dans une liste (ArrayList<${base}>). Pour une variable, écris ${WRAPPERS[base]}.`, line);
    if (PRIMS.has(base) || base === 'String' || isClass(base)) return;
    if (base === 'var') throw compileError('var ne s\'utilise que pour une variable locale qui reçoit tout de suite une valeur.', line);
    const guess = closest(base, ['int', 'double', 'boolean', 'char', 'String', ...classes.keys()]);
    throw compileError(`Type inconnu : ${base}.`, line,
      guess ? `Voulais-tu écrire ${guess} ? (Java distingue les majuscules et les minuscules.)` : 'Les types disponibles : int, double, boolean, char, String, les tableaux et tes classes.');
  }

  // ---------- Recherche dans les classes ----------
  const chain = (name) => {
    const out = [];
    let c = classes.get(name);
    while (c) { out.push(c); c = c.superName ? classes.get(c.superName) : null; }
    return out;
  };
  const findField = (clsName, name) => {
    for (const c of chain(clsName)) if (c.fields.has(name)) return c.fields.get(name);
    return null;
  };
  const allMethods = (clsName, name) => ancestors(clsName).flatMap((c) => c.methods.filter((m) => m.name === name));
  const methodNames = (clsName) => [...new Set(ancestors(clsName).flatMap((c) => c.methods.map((m) => m.name)))];
  const kindOf = (c) => (c.isInterface ? 'l\'interface' : 'la classe');

  // ---------- 1er passage : enregistrer les classes ----------
  for (const node of program.classes) {
    if (classes.has(node.name)) throw compileError(`La classe ${node.name} est déclarée deux fois.`, node.line);
    if (node.name === 'String' || PRIMS.has(node.name)) throw compileError(`${node.name} est déjà un type de Java : choisis un autre nom de classe.`, node.line);
    classes.set(node.name, {
      name: node.name, superName: node.superName, interfaces: node.interfaces ?? [], isInterface: !!node.isInterface,
      abstract: !!node.mods?.abstract, node, fields: new Map(), methods: [], ctors: [],
    });
  }
  for (const c of classes.values()) {
    for (const i of c.interfaces) {
      const target = classes.get(i);
      if (!target) {
        const guess = closest(i, [...classes.keys()]);
        throw compileError(`L'interface ${i} n'existe pas.`, c.node.line, guess ? `Voulais-tu écrire ${guess} ?` : undefined);
      }
      if (!target.isInterface) throw compileError(`${i} est une classe, pas une interface : pour en hériter, utilise extends ${i}.`, c.node.line);
    }
    if (c.isInterface && c.abstract) throw compileError('Une interface est déjà abstraite : pas besoin d\'écrire abstract.', c.node.line);
    if (!c.superName) continue;
    if (classes.get(c.superName)?.isInterface) {
      throw compileError(`${c.superName} est une interface : une classe l'utilise avec implements ${c.superName} (et non extends).`, c.node.line);
    }
    if (!classes.has(c.superName)) {
      throw compileError(`La classe ${c.name} hérite de ${c.superName}, qui n'existe pas.`, c.node.line, closest(c.superName, [...classes.keys()]) ? `Voulais-tu écrire ${closest(c.superName, [...classes.keys()])} ?` : undefined);
    }
    const seen = new Set();
    let p = c.name;
    while (p) {
      if (seen.has(p)) throw compileError(`Héritage circulaire autour de ${c.name}.`, c.node.line);
      seen.add(p);
      p = classes.get(p).superName;
    }
  }
  for (const c of classes.values()) {
    for (const f of c.node.fields) {
      validType(f.varType, f.line);
      if (c.fields.has(f.name)) throw compileError(`L'attribut ${f.name} est déclaré deux fois dans ${c.name}.`, f.line);
      c.fields.set(f.name, { name: f.name, type: f.varType, static: !!f.mods.static, private: !!f.mods.private, final: !!f.mods.final, owner: c.name, node: f, line: f.line });
    }
    for (const m of c.node.methods) {
      if (m.ret !== 'void') validType(m.ret, m.line);
      m.params.forEach((p) => validType(p.type, p.line));
      const sig = sigOf(m.params);
      if (c.methods.some((o) => o.name === m.name && o.sig === sig)) throw compileError(`La méthode ${m.name}(${sig}) est déclarée deux fois dans ${c.name}.`, m.line);
      const abstract = !!m.mods.abstract || (c.isInterface && !m.mods.static);
      if (abstract && !c.isInterface && !c.abstract) {
        throw compileError(`La classe ${c.name} contient la méthode abstraite ${m.name} : elle doit elle-même être déclarée abstract.`, m.line,
          `Écris : abstract class ${c.name} { … }`);
      }
      if (abstract && m.mods.private) throw compileError(`Une méthode abstraite ne peut pas être private : personne ne pourrait l'écrire.`, m.line);
      c.methods.push({
        name: m.name, params: m.params, sig, ret: m.ret, static: !!m.mods.static, private: !!m.mods.private,
        public: !!m.mods.public || c.isInterface, abstract, owner: c.name, node: m, line: m.line,
      });
    }
    for (const k of c.node.ctors) {
      k.params.forEach((p) => validType(p.type, p.line));
      const sig = sigOf(k.params);
      if (c.ctors.some((o) => o.sig === sig)) throw compileError(`Le constructeur ${c.name}(${sig}) est déclaré deux fois.`, k.line);
      c.ctors.push({ name: c.name, params: k.params, sig, owner: c.name, node: k, line: k.line, private: !!k.mods.private });
    }
  }

  // Redéfinitions (@Override)
  for (const c of classes.values()) {
    for (const m of c.methods) {
      const parents = ancestors(c.name).slice(1);
      const parentM = parents.flatMap((k) => k.methods).find((o) => o.name === m.name && o.sig === m.sig) ?? null;
      if (parentM) {
        if (parentM.public && !m.public && !c.isInterface) {
          throw compileError(`${m.name}(${m.sig}) doit être public : elle vient de ${kindOf(classes.get(parentM.owner))} ${parentM.owner}, où elle est publique.`, m.line,
            `Ajoute public devant : public ${m.ret} ${m.name}(…)`);
        }
        if (parentM.ret !== m.ret) throw compileError(`${m.name}(${m.sig}) redéfinit la méthode de ${parentM.owner} : elle doit renvoyer le même type (${parentM.ret}).`, m.line);
        if (parentM.static !== m.static) throw compileError(`${m.name} ne peut pas être static dans une classe et pas dans l'autre.`, m.line);
      }
      const ann = m.node.mods.annotations.find((a) => a.name === 'Override');
      if (ann && !parentM && !(m.name === 'toString' && m.sig === '' && m.ret === 'String')) {
        throw compileError(`@Override : il n'y a aucune méthode ${m.name}(${m.sig}) à redéfinir dans ${[c.superName, ...c.interfaces].filter(Boolean).join(' ou ') || 'la classe parente'}.`, ann.line,
          'Vérifie le nom (majuscules comprises) et les paramètres : ils doivent être identiques à ceux de la classe parente.');
      }
      if (m.node.mods.annotations.some((a) => a.name !== 'Override')) throw compileError('Seule l\'annotation @Override est prise en charge.', m.line);
    }
  }

  // Une classe « normale » doit écrire toutes les méthodes abstraites qu'elle hérite
  for (const c of classes.values()) {
    if (c.isInterface || c.abstract) continue;
    const concrete = (name, sig) => chain(c.name).some((k) => k.methods.some((m) => m.name === name && m.sig === sig && !m.abstract));
    for (const k of ancestors(c.name).slice(1)) {
      for (const m of k.methods) {
        if (m.abstract && !concrete(m.name, m.sig)) {
          throw compileError(`La classe ${c.name} doit écrire la méthode ${m.ret} ${m.name}(${m.sig}) de ${kindOf(k)} ${k.name}.`, c.node.line,
            `C'est une méthode abstraite : chaque classe concrète doit l'écrire. Ajoute dans ${c.name} : ${m.public ? 'public ' : ''}${m.ret} ${m.name}(${m.params.map((p) => `${p.type} ${p.name}`).join(', ')}) { … }`);
        }
      }
    }
  }

  // main
  let main = null;
  for (const c of classes.values()) {
    const m = c.methods.find((x) => x.name === 'main');
    if (m) {
      if (!m.static || m.ret !== 'void' || m.sig !== 'String[]') throw compileError('La méthode main doit s\'écrire : public static void main(String[] args)', m.line);
      main = m;
    }
  }
  if (!main) throw compileError('Il manque la méthode main : public static void main(String[] args) { … }', 1);
  program.main = main;
  program.classInfo = classes;

  // ---------- 2e passage : vérifier le code ----------
  let ctx = null;
  let scopes = [];

  const lookupLocal = (name) => {
    for (let i = scopes.length - 1; i >= 0; i--) if (scopes[i].has(name)) return scopes[i].get(name);
    return null;
  };
  const allNames = () => [...scopes.flatMap((s) => [...s.keys()]), ...Object.keys(objects), ...(ctx ? chain(ctx.cls.name).flatMap((c) => [...c.fields.keys()]) : [])];
  const withScope = (fn) => {
    scopes.push(new Map());
    try { return fn(); } finally { scopes.pop(); }
  };
  const declare = (name, info, line) => {
    if (lookupLocal(name)) throw compileError(`La variable ${name} est déjà déclarée.`, line, `Pour changer sa valeur, n'écris pas le type à nouveau : ${name} = …;`);
    if (objects[name]) throw compileError(`Le nom ${name} est déjà pris par un objet du niveau.`, line, 'Choisis un autre nom de variable.');
    scopes[scopes.length - 1].set(name, info);
  };

  function unknownSymbol(name, line) {
    if (name === 'system' || name === 'Systeme') return compileError(`Symbole introuvable : ${name}.`, line, 'Java distingue majuscules et minuscules : écris System avec un S majuscule.');
    const guess = closest(name, allNames());
    return compileError(`Symbole introuvable : la variable ${name} n'existe pas ici.`, line,
      guess ? `Voulais-tu écrire ${guess} ? (Java distingue les majuscules et les minuscules.)` : 'As-tu bien déclaré cette variable avant de l\'utiliser ? Une variable déclarée dans une autre méthode n\'est pas visible ici.');
  }

  function requireBoolean(test, word) {
    const t = expr(test);
    if (t !== 'boolean') {
      const isAssign = test.type === 'Assign' && test.op === '=';
      throw compileError(`La condition du ${word} doit être un boolean (true ou false), mais ici c'est un ${t}.`, test.line,
        isAssign ? 'Tu as écrit = (qui range une valeur). Pour comparer, utilise == .' : 'Une condition est une comparaison, par exemple x > 5 ou a == b.');
    }
  }

  function checkInit(type, init, name, line) {
    if (init.type === 'ArrayLit') {
      if (type === 'var') throw compileError('Avec var, écris new int[]{…} au lieu de {…}.', line);
      return checkArrayLit(init, type);
    }
    const t = expr(init);
    if (type === 'var') {
      if (t === 'void' || t === 'null') throw compileError('Impossible de deviner le type de cette variable.', line);
      return t;
    }
    const err = assignError(type, t);
    if (err) throw compileError(`Impossible de ranger cette valeur dans ${name} : ${err}`, line, assignHint(type, t));
    return type;
  }

  function checkArrayLit(node, arrayType) {
    if (!isArray(arrayType)) throw compileError(`Des valeurs entre { } ne peuvent aller que dans un tableau, pas dans un ${arrayType}.`, node.line);
    const el = elemOf(arrayType);
    node.items.forEach((it) => {
      if (it.type === 'ArrayLit') { checkArrayLit(it, el); return; }
      const t = expr(it);
      const err = assignError(el, t);
      if (err) throw compileError(`Valeur incorrecte dans le tableau : ${err}`, it.line, assignHint(el, t));
    });
    node.st = arrayType;
    node.arrayType = arrayType;
    return arrayType;
  }

  // ---------- Instructions ----------
  function stmt(s) {
    switch (s.type) {
      case 'Block':
        withScope(() => s.body.forEach((x, i) => {
          if (x.type === 'SuperCall' && !(ctx.isCtor && s === ctx.body && i === 0)) {
            throw compileError('super(…) doit être la toute première instruction d\'un constructeur.', x.line);
          }
          stmt(x);
        }));
        return;
      case 'Empty':
        return;
      case 'VarDecl':
        if (s.varType !== 'var') validType(s.varType, s.line);
        for (const d of s.decls) {
          if (lookupLocal(d.name)) declare(d.name, null, d.line);
          d.type = d.init ? checkInit(s.varType, d.init, d.name, d.line) : s.varType;
          declare(d.name, { type: d.type, init: !!d.init, final: !!s.final }, d.line);
        }
        return;
      case 'ExprStmt':
        expr(s.expr);
        return;
      case 'If':
        requireBoolean(s.test, 'if');
        withScope(() => stmt(s.cons));
        if (s.alt) withScope(() => stmt(s.alt));
        return;
      case 'While':
        requireBoolean(s.test, 'while');
        loop(() => withScope(() => stmt(s.body)));
        return;
      case 'DoWhile':
        loop(() => withScope(() => stmt(s.body)));
        requireBoolean(s.test, 'while');
        return;
      case 'For':
        withScope(() => {
          if (s.init) {
            if (s.init.type === 'VarDecl') stmt(s.init);
            else s.init.exprs.forEach(expr);
          }
          if (s.test) requireBoolean(s.test, 'for');
          loop(() => withScope(() => stmt(s.body)));
          s.update.forEach(expr);
        });
        return;
      case 'ForEach': {
        const t = expr(s.iter);
        if (!isArray(t) && !isList(t)) throw compileError(`La boucle for (… : …) parcourt un tableau ou une liste, mais ici c'est un ${t}.`, s.line);
        const el = isList(t) ? listElem(t) : elemOf(t);
        if (s.varType !== 'var') {
          validType(s.varType, s.line);
          const err = assignError(s.varType, el);
          if (err) throw compileError(`Les cases du tableau sont des ${el} : ${err}`, s.line);
        }
        s.elemType = s.varType === 'var' ? el : s.varType;
        withScope(() => {
          declare(s.name, { type: s.elemType, init: true }, s.line);
          loop(() => withScope(() => stmt(s.body)));
        });
        return;
      }
      case 'Break':
      case 'Continue':
        if (ctx.loopDepth === 0) throw compileError(`${s.type === 'Break' ? 'break' : 'continue'} en dehors d'une boucle.`, s.line);
        return;
      case 'Return': {
        if (ctx.isCtor || ctx.ret === 'void') {
          if (s.value) throw compileError(ctx.isCtor ? 'Un constructeur ne renvoie pas de valeur.' : `La méthode ${ctx.method.name} est void : elle ne renvoie pas de valeur.`, s.line,
            ctx.isCtor ? undefined : `Pour renvoyer une valeur, remplace void par son type, par exemple : static int ${ctx.method.name}(…)`);
          return;
        }
        if (!s.value) throw compileError(`La méthode ${ctx.method.name} doit renvoyer un ${ctx.ret}.`, s.line);
        const t = expr(s.value);
        const err = assignError(ctx.ret, t);
        if (err) throw compileError(`La valeur renvoyée ne correspond pas au type ${ctx.ret} de la méthode : ${err}`, s.line, assignHint(ctx.ret, t));
        s.retType = ctx.ret;
        return;
      }
      case 'SuperCall':
        checkSuperCall(s.args, s.line, s);
        return;
      default:
        throw compileError(`Instruction non prise en charge (${s.type}).`, s.line);
    }
  }

  function loop(fn) {
    ctx.loopDepth++;
    try { fn(); } finally { ctx.loopDepth--; }
  }

  function alwaysReturns(s) {
    if (!s) return false;
    switch (s.type) {
      case 'Return': return true;
      case 'Block': return s.body.some(alwaysReturns);
      case 'If': return !!s.alt && alwaysReturns(s.cons) && alwaysReturns(s.alt);
      case 'While': return s.test.type === 'Lit' && s.test.value === true && !containsBreak(s.body);
      default: return false;
    }
  }
  function containsBreak(s) {
    if (!s || typeof s !== 'object') return false;
    if (s.type === 'Break') return true;
    if (['While', 'For', 'DoWhile', 'ForEach'].includes(s.type)) return false;
    return Object.values(s).some((v) => (Array.isArray(v) ? v.some(containsBreak) : v && typeof v === 'object' && v.type ? containsBreak(v) : false));
  }

  // ---------- Expressions ----------
  function expr(e) {
    const t = exprType(e);
    e.st = t;
    return t;
  }

  function fieldAccessCheck(f, line) {
    if (f.private && ctx.cls.name !== f.owner) {
      throw compileError(`L'attribut ${f.name} est private dans ${f.owner} : on ne peut pas y accéder depuis ${ctx.cls.name}.`, line,
        `C'est l'encapsulation : passe par une méthode de ${f.owner} (un getter comme get${f.name[0].toUpperCase()}${f.name.slice(1)}()).`);
    }
  }

  /** Cible d'une affectation : renvoie { type, info? } */
  function lvalue(t, forWrite = true) {
    if (t.type === 'Ident') {
      const v = lookupLocal(t.name);
      if (v) {
        if (forWrite && v.final && v.init) throw compileError(`${t.name} est déclarée final : sa valeur ne peut plus changer.`, t.line);
        t.ref = { kind: 'local' };
        t.st = v.type;
        return { type: v.type, local: v };
      }
      const f = ctx && findField(ctx.cls.name, t.name);
      if (f) {
        identField(t, f);
        if (forWrite && f.final && !ctx.isCtor) throw compileError(`L'attribut ${t.name} est final : il ne peut plus changer.`, t.line);
        return { type: f.type };
      }
      if (objects[t.name] || t.name === 'System' || t.name === 'Math' || isClass(t.name)) throw compileError(`${t.name} n'est pas une variable : on ne peut pas changer sa valeur.`, t.line);
      throw unknownSymbol(t.name, t.line);
    }
    if (t.type === 'Member') {
      const type = expr(t);
      if (t.isLength) throw compileError('La taille d\'un tableau (length) ne peut pas être modifiée.', t.line);
      if (forWrite && t.field?.final && !ctx.isCtor) throw compileError(`L'attribut ${t.name} est final : il ne peut plus changer.`, t.line);
      return { type };
    }
    return { type: expr(t) }; // Index
  }

  function identField(e, f) {
    fieldAccessCheck(f, e.line);
    if (!f.static && ctx.isStatic) {
      throw compileError(`On ne peut pas utiliser l'attribut ${f.name} dans une méthode static : il appartient à chaque objet.`, e.line,
        'Crée d\'abord un objet avec new, puis utilise objet.' + f.name + ' (ou déclare l\'attribut static).');
    }
    e.ref = { kind: 'field', field: f };
    e.st = f.type;
  }

  function exprType(e) {
    switch (e.type) {
      case 'Lit':
        return e.vt;
      case 'Paren':
        return expr(e.expr);
      case 'This':
        if (ctx.isStatic) throw compileError('this n\'existe pas dans une méthode static : il n\'y a pas d\'objet courant.', e.line);
        return ctx.cls.name;
      case 'Ident': {
        const v = lookupLocal(e.name);
        if (v) {
          if (!v.init) throw compileError(`La variable ${e.name} n'a pas encore reçu de valeur.`, e.line, `Donne-lui une valeur avant de la lire, par exemple : ${e.name} = …;`);
          e.ref = { kind: 'local' };
          return v.type;
        }
        const f = findField(ctx.cls.name, e.name);
        if (f) { identField(e, f); return f.type; }
        if (objects[e.name]) throw compileError(`${e.name} est un objet : utilise une de ses méthodes, par exemple ${e.name}.${Object.keys(objects[e.name].methods)[0]}().`, e.line);
        if (e.name === 'System' || e.name === 'Math' || isClass(e.name)) throw compileError(`${e.name} est une classe, pas une valeur.`, e.line);
        throw unknownSymbol(e.name, e.line);
      }
      case 'ArrayLit':
        return checkArrayLit(e, e.arrayType);
      case 'NewArray': {
        validType(e.arrayType, e.line);
        for (const sz of e.sizes ?? [e.size]) {
          const t = expr(sz);
          if (t !== 'int' && t !== 'char') throw compileError(`La taille d'un tableau doit être un int, pas un ${t}.`, e.line);
        }
        return e.arrayType;
      }
      case 'New': {
        if (e.cls === 'ArrayList' && !classes.has('ArrayList')) {
          if (e.args.length) throw compileError('new ArrayList<>() ne prend pas de valeur entre parenthèses : la liste commence vide.', e.line, 'Ajoute ensuite les éléments avec add(…).');
          if (!e.generic) throw compileError('Écris new ArrayList<>() (avec les chevrons < >).', e.line);
          if (e.typeArg) { validType(`ArrayList<${e.typeArg}>`, e.line); return `ArrayList<${e.typeArg}>`; }
          return ANY_LIST;
        }
        const c = classes.get(e.cls);
        if (!c) {
          if (e.cls === 'String') throw compileError('Pour créer un texte, écris-le simplement entre guillemets : "Bonjour".', e.line);
          const guess = closest(e.cls, [...classes.keys()]);
          throw compileError(`La classe ${e.cls} n'existe pas.`, e.line, guess ? `Voulais-tu écrire ${guess} ?` : 'Écris d\'abord la classe : class ' + e.cls + ' { … }');
        }
        if (c.isInterface) throw compileError(`${e.cls} est une interface : on ne peut pas créer d'objet avec new ${e.cls}(…).`, e.line, `Crée plutôt un objet d'une classe qui implémente ${e.cls}.`);
        if (c.abstract) throw compileError(`${e.cls} est une classe abstraite : on ne peut pas créer d'objet avec new ${e.cls}(…).`, e.line, `Crée plutôt un objet d'une de ses sous-classes.`);
        const ts = e.args.map(expr);
        e.ctor = resolveCtor(c, ts, e.line);
        return e.cls;
      }
      case 'Member': {
        // Classe.attributStatic
        if (e.obj.type === 'Ident' && !lookupLocal(e.obj.name) && !findField(ctx.cls.name, e.obj.name) && isClass(e.obj.name)) {
          const f = findField(e.obj.name, e.name);
          if (!f) throw compileError(`La classe ${e.obj.name} n'a pas d'attribut ${e.name}.`, e.line);
          if (!f.static) throw compileError(`${e.name} n'est pas static : il faut un objet (et non la classe ${e.obj.name}) pour y accéder.`, e.line);
          fieldAccessCheck(f, e.line);
          e.field = f;
          e.staticAccess = true;
          return f.type;
        }
        if (e.obj.type === 'Ident' && e.obj.name === 'System' && e.name === 'out') throw compileError('System.out seul ne fait rien : écris System.out.println(…).', e.line);
        if (e.obj.type === 'Ident' && objects[e.obj.name] && !lookupLocal(e.obj.name)) {
          throw compileError(`${e.obj.name}.${e.name} : il manque les parenthèses de la méthode → ${e.obj.name}.${e.name}()`, e.line);
        }
        const t = expr(e.obj);
        if (isList(t)) throw compileError('Pour une ArrayList, la taille s\'obtient avec la méthode size().', e.line, `Écris ${e.obj.type === 'Ident' ? e.obj.name : 'liste'}.size()`);
        if (isArray(t)) {
          if (e.name !== 'length') throw compileError(`Un tableau n'a pas d'attribut ${e.name} : seulement length (sa taille).`, e.line);
          e.isLength = true;
          return 'int';
        }
        if (t === 'String') {
          throw compileError(`Un String n'a pas d'attribut ${e.name}.`, e.line, e.name === 'length' ? 'Pour un String, la longueur s\'obtient avec la méthode length() (avec parenthèses).' : undefined);
        }
        if (!isClass(t)) throw compileError(`Un ${t} n'a pas d'attributs.`, e.line);
        const f = findField(t, e.name);
        if (!f) {
          const guess = closest(e.name, chain(t).flatMap((c) => [...c.fields.keys()]));
          throw compileError(`La classe ${t} n'a pas d'attribut ${e.name}.`, e.line, guess ? `Voulais-tu écrire ${guess} ?` : (methodNames(t).includes(e.name) ? `${e.name} est une méthode : ajoute des parenthèses → ${e.name}()` : undefined));
        }
        fieldAccessCheck(f, e.line);
        e.field = f;
        return f.type;
      }
      case 'Index': {
        const t = expr(e.obj);
        if (isList(t)) throw compileError('Pour une ArrayList, on lit un élément avec get(i), pas avec des crochets [ ].', e.line, `Écris ${e.obj.type === 'Ident' ? e.obj.name : 'liste'}.get(…)`);
        if (!isArray(t)) throw compileError(`On ne peut utiliser [ ] que sur un tableau, or ici c'est un ${t}.`, e.line, t === 'String' ? 'Pour un caractère d\'un String, utilise charAt(indice).' : undefined);
        const it = expr(e.index);
        if (it !== 'int' && it !== 'char') throw compileError(`Le numéro de case doit être un int, pas un ${it}.`, e.line);
        return elemOf(t);
      }
      case 'Assign': {
        const target = lvalue(e.target);
        const t = e.value.type === 'ArrayLit' ? checkArrayLit(e.value, target.type) : expr(e.value);
        if (e.op === '=') {
          const err = assignError(target.type, t);
          if (err) throw compileError(`Impossible de ranger cette valeur dans ${targetName(e.target)} : ${err}`, e.line, assignHint(target.type, t));
          if (target.local) target.local.init = true;
        } else {
          if (target.local && !target.local.init) throw compileError(`La variable ${e.target.name} n'a pas encore reçu de valeur.`, e.line);
          if (e.op === '+=' && target.type === 'String') {
            if (t === 'void') throw compileError('Cette méthode ne renvoie rien (void).', e.line);
          } else if (!isNumeric(target.type) || !isNumeric(t)) {
            throw compileError(`L'opérateur ${e.op} demande des nombres (ici ${target.type} et ${t}).`, e.line);
          }
        }
        e.target.st = target.type;
        return target.type;
      }
      case 'Update': {
        const target = lvalue(e.target);
        if (target.local && !target.local.init) throw compileError(`La variable ${e.target.name} n'a pas encore reçu de valeur.`, e.line);
        if (!isNumeric(target.type)) throw compileError(`${e.op} s'applique seulement à un nombre, pas à un ${target.type}.`, e.line);
        e.target.st = target.type;
        return target.type;
      }
      case 'Unary': {
        const t = expr(e.arg);
        if (e.op === '!') {
          if (t !== 'boolean') throw compileError(`L'opérateur ! (non) s'applique à un boolean, pas à un ${t}.`, e.line);
          return 'boolean';
        }
        if (!isNumeric(t)) throw compileError(`L'opérateur ${e.op} s'applique à un nombre, pas à un ${t}.`, e.line);
        return t === 'double' ? 'double' : 'int';
      }
      case 'Binary': {
        const a = expr(e.left);
        const b = expr(e.right);
        if (a === 'void' || b === 'void') throw compileError('Cette méthode ne renvoie rien (void) : on ne peut pas utiliser son résultat dans un calcul.', e.line,
          'Si elle doit produire une valeur, remplace void par le type de cette valeur et utilise return.');
        const op = e.op;
        const bad = (msg, hint) => compileError(msg ?? `L'opérateur ${op} ne peut pas s'appliquer à un ${a} et un ${b}.`, e.line, hint);
        if (op === '+') {
          if (a === 'String' || b === 'String') return 'String';
          if (isNumeric(a) && isNumeric(b)) return promote(a, b);
          throw bad();
        }
        if (['-', '*', '/', '%'].includes(op)) {
          if (isNumeric(a) && isNumeric(b)) return promote(a, b);
          throw bad(undefined, a === 'String' || b === 'String' ? 'Les calculs se font sur des nombres, pas sur du texte (String).' : undefined);
        }
        if (['<', '>', '<=', '>='].includes(op)) {
          if (isNumeric(a) && isNumeric(b)) return 'boolean';
          throw bad(undefined, a === 'String' && b === 'String' ? 'Pour comparer deux textes, utilise .equals().' : undefined);
        }
        if (op === '==' || op === '!=') {
          if ((isNumeric(a) && isNumeric(b)) || (a === 'boolean' && b === 'boolean')) return 'boolean';
          if (isRef(a) && isRef(b) && (a === 'null' || b === 'null' || a === b || (isClass(a) && isClass(b) && (isSub(a, b) || isSub(b, a))))) {
            e.refCompare = a === 'String' && b === 'String';
            return 'boolean';
          }
          throw bad(`Impossible de comparer un ${a} avec un ${b} : ils n'ont pas le même type.`);
        }
        if (op === '&&' || op === '||') {
          if (a === 'boolean' && b === 'boolean') return 'boolean';
          throw bad(`L'opérateur ${op} relie deux conditions (boolean), mais ici on a un ${a} et un ${b}.`, 'Exemple : x > 0 && x < 10 (et non pas 0 < x < 10).');
        }
        throw bad();
      }
      case 'Cond': {
        requireBoolean(e.test, 'test ? :');
        const a = expr(e.cons);
        const b = expr(e.alt);
        if (a === b) return a;
        if (isNumeric(a) && isNumeric(b)) return promote(a, b);
        if (isRef(a) && b === 'null') return a;
        if (a === 'null' && isRef(b)) return b;
        throw compileError(`Les deux branches de « ? : » doivent avoir le même type (ici ${a} et ${b}).`, e.line);
      }
      case 'Cast': {
        const t = expr(e.expr);
        if (e.to === 'boolean') {
          if (t !== 'boolean') throw compileError(`Impossible de convertir un ${t} en boolean.`, e.line);
          return 'boolean';
        }
        if (!isNumeric(t)) throw compileError(`Impossible de convertir un ${t} en ${e.to}.`, e.line);
        return e.to;
      }
      case 'Call':
        return call(e);
      case 'Super':
        throw compileError('super seul n\'est pas une valeur : écris super.methode().', e.line);
      default:
        throw compileError(`Expression non prise en charge (${e.type}).`, e.line);
    }
  }

  function targetName(t) {
    if (t.type === 'Ident') return t.name;
    if (t.type === 'Member') return t.name;
    return 'cette case';
  }

  function argTypes(e) { return e.args.map(expr); }

  function checkParams(e, label, params, optional = []) {
    const ts = argTypes(e);
    if (ts.length < params.length || ts.length > params.length + optional.length) {
      const sig = [...params, ...optional.map((p) => `[${p}]`)].join(', ');
      throw compileError(`${label} attend ${params.length === 0 && optional.length === 0 ? 'aucun paramètre' : `les paramètres (${sig})`}, mais reçoit ${ts.length} valeur${ts.length > 1 ? 's' : ''}.`, e.line,
        params.length === 0 ? `Écris simplement ${label}().` : undefined);
    }
    const all = [...params, ...optional];
    ts.forEach((t, i) => {
      const err = assignError(all[i], t);
      if (err) throw compileError(`Paramètre n°${i + 1} de ${label} : ${err}`, e.line, assignHint(all[i], t));
    });
    return ts;
  }

  /** Choisit la méthode (ou le constructeur) dont les paramètres acceptent les arguments. */
  function pick(candidates, ts) {
    const ok = candidates.filter((m) => m.params.length === ts.length && m.params.every((p, i) => !assignError(p.type, ts[i])));
    return ok.find((m) => m.params.every((p, i) => p.type === ts[i])) ?? ok[0] ?? null;
  }

  function noMatch(label, candidates, ts, line) {
    const sigs = candidates.map((m) => `${label}(${m.sig})`).join(' ou ');
    return compileError(`${label}(${ts.join(', ')}) : les valeurs données ne correspondent pas aux paramètres.`, line,
      sigs ? `Attendu : ${sigs}.` : undefined);
  }

  function resolveCtor(c, ts, line) {
    if (c.ctors.length === 0) {
      if (ts.length) throw compileError(`La classe ${c.name} n'a pas de constructeur avec paramètres : écris new ${c.name}() ou ajoute un constructeur ${c.name}(…).`, line);
      return null;
    }
    const k = pick(c.ctors, ts);
    if (!k) throw noMatch(`new ${c.name}`, c.ctors, ts, line);
    if (k.private && ctx.cls.name !== c.name) throw compileError(`Le constructeur de ${c.name} est private.`, line);
    return k;
  }

  function checkSuperCall(args, line, node) {
    const parent = ctx.cls.superName ? classes.get(ctx.cls.superName) : null;
    if (!parent) throw compileError(`super(…) : la classe ${ctx.cls.name} n'hérite d'aucune classe (extends).`, line);
    const ts = args.map(expr);
    node.ctor = resolveCtor(parent, ts, line);
    node.parent = parent.name;
  }

  function call(e) {
    const o = e.obj;

    // System.out.println / print
    if (o && o.type === 'Member' && o.obj.type === 'Ident' && o.obj.name === 'System' && !lookupLocal('System')) {
      if (o.name !== 'out') throw compileError(`System.${o.name} n'existe pas ici. Tu voulais sans doute System.out ?`, e.line);
      if (!['println', 'print', 'printf'].includes(e.name)) throw compileError(`System.out.${e.name}() n'existe pas.`, e.line, `Voulais-tu écrire ${closest(e.name, ['println', 'print']) || 'println'} ?`);
      if (e.name === 'printf') throw compileError('printf n\'est pas encore au programme : utilise println.', e.line);
      const ts = argTypes(e);
      if (ts.length > 1) throw compileError(`System.out.${e.name} affiche une seule valeur à la fois.`, e.line, 'Pour afficher plusieurs valeurs, colle-les avec + : "x = " + x');
      if (e.name === 'print' && ts.length === 0) throw compileError('System.out.print a besoin d\'une valeur à afficher.', e.line);
      if (ts[0] === 'void') throw compileError('Cette méthode ne renvoie rien (void) : il n\'y a rien à afficher.', e.line,
        'Si elle doit produire une valeur, remplace void par son type et utilise return.');
      e.kind = 'print';
      return 'void';
    }
    if (o && o.type === 'Member' && o.obj.type === 'Ident' && !lookupLocal(o.obj.name) && !objects[o.obj.name] && o.obj.name !== 'System' && !findField(ctx.cls.name, o.obj.name) && !isClass(o.obj.name)) {
      throw unknownSymbol(o.obj.name, e.line);
    }

    // Integer.parseInt / Double.parseDouble : lire un nombre écrit dans un texte
    if (o && o.type === 'Ident' && (o.name === 'Integer' || o.name === 'Double') && !lookupLocal(o.name)) {
      const want = o.name === 'Integer' ? 'parseInt' : 'parseDouble';
      if (e.name !== want) throw compileError(`${o.name}.${e.name}() n'est pas disponible.`, e.line, `Pour lire un nombre écrit dans un texte : ${o.name}.${want}(texte)`);
      checkParams(e, `${o.name}.${want}`, ['String']);
      e.kind = 'parse';
      return o.name === 'Integer' ? 'int' : 'double';
    }

    // Math.xxx
    if (o && o.type === 'Ident' && o.name === 'Math' && !lookupLocal('Math')) {
      const m = MATH_METHODS[e.name];
      if (!m) throw compileError(`Math.${e.name}() n'existe pas (ou n'est pas encore disponible).`, e.line, `Disponibles : ${Object.keys(MATH_METHODS).map((k) => `Math.${k}`).join(', ')}.`);
      const ts = argTypes(e);
      if (ts.length !== m.arity) throw compileError(`Math.${e.name} attend ${m.arity} paramètre${m.arity > 1 ? 's' : ''}.`, e.line);
      ts.forEach((t) => { if (!isNumeric(t)) throw compileError(`Math.${e.name} travaille sur des nombres, pas sur un ${t}.`, e.line); });
      e.kind = 'math';
      return m.ret(ts);
    }

    // Objets du niveau : robot, coffre…
    if (o && o.type === 'Ident' && objects[o.name] && !lookupLocal(o.name)) {
      const obj = objects[o.name];
      const m = obj.methods[e.name];
      if (!m) {
        const guess = closest(e.name, Object.keys(obj.methods));
        throw compileError(`L'objet ${o.name} n'a pas de méthode ${e.name}().`, e.line,
          guess ? `Voulais-tu écrire ${o.name}.${guess}() ?` : `Méthodes de ${o.name} : ${Object.keys(obj.methods).map((k) => `${k}()`).join(', ')}.`);
      }
      e.argTypes = checkParams(e, `${o.name}.${e.name}`, m.params);
      e.kind = 'api';
      return m.ret;
    }

    // Méthodes de tes classes
    let clsName;
    let mode;
    if (!o) { clsName = ctx.cls.name; mode = 'implicit'; }
    else if (o.type === 'This') { expr(o); clsName = ctx.cls.name; mode = 'this'; }
    else if (o.type === 'Super') {
      if (ctx.isStatic) throw compileError('super n\'existe pas dans une méthode static.', e.line);
      clsName = ctx.cls.superName;
      if (!clsName) throw compileError(`super : la classe ${ctx.cls.name} n'hérite d'aucune classe.`, e.line);
      mode = 'super';
    } else if (o.type === 'Ident' && !lookupLocal(o.name) && !findField(ctx.cls.name, o.name) && isClass(o.name)) {
      clsName = o.name; mode = 'static';
    }

    if (clsName) {
      const ts = argTypes(e);
      const candidates = allMethods(clsName, e.name);
      if (!candidates.length) {
        if (mode === 'implicit') {
          const guess = closest(e.name, [...methodNames(clsName), 'println']);
          throw compileError(`Méthode ${e.name}() introuvable.`, e.line,
            guess === 'println' ? 'Pour afficher, écris System.out.println(…).' : guess ? `Voulais-tu écrire ${guess}() ?` : `Écris-la dans la classe : static void ${e.name}() { … }`);
        }
        const guess = closest(e.name, methodNames(clsName));
        throw compileError(`La classe ${clsName} n'a pas de méthode ${e.name}().`, e.line, guess ? `Voulais-tu écrire ${guess}() ?` : undefined);
      }
      const m = pick(candidates, ts);
      if (!m) throw noMatch(e.name, candidates, ts, e.line);
      if (m.private && m.owner !== ctx.cls.name) throw compileError(`La méthode ${e.name} est private dans ${m.owner}.`, e.line);
      if (mode === 'static' && !m.static) throw compileError(`${e.name}() n'est pas static : il faut l'appeler sur un objet, pas sur la classe ${clsName}.`, e.line);
      if ((mode === 'implicit') && !m.static && ctx.isStatic) {
        throw compileError(`La méthode ${e.name}() n'est pas static : on ne peut pas l'appeler directement depuis une méthode static comme main.`, e.line,
          `Ajoute static à sa déclaration : static ${m.ret} ${e.name}(…)`);
      }
      e.kind = 'method';
      e.method = m;
      e.mode = m.static ? 'static' : mode;
      return m.ret;
    }

    // Appel sur une valeur : String, objet
    const t = expr(o);
    if (t === 'String') {
      const m = STRING_METHODS[e.name];
      if (!m) {
        const guess = closest(e.name, Object.keys(STRING_METHODS));
        throw compileError(`Un String n'a pas de méthode ${e.name}().`, e.line, guess ? `Voulais-tu écrire ${guess}() ?` : undefined);
      }
      // indexOf accepte aussi un caractère : mot.indexOf('A')
      if (e.name === 'indexOf' && e.args.length === 1 && expr(e.args[0]) === 'char') {
        e.kind = 'string';
        e.charArg = true;
        return 'int';
      }
      checkParams(e, e.name, m.params, m.optional);
      e.kind = 'string';
      return m.ret;
    }
    if (isList(t)) {
      const E = listElem(t);
      const make = LIST_METHODS[e.name];
      if (!make) {
        const guess = closest(e.name, Object.keys(LIST_METHODS));
        throw compileError(`Une ArrayList n'a pas de méthode ${e.name}().`, e.line, guess ? `Voulais-tu écrire ${guess}() ?` : `Méthodes utiles : add, get, set, remove, size, isEmpty, contains.`);
      }
      const ts = argTypes(e);
      const variant = make(E).find((v) => v.params.length === ts.length && v.params.every((p, i) => !assignError(p, ts[i])));
      if (!variant) {
        const sigs = make(E).map((v) => `${e.name}(${v.params.join(', ')})`).join(' ou ');
        throw compileError(`${e.name}(${ts.join(', ')}) : les valeurs ne correspondent pas à cette liste de ${E}.`, e.line, `Attendu : ${sigs}.`);
      }
      e.kind = 'list';
      e.listElem = E;
      e.paramTypes = variant.params;
      return variant.ret;
    }
    if (isArray(t)) {
      if (e.name === 'length') throw compileError('Pour un tableau, la taille s\'écrit sans parenthèses : tableau.length', e.line, 'length() avec parenthèses, c\'est pour les String.');
      throw compileError(`Un tableau n'a pas de méthode ${e.name}().`, e.line);
    }
    if (isClass(t)) {
      const ts = argTypes(e);
      const candidates = allMethods(t, e.name);
      if (!candidates.length) {
        if (e.name === 'toString' && ts.length === 0) { e.kind = 'toString'; return 'String'; }
        const guess = closest(e.name, methodNames(t));
        throw compileError(`La classe ${t} n'a pas de méthode ${e.name}().`, e.line,
          guess ? `Voulais-tu écrire ${guess}() ?` : findField(t, e.name) ? `${e.name} est un attribut : écris-le sans parenthèses.` : `Ajoute-la dans la classe ${t}.`);
      }
      const m = pick(candidates, ts);
      if (!m) throw noMatch(e.name, candidates, ts, e.line);
      if (m.private && m.owner !== ctx.cls.name) throw compileError(`La méthode ${e.name} est private dans ${m.owner} : on ne peut pas l'appeler depuis ${ctx.cls.name}.`, e.line);
      e.kind = 'method';
      e.method = m;
      e.mode = m.static ? 'static' : 'object';
      return m.ret;
    }
    throw compileError(`Un ${t} n'a pas de méthodes : seuls les objets en ont.`, e.line);
  }

  // ---------- Vérification de chaque classe ----------
  function inMethod(cls, opts, fn) {
    const saved = [ctx, scopes];
    ctx = { cls, loopDepth: 0, ...opts };
    scopes = [new Map()];
    try { fn(); } finally { [ctx, scopes] = saved; }
  }

  for (const c of classes.values()) {
    const parent = c.superName ? classes.get(c.superName) : null;

    for (const f of c.fields.values()) {
      if (!f.node.init) continue;
      inMethod(c, { isStatic: f.static, ret: 'void' }, () => {
        f.node.init.st = checkInit(f.type, f.node.init, f.name, f.line);
      });
    }

    // Pas de constructeur : celui « par défaut » doit pouvoir appeler super()
    if (!c.ctors.length && parent && parent.ctors.length && !parent.ctors.some((k) => k.params.length === 0)) {
      throw compileError(`La classe ${c.name} a besoin d'un constructeur : ${parent.name} n'a pas de constructeur sans paramètre.`, c.node.line,
        `Ajoute par exemple : ${c.name}(…) { super(…); }`);
    }

    for (const k of c.ctors) {
      inMethod(c, { isStatic: false, isCtor: true, ret: 'void', method: k, body: k.node.body }, () => {
        k.params.forEach((p) => declare(p.name, { type: p.type, init: true }, p.line));
        const first = k.node.body.body[0];
        if (parent && first?.type !== 'SuperCall' && parent.ctors.length && !parent.ctors.some((x) => x.params.length === 0)) {
          throw compileError(`Le constructeur de ${c.name} doit commencer par super(…) : ${parent.name} n'a pas de constructeur sans paramètre.`, k.line,
            `Première ligne du constructeur : super(${parent.ctors[0].params.map((p) => p.name).join(', ')});`);
        }
        stmt(k.node.body);
      });
    }

    for (const m of c.methods) {
      if (!m.node.body) continue;
      inMethod(c, { isStatic: m.static, ret: m.ret, method: m, body: m.node.body }, () => {
        m.params.forEach((p) => declare(p.name, { type: p.type, init: true }, p.line));
        stmt(m.node.body);
        if (m.ret !== 'void' && !alwaysReturns(m.node.body)) {
          throw compileError(`Il manque un return : la méthode ${m.name} doit renvoyer un ${m.ret} dans tous les cas.`, m.node.body.endLine ?? m.line,
            'Ajoute return valeur; à la fin de la méthode (ou dans chaque branche du if / else).');
        }
      });
    }
  }

  return program;
}
