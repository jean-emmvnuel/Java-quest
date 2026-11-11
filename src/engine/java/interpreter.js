import { runtimeError, JavaError } from './errors.js';
import { toJavaString, literal } from './format.js';
import { isArray, elemOf, isList, listElem } from './checker.js';

// Exécution du programme vérifié, avec enregistrement d'une trace : à chaque étape on garde
// la ligne exécutée, une explication en français, la mémoire (variables de chaque méthode,
// tableaux, objets), la console et l'état du monde. L'interface rejoue ensuite cette trace.

export const MAX_STEPS = 3000;
const MAX_DEPTH = 120;

class BreakSignal {}
class ContinueSignal {}
class ReturnSignal { constructor(value) { this.value = value; } }
class StepLimit extends Error {}

const INT_MIN = -2147483648;
const INT_MAX = 2147483647;
const toInt = (v) => {
  if (Number.isNaN(v)) return 0;
  if (v >= INT_MAX) return INT_MAX;
  if (v <= INT_MIN) return INT_MIN;
  return Math.trunc(v) | 0;
};

function coerce(type, v, srcType) {
  if (v?.kind === 'list' && v.elem === '?' && isList(type)) { v.type = type; v.elem = listElem(type); }
  if (type === 'int') return srcType === 'double' ? toInt(v) : v | 0;
  if (type === 'char') return (srcType === 'double' ? toInt(v) : v) & 0xffff;
  if (type === 'double') return Number(v);
  return v;
}

const defaultValue = (type) => {
  if (type === 'int' || type === 'double' || type === 'char') return 0;
  if (type === 'boolean') return false;
  return null;
};

const isRefValue = (v) => v !== null && typeof v === 'object';

/** Valeur courte pour les explications et la mémoire. */
export function fmt(type, v) {
  if (v === undefined) return '?';
  if (v === null) return 'null';
  if (v?.kind === 'array') return `tableau ${v.type.replace('[]', `[${v.items.length}]`)}`;
  if (v?.kind === 'list') return `liste de ${v.items.length} élément${v.items.length > 1 ? 's' : ''}`;
  if (v?.kind === 'object') return `${v.cls} n°${v.id}`;
  return literal(type, v);
}

const PREC = { '||': 1, '&&': 2, '==': 3, '!=': 3, '<': 4, '>': 4, '<=': 4, '>=': 4, '+': 5, '-': 5, '*': 6, '/': 6, '%': 6 };

/** Réécrit une expression en texte. Si `vals` est fourni, remplace variables et appels par leur valeur. */
export function show(e, vals) {
  const sub = (x) => show(x, vals);
  const known = vals && vals.has(e);
  switch (e.type) {
    case 'Lit': return e.vt === 'int' || e.vt === 'double' ? (e.text ?? String(e.value)) : literal(e.vt, e.value);
    case 'Ident': return known ? fmt(e.st, vals.get(e)) : e.name;
    case 'This': return 'this';
    case 'Paren': return `(${sub(e.expr)})`;
    case 'Binary': {
      const wrap = (c, right) => {
        const s = sub(c);
        if (c.type === 'Binary' && (PREC[c.op] < PREC[e.op] || (right && PREC[c.op] === PREC[e.op]))) return `(${s})`;
        if (c.type === 'Cond' || c.type === 'Assign') return `(${s})`;
        return s;
      };
      return `${wrap(e.left, false)} ${e.op} ${wrap(e.right, true)}`;
    }
    case 'Unary': return `${e.op}${sub(e.arg)}`;
    case 'Cast': return `(${e.to}) ${sub(e.expr)}`;
    case 'Cond': return `${sub(e.test)} ? ${sub(e.cons)} : ${sub(e.alt)}`;
    case 'Update': return known ? fmt(e.st, vals.get(e)) : (e.prefix ? `${e.op}${show(e.target)}` : `${show(e.target)}${e.op}`);
    case 'Assign': return known ? fmt(e.st, vals.get(e)) : `${show(e.target)} ${e.op} ${show(e.value)}`;
    case 'Member': return known && !e.isLength ? fmt(e.st, vals.get(e)) : known ? String(vals.get(e)) : `${show(e.obj)}.${e.name}`;
    case 'Index': return known ? fmt(e.st, vals.get(e)) : `${show(e.obj)}[${show(e.index)}]`;
    case 'ArrayLit': return `{${e.items.map((x) => show(x)).join(', ')}}`;
    case 'NewArray': return `new ${e.elemType}[${show(e.size)}]`;
    case 'New': return `new ${e.cls}(${e.args.map((a) => show(a)).join(', ')})`;
    case 'Super': return 'super';
    case 'Call': {
      if (known && e.st !== 'void') return fmt(e.st, vals.get(e));
      return `${e.obj ? `${show(e.obj)}.` : ''}${e.name}(${e.args.map((a) => show(a)).join(', ')})`;
    }
    default: return '…';
  }
}

/**
 * @param {object} program programme vérifié (avec program.main et program.classInfo)
 * @param {object} options
 * @param {object} options.world état initial du monde (sera copié)
 * @param {Record<string, Record<string, Function>>} options.api implémentations des méthodes des objets du monde
 */
export function execute(program, { world, api = {} }) {
  const classes = program.classInfo;
  const steps = [];
  const frames = [];
  const statics = new Map();
  let out = '';
  let changed = new Set();
  let vals = new Map();
  let event = null;
  let heapId = 0;
  const state = structuredClone(world);

  const frame = () => frames[frames.length - 1];

  // ---------- Mémoire (instantané pour l'interface) ----------
  function viewValue(type, v) {
    if (isRefValue(v) && (v.kind === 'array' || v.kind === 'list')) {
      const el = v.kind === 'list' ? v.elem : elemOf(v.type);
      return {
        value: `${v.items.length} case${v.items.length > 1 ? 's' : ''}`,
        array: v.items.map((it, i) => ({ value: fmt(el, it), changed: changed.has(`${v.id}:${i}`) })),
      };
    }
    if (isRefValue(v) && v.kind === 'object') {
      return {
        value: `${v.cls} n°${v.id}`,
        object: {
          cls: v.cls,
          id: v.id,
          fields: Object.entries(v.fields).map(([name, fv]) => {
            const field = { name, type: v.types[name], value: fmt(v.types[name], fv), changed: changed.has(`${v.id}:${name}`) };
            // un tableau ou une liste rangé dans un attribut s'affiche aussi en cases
            if (isRefValue(fv) && (fv.kind === 'array' || fv.kind === 'list')) {
              const el = fv.kind === 'list' ? fv.elem : elemOf(fv.type);
              field.array = fv.items.map((it, i) => ({ value: fmt(el, it), changed: changed.has(`${fv.id}:${i}`) }));
              if (changed.has(`${fv.id}:removed`) || field.array.some((c) => c.changed)) field.changed = true;
            }
            return field;
          }),
        },
      };
    }
    return { value: v === undefined ? null : fmt(type, v) };
  }

  function snapshotVars() {
    const list = [];
    frames.forEach((f, fi) => {
      if (f.self) list.push({ name: 'this', type: f.self.cls, depth: 0, frame: fi, changed: false, ...viewValue(f.self.cls, f.self) });
      f.scopes.forEach((s, depth) => {
        for (const [name, v] of s) {
          list.push({ name, type: v.type, depth, frame: fi, changed: changed.has(`${fi}:${name}`), ...viewValue(v.type, v.value) });
        }
      });
    });
    for (const [cls, fields] of statics) {
      for (const [name, v] of Object.entries(fields)) {
        list.push({ name: `${cls}.${name}`, type: v.type, depth: 0, frame: -1, changed: changed.has(`static:${cls}.${name}`), ...viewValue(v.type, v.value) });
      }
    }
    return list;
  }

  const snapshotFrames = () => frames.map((f) => ({ name: f.label }));

  function record(line, desc, kind = 'stmt') {
    steps.push({ line, desc, kind, vars: snapshotVars(), frames: snapshotFrames(), out, world: structuredClone(state), event });
    changed = new Set();
    event = null;
    if (steps.length > MAX_STEPS) throw new StepLimit();
  }

  function guard(fn, cleanup) {
    try {
      return fn();
    } catch (err) {
      if (err instanceof JavaError && !err.vars) { err.vars = snapshotVars(); err.frames = snapshotFrames(); }
      throw err;
    } finally {
      cleanup();
    }
  }

  const withScope = (fn) => {
    frame().scopes.push(new Map());
    return guard(fn, () => frame().scopes.pop());
  };

  const lookupLocal = (name) => {
    const { scopes } = frame();
    for (let i = scopes.length - 1; i >= 0; i--) if (scopes[i].has(name)) return scopes[i].get(name);
    return null;
  };
  const declare = (name, type, value) => {
    const f = frame();
    f.scopes[f.scopes.length - 1].set(name, { type, value });
    changed.add(`${frames.length - 1}:${name}`);
  };

  function explain(e, v) {
    const src = show(e);
    const subst = show(e, vals);
    const res = fmt(e.st, v);
    const parts = [src];
    if (subst !== src && subst !== res) parts.push(subst);
    if (res !== src) parts.push(res);
    return parts.map((p) => `\`${p}\``).join(' → ');
  }

  // ---------- Objets et tableaux ----------
  const nullError = (what, line) => runtimeError(`NullPointerException : ${what} vaut null, il n'y a pas d'objet.`, line,
    'Crée d\'abord l\'objet avec new avant de l\'utiliser.');

  function newArray(type, items) {
    return { kind: 'array', type, items, id: ++heapId };
  }

  function newList(type) {
    return { kind: 'list', type: isList(type) ? type : 'ArrayList<?>', elem: isList(type) ? listElem(type) : '?', items: [], id: ++heapId };
  }

  const sameValue = (a, b) => a === b;

  function listCall(e) {
    const list = evalExpr(e.obj);
    if (list === null) throw nullError(show(e.obj), e.line);
    const args = e.args.map(evalExpr).map((v, i) => coerce(e.paramTypes[i], v, e.args[i].st));
    // La liste créée avec new ArrayList<>() prend son vrai type à la première utilisation
    if (list.elem === '?' && isList(e.obj.st)) { list.type = e.obj.st; list.elem = listElem(e.obj.st); }
    const n = list.items.length;
    const bounds = (i, max) => {
      if (i < 0 || i >= max) {
        throw runtimeError(`IndexOutOfBoundsException : il n'y a pas d'élément n°${i}. La liste contient ${n} élément${n > 1 ? 's' : ''}${n ? ` (de 0 à ${n - 1})` : ''}.`, e.line,
          n ? 'Le premier élément est le n°0 et le dernier le n°size() - 1.' : 'La liste est vide : ajoute des éléments avec add(…) avant de les lire.');
      }
    };
    switch (e.name) {
      case 'add':
        if (args.length === 2) {
          bounds(args[0], n + 1);
          list.items.splice(args[0], 0, args[1]);
          changed.add(`${list.id}:${args[0]}`);
        } else {
          list.items.push(args[0]);
          changed.add(`${list.id}:${n}`);
        }
        return undefined;
      case 'get': bounds(args[0], n); return list.items[args[0]];
      case 'set': bounds(args[0], n); list.items[args[0]] = args[1]; changed.add(`${list.id}:${args[0]}`); return undefined;
      case 'remove': { bounds(args[0], n); const [old] = list.items.splice(args[0], 1); changed.add(`${list.id}:removed`); return old; }
      case 'size': return n;
      case 'isEmpty': return n === 0;
      case 'contains': return list.items.some((x) => sameValue(x, args[0]));
      case 'indexOf': return list.items.findIndex((x) => sameValue(x, args[0]));
      case 'clear': list.items = []; changed.add(`${list.id}:removed`); return undefined;
      default: return undefined;
    }
  }

  function makeArray(type, size, line) {
    if (size < 0) throw runtimeError(`NegativeArraySizeException : un tableau ne peut pas avoir ${size} cases.`, line);
    if (size > 10000) throw runtimeError('Tableau trop grand pour Java Quest (10 000 cases au maximum).', line);
    return newArray(type, Array.from({ length: size }, () => defaultValue(elemOf(type))));
  }

  function checkIndex(arr, i, line) {
    if (i < 0 || i >= arr.items.length) {
      throw runtimeError(`ArrayIndexOutOfBoundsException : la case ${i} n'existe pas. Le tableau a ${arr.items.length} case${arr.items.length > 1 ? 's' : ''} (indices de 0 à ${arr.items.length - 1}).`, line,
        'La première case est la n°0 et la dernière la n°length - 1. Dans une boucle, utilise i < tableau.length (et non <=).');
    }
  }

  const findMethodRuntime = (clsName, name, sig) => {
    let c = classes.get(clsName);
    while (c) {
      const m = c.methods.find((x) => x.name === name && x.sig === sig && !x.abstract);
      if (m) return m;
      c = c.superName ? classes.get(c.superName) : null;
    }
    return null;
  };

  function hashOf(id) { return (0x1b6d3586 + id * 7919).toString(16); }

  /** Texte d'une valeur, comme le produit Java (println, concaténation). */
  function toStr(type, v, line) {
    if (v === null || v === undefined) return 'null';
    if (v?.kind === 'object') {
      const m = findMethodRuntime(v.cls, 'toString', '');
      if (m && m.ret === 'String') return invoke(m, v, [], { line, label: 'toString()' });
      return `${v.cls}@${hashOf(v.id)}`;
    }
    if (v?.kind === 'list') {
      return `[${v.items.map((it) => toStr(v.elem, it, line)).join(', ')}]`;
    }
    if (v?.kind === 'array') {
      const code = { int: 'I', double: 'D', boolean: 'Z', char: 'C' }[elemOf(v.type)] ?? `L${elemOf(v.type)};`;
      return `[${code}@${hashOf(v.id)}`;
    }
    return toJavaString(type, v);
  }

  // ---------- Expressions ----------
  function evalExpr(e) {
    const v = evalInner(e);
    vals.set(e, v);
    return v;
  }

  function readIdent(e) {
    if (e.ref.kind === 'local') {
      const v = lookupLocal(e.name);
      if (v.value === undefined) throw runtimeError(`La variable ${e.name} est lue avant d'avoir reçu une valeur.`, e.line, 'Assure-toi qu\'elle reçoit une valeur dans tous les cas (par exemple dans le if ET dans le else).');
      return v.value;
    }
    const f = e.ref.field;
    if (f.static) return statics.get(f.owner)[f.name].value;
    return frame().self.fields[f.name];
  }

  /** Lit puis écrit une cible (variable, attribut, case de tableau). */
  function locate(t) {
    if (t.type === 'Ident') {
      if (t.ref.kind === 'local') {
        const v = lookupLocal(t.name);
        return { get: () => v.value, set: (x) => { v.value = x; changed.add(`${frames.length - 1}:${t.name}`); }, type: v.type };
      }
      const f = t.ref.field;
      if (f.static) {
        const slot = statics.get(f.owner)[f.name];
        return { get: () => slot.value, set: (x) => { slot.value = x; changed.add(`static:${f.owner}.${f.name}`); }, type: f.type };
      }
      const self = frame().self;
      return { get: () => self.fields[f.name], set: (x) => { self.fields[f.name] = x; changed.add(`${self.id}:${f.name}`); }, type: f.type };
    }
    if (t.type === 'Member') {
      if (t.staticAccess) {
        const slot = statics.get(t.field.owner)[t.name];
        return { get: () => slot.value, set: (x) => { slot.value = x; changed.add(`static:${t.field.owner}.${t.name}`); }, type: t.field.type };
      }
      const obj = evalExpr(t.obj);
      if (obj === null) throw nullError(show(t.obj), t.line);
      return { get: () => obj.fields[t.name], set: (x) => { obj.fields[t.name] = x; changed.add(`${obj.id}:${t.name}`); }, type: t.field.type };
    }
    // Index
    const arr = evalExpr(t.obj);
    if (arr === null) throw nullError(show(t.obj), t.line);
    const i = evalExpr(t.index);
    checkIndex(arr, i, t.line);
    return { get: () => arr.items[i], set: (x) => { arr.items[i] = x; changed.add(`${arr.id}:${i}`); }, type: elemOf(arr.type) };
  }

  function evalInner(e) {
    switch (e.type) {
      case 'Lit': return e.value;
      case 'Paren': return evalExpr(e.expr);
      case 'This': return frame().self;
      case 'Ident': return readIdent(e);
      case 'Member': {
        if (e.staticAccess) return statics.get(e.field.owner)[e.name].value;
        const obj = evalExpr(e.obj);
        if (obj === null) throw nullError(show(e.obj), e.line);
        if (e.isLength) return obj.items.length;
        return obj.fields[e.name];
      }
      case 'Index': {
        const arr = evalExpr(e.obj);
        if (arr === null) throw nullError(show(e.obj), e.line);
        const i = evalExpr(e.index);
        checkIndex(arr, i, e.line);
        return arr.items[i];
      }
      case 'ArrayLit': return arrayLit(e, e.arrayType);
      case 'NewArray': return makeArray(e.arrayType, evalExpr(e.size), e.line);
      case 'New':
        if (e.st && isList(e.st) || e.st === 'ArrayList<?>') return newList(e.st);
        return construct(e);
      case 'Assign': return assign(e);
      case 'Update': {
        const loc = locate(e.target);
        const old = loc.get();
        const next = coerce(loc.type, old + (e.op === '++' ? 1 : -1), loc.type === 'double' ? 'double' : 'int');
        loc.set(next);
        e.lastOld = old;
        e.lastNew = next;
        return e.prefix ? next : old;
      }
      case 'Unary': {
        const a = evalExpr(e.arg);
        if (e.op === '!') return !a;
        if (e.op === '+') return a;
        return e.st === 'int' ? (-a) | 0 : -a;
      }
      case 'Cast': return coerce(e.to, evalExpr(e.expr), e.expr.st);
      case 'Cond': return evalExpr(e.test) ? evalExpr(e.cons) : evalExpr(e.alt);
      case 'Binary': return binary(e);
      case 'Call': return call(e);
      default: throw runtimeError(`Expression inconnue ${e.type}`, e.line);
    }
  }

  function arrayLit(e, type) {
    const el = elemOf(type);
    return newArray(type, e.items.map((it) => (it.type === 'ArrayLit' ? arrayLit(it, el) : coerce(el, evalExpr(it), it.st))));
  }

  function arith(op, a, b, type, line) {
    if (type === 'int') {
      switch (op) {
        case '+': return (a + b) | 0;
        case '-': return (a - b) | 0;
        case '*': return Math.imul(a, b);
        case '/':
          if (b === 0) throw runtimeError('ArithmeticException : division par zéro.', line, 'Diviser un entier par 0 est impossible : vérifie la valeur du diviseur.');
          return Math.trunc(a / b) | 0;
        case '%':
          if (b === 0) throw runtimeError('ArithmeticException : modulo par zéro.', line);
          return a % b | 0;
        default: break;
      }
    }
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return a / b;
      case '%': return a % b;
      default: throw runtimeError(`Opérateur inconnu ${op}`, line);
    }
  }

  function binary(e) {
    const { op } = e;
    if (op === '&&') return evalExpr(e.left) && evalExpr(e.right);
    if (op === '||') return evalExpr(e.left) || evalExpr(e.right);
    const a = evalExpr(e.left);
    const b = evalExpr(e.right);
    if (op === '+' && e.st === 'String') return toStr(e.left.st, a, e.line) + toStr(e.right.st, b, e.line);
    switch (op) {
      case '==': return a === b;
      case '!=': return a !== b;
      case '<': return a < b;
      case '>': return a > b;
      case '<=': return a <= b;
      case '>=': return a >= b;
      default: return arith(op, a, b, e.st, e.line);
    }
  }

  function assign(e) {
    const loc = locate(e.target);
    const old = loc.get();
    const rhs = e.value.type === 'ArrayLit' ? arrayLit(e.value, loc.type) : evalExpr(e.value);
    vals.set(e.value, rhs);
    let next;
    if (e.op === '=') next = coerce(loc.type, rhs, e.value.st);
    else if (loc.type === 'String') next = toStr('String', old, e.line) + toStr(e.value.st, rhs, e.line);
    else {
      const t = loc.type === 'double' || e.value.st === 'double' ? 'double' : 'int';
      next = coerce(loc.type, arith(e.op[0], old, rhs, t, e.line), t);
    }
    loc.set(next);
    e.lastOld = old;
    e.lastNew = next;
    return next;
  }

  function call(e) {
    switch (e.kind) {
      case 'print': {
        const args = e.args.map(evalExpr);
        const text = args.length ? toStr(e.args[0].st, args[0], e.line) : '';
        out += e.name === 'println' ? `${text}\n` : text;
        if (out.length > 20000) throw runtimeError('Trop de texte affiché dans la console.', e.line);
        return undefined;
      }
      case 'math': return mathCall(e.name, e.args.map(evalExpr), e);
      case 'parse': {
        const text = evalExpr(e.args[0]);
        if (text === null) throw nullError(show(e.args[0]), e.line);
        const t = e.name === 'parseInt' ? text : text.trim();
        const ok = e.name === 'parseInt' ? /^[+-]?\d+$/.test(t) && Math.abs(Number(t)) <= 2147483647 : t !== '' && !Number.isNaN(Number(t));
        if (!ok) {
          throw runtimeError(`NumberFormatException : le texte "${text}" ne contient pas un nombre valide.`, e.line,
            e.name === 'parseInt' ? 'parseInt attend un entier écrit en chiffres, sans espace ni virgule : "42".' : 'parseDouble attend un nombre avec un point pour les décimales : "12.5".');
        }
        return e.name === 'parseInt' ? Number(t) | 0 : Number(t);
      }
      case 'string': return stringCall(e);
      case 'list': return listCall(e);
      case 'api': {
        const args = e.args.map(evalExpr);
        const impl = api[e.obj.name]?.[e.name];
        const res = impl(state, args, e.argTypes) || {};
        if (res.event) event = res.event;
        e.apiDesc = res.desc;
        if (res.crash) throw runtimeError(res.crash, e.line, res.hint);
        if (isArray(e.st) && Array.isArray(res.value)) return newArray(e.st, [...res.value]);
        return res.value;
      }
      case 'toString': {
        const obj = evalExpr(e.obj);
        if (obj === null) throw nullError(show(e.obj), e.line);
        return toStr(e.obj.st, obj, e.line);
      }
      case 'method': {
        let self = null;
        let m = e.method;
        if (!m.static) {
          if (e.mode === 'object') {
            self = evalExpr(e.obj);
            if (self === null) throw nullError(show(e.obj), e.line);
          } else {
            self = frame().self;
          }
          // Polymorphisme : on exécute la version de la classe réelle de l'objet
          if (e.mode !== 'super') m = findMethodRuntime(self.cls, m.name, m.sig) ?? m;
        }
        const args = e.args.map(evalExpr).map((v, i) => coerce(m.params[i].type, v, e.args[i].st));
        return invoke(m, self, args, e);
      }
      default: throw runtimeError(`Méthode inconnue ${e.name}`, e.line);
    }
  }

  function callLabel(m, args) {
    return `${m.name}(${args.map((a, i) => fmt(m.params[i].type, a)).join(', ')})`;
  }

  /** Appelle une méthode : nouveau cadre dans la pile, paramètres, corps, valeur de retour. */
  function invoke(m, self, args, e) {
    if (frames.length >= MAX_DEPTH) {
      throw runtimeError('StackOverflowError : trop d\'appels imbriqués. La méthode s\'appelle elle-même sans jamais s\'arrêter ?', e.line,
        'Une méthode récursive a besoin d\'un cas d\'arrêt (un if qui fait return sans se rappeler).');
    }
    const label = callLabel(m, args);
    const caller = frame()?.label ?? 'main';
    const savedVals = vals;
    const who = self && m.owner !== self.cls ? ` (version de ${m.owner})` : '';
    const poly = self && e.mode !== 'super' && e.method && e.method.owner !== m.owner ? ` C'est la version de ${m.owner} qui s'exécute, car l'objet est un ${self.cls}.` : '';
    record(e.line, `Appel de \`${self ? `${self.cls} n°${self.id}.` : ''}${label}\`${who} : Java met ${caller} en pause et part exécuter la méthode.${poly}`, 'call');
    frames.push({ label: m.name, self: m.static ? null : self, scopes: [new Map()], cls: m.owner });
    let result;
    guard(() => {
      m.params.forEach((p, i) => declare(p.name, p.type, args[i]));
      const ps = m.params.map((p, i) => `${p.name} = ${fmt(p.type, args[i])}`).join(', ');
      record(m.line, `On entre dans \`${m.name}\`${ps ? ` : ${m.params.length > 1 ? 'les paramètres reçoivent' : 'le paramètre reçoit'} ${ps}` : ''}.`, 'enter');
      try {
        execBlockBody(m.node.body);
        result = undefined;
      } catch (sig) {
        if (!(sig instanceof ReturnSignal)) throw sig;
        result = sig.value === undefined ? undefined : coerce(m.ret, sig.value, sig.type);
      }
    }, () => frames.pop());
    vals = savedVals;
    if (m.ret === 'void') record(e.line, `Fin de \`${m.name}\` : on revient dans ${caller}, là où on s'était arrêté.`, 'return');
    else record(e.line, `\`${m.name}\` renvoie \`${fmt(m.ret, result)}\` : on revient dans ${caller} avec cette valeur.`, 'return');
    return result;
  }

  // ---------- Création d'objets ----------
  function fieldsOf(clsName) {
    const chain = [];
    let c = classes.get(clsName);
    while (c) { chain.unshift(c); c = c.superName ? classes.get(c.superName) : null; }
    return chain.flatMap((k) => [...k.fields.values()].filter((f) => !f.static));
  }

  function construct(e) {
    const args = e.args.map(evalExpr);
    const obj = { kind: 'object', cls: e.cls, id: ++heapId, fields: {}, types: {} };
    for (const f of fieldsOf(e.cls)) {
      obj.fields[f.name] = defaultValue(f.type);
      obj.types[f.name] = f.type;
    }
    const savedVals = vals;
    record(e.line, `\`new ${e.cls}(…)\` : Java crée un nouvel objet ${e.cls} (n°${obj.id}). Ses attributs commencent avec une valeur par défaut.`, 'new');
    runCtor(classes.get(e.cls), e.ctor, obj, args.map((v, i) => (e.ctor ? coerce(e.ctor.params[i].type, v, e.args[i].st) : v)), e.line);
    vals = savedVals;
    record(e.line, `L'objet ${e.cls} n°${obj.id} est prêt : on revient là où il a été créé.`, 'return');
    return obj;
  }

  function runCtor(c, k, obj, args, line) {
    if (frames.length >= MAX_DEPTH) throw runtimeError('StackOverflowError : trop d\'appels imbriqués.', line);
    frames.push({ label: `${c.name}(…)`, self: obj, scopes: [new Map()], cls: c.name });
    guard(() => {
      if (k) {
        k.params.forEach((p, i) => declare(p.name, p.type, args[i]));
        const ps = k.params.map((p, i) => `${p.name} = ${fmt(p.type, args[i])}`).join(', ');
        record(k.line, `On entre dans le constructeur de ${c.name}${ps ? ` : ${ps}` : ''}.`, 'enter');
      }
      const body = k ? k.node.body.body : [];
      let start = 0;
      const parent = c.superName ? classes.get(c.superName) : null;
      if (body[0]?.type === 'SuperCall') {
        vals = new Map();
        const sc = body[0];
        const pargs = sc.args.map(evalExpr).map((v, i) => (sc.ctor ? coerce(sc.ctor.params[i].type, v, sc.args[i].st) : v));
        record(sc.line, `\`super(…)\` : on lance d'abord le constructeur de la classe parente ${sc.parent}.`, 'call');
        runCtor(classes.get(sc.parent), sc.ctor, obj, pargs, sc.line);
        start = 1;
      } else if (parent) {
        runCtor(parent, parent.ctors.find((x) => x.params.length === 0) ?? null, obj, [], line);
      }
      for (const f of c.fields.values()) {
        if (f.static || !f.node.init) continue;
        vals = new Map();
        const init = f.node.init;
        const v = init.type === 'ArrayLit' ? arrayLit(init, f.type) : coerce(f.type, evalExpr(init), init.st);
        obj.fields[f.name] = v;
        changed.add(`${obj.id}:${f.name}`);
        record(f.line, `L'attribut \`${f.name}\` de l'objet reçoit \`${fmt(f.type, v)}\`.`);
      }
      try {
        withScope(() => body.slice(start).forEach(exec));
      } catch (sig) {
        if (!(sig instanceof ReturnSignal)) throw sig;
      }
    }, () => frames.pop());
  }

  // ---------- Bibliothèque ----------
  function mathCall(name, args, e) {
    const [a, b] = args;
    switch (name) {
      case 'abs': return e.st === 'int' ? Math.abs(a) | 0 : Math.abs(a);
      case 'max': return Math.max(a, b);
      case 'min': return Math.min(a, b);
      case 'sqrt': return Math.sqrt(a);
      case 'pow': return a ** b;
      case 'round': return toInt(Math.floor(a + 0.5));
      case 'floor': return Math.floor(a);
      case 'ceil': return Math.ceil(a);
      default: return 0;
    }
  }

  function stringCall(e) {
    const s = evalExpr(e.obj);
    if (s === null) throw nullError(show(e.obj), e.line);
    const [a, b] = e.args.map(evalExpr);
    const outOfBounds = (i) => runtimeError(`StringIndexOutOfBoundsException : l'indice ${i} n'existe pas dans "${s}" (indices de 0 à ${s.length - 1}).`, e.line,
      'Le premier caractère est à l\'indice 0, le dernier à l\'indice length() - 1.');
    switch (e.name) {
      case 'length': return s.length;
      case 'charAt':
        if (a < 0 || a >= s.length) throw outOfBounds(a);
        return s.charCodeAt(a);
      case 'toUpperCase': return s.toUpperCase();
      case 'toLowerCase': return s.toLowerCase();
      case 'equals': return s === a;
      case 'equalsIgnoreCase': return a !== null && s.toLowerCase() === a.toLowerCase();
      case 'isEmpty': return s.length === 0;
      case 'contains': return s.includes(a);
      case 'indexOf': return s.indexOf(a);
      case 'startsWith': return s.startsWith(a);
      case 'endsWith': return s.endsWith(a);
      case 'trim': return s.trim();
      case 'replace': return s.split(a).join(b);
      case 'split': {
        // Comme Java : le séparateur est une expression régulière, et les morceaux vides à la fin sont retirés
        let parts;
        try { parts = a === '' ? [...s] : s.split(new RegExp(a)); } catch { parts = s.split(a); }
        while (parts.length > 1 && parts[parts.length - 1] === '') parts.pop();
        return newArray('String[]', parts);
      }
      case 'substring': {
        const end = b === undefined ? s.length : b;
        if (a < 0 || end > s.length || a > end) throw outOfBounds(a < 0 || a > s.length ? a : end);
        return s.substring(a, end);
      }
      default: return undefined;
    }
  }

  // ---------- Instructions ----------
  function describeExprStmt(e) {
    if (e.type === 'Assign') {
      const name = show(e.target);
      const before = e.lastOld === undefined ? undefined : fmt(e.st, e.lastOld);
      const after = fmt(e.st, e.lastNew);
      if (e.op === '=') {
        const rhs = e.value.type === 'Lit' ? `\`${after}\`` : explain(e.value, vals.get(e.value));
        return `On range ${rhs} dans \`${name}\`${before !== undefined && before !== after ? ` : ${name} passe de ${before} à ${after}` : ''}.`;
      }
      return `\`${name} ${e.op} ${show(e.value)}\` : on calcule ${before} ${e.op[0]} ${fmt(e.value.st, vals.get(e.value))}, donc ${name} passe de ${before} à ${after}.`;
    }
    if (e.type === 'Update') {
      return `\`${show(e)}\` : ${show(e.target)} ${e.op === '++' ? 'augmente' : 'diminue'} de 1 et passe de ${fmt(e.st, e.lastOld)} à ${fmt(e.st, e.lastNew)}.`;
    }
    if (e.type === 'Call') {
      if (e.kind === 'print') {
        if (!e.args.length) return 'Affiche une ligne vide dans la console.';
        const arg = e.args[0];
        const text = out.slice(0, e.name === 'println' ? -1 : undefined).split('\n').pop();
        const how = arg.type === 'Lit' ? '' : ` On évalue d'abord ${explain(arg, vals.get(arg))}.`;
        return `Affiche « ${text} » dans la console${e.name === 'println' ? ' puis passe à la ligne' : ''}.${how}`;
      }
      if (e.kind === 'api') {
        const args = e.args.filter((a) => a.type !== 'Lit').map((a) => explain(a, vals.get(a)));
        return `${e.apiDesc || `Appel de \`${e.obj.name}.${e.name}()\`.`}${args.length ? ` (Paramètre : ${args.join(', ')}.)` : ''}`;
      }
      return `Appel de \`${show(e)}\`.`;
    }
    return `Exécute \`${show(e)}\`.`;
  }

  function execExprWithStep(e, line) {
    vals = new Map();
    evalExpr(e);
    // L'appel d'une de tes méthodes a déjà raconté son retour : pas d'étape en double
    if ((e.type === 'Call' && e.kind === 'method') || e.type === 'New') return;
    record(line, describeExprStmt(e), e.type === 'Call' && e.kind === 'api' ? 'api' : 'stmt');
  }

  function condition(test, line, label, onTrue, onFalse) {
    vals = new Map();
    const v = evalExpr(test);
    let desc = `${label} : ${explain(test, v)}`;
    if (test.refCompare) desc += ' ⚠️ Avec des String, == compare les objets et non le texte : préfère .equals().';
    record(line, `${desc} — ${v ? onTrue : onFalse}`, 'cond');
    return v;
  }

  function runLoopBody(body) {
    try {
      withScope(() => exec(body));
    } catch (sig) {
      if (sig instanceof BreakSignal) return 'break';
      if (!(sig instanceof ContinueSignal)) throw sig;
    }
    return null;
  }

  function execBlockBody(block) {
    withScope(() => block.body.forEach(exec));
  }

  function exec(s) {
    switch (s.type) {
      case 'Block':
        execBlockBody(s);
        return;
      case 'Empty':
        return;
      case 'VarDecl':
        for (const d of s.decls) {
          vals = new Map();
          let value;
          if (d.init) {
            value = d.init.type === 'ArrayLit' ? arrayLit(d.init, d.type) : coerce(d.type, evalExpr(d.init), d.init.st);
            vals.set(d.init, value);
          }
          declare(d.name, d.type, value);
          if (d.init) {
            const simple = d.init.type === 'Lit' || d.init.type === 'ArrayLit';
            const how = simple ? `la valeur \`${d.init.type === 'ArrayLit' ? show(d.init) : fmt(d.type, value)}\`` : explain(d.init, value);
            const extra = d.type === 'double' && d.init.st === 'int' && d.init.type !== 'Lit' ? ` Le résultat est un int, converti en double : ${fmt('double', value)}.` : '';
            const arr = value?.kind === 'array' ? ` C'est un tableau de ${value.items.length} cases, numérotées de 0 à ${value.items.length - 1}.` : '';
            record(d.line, `Création de la variable \`${d.name}\` de type ${d.type}, qui reçoit ${how}.${extra}${arr}`);
          } else {
            record(d.line, `Création de la variable \`${d.name}\` de type ${d.type}, encore sans valeur.`);
          }
        }
        return;
      case 'ExprStmt':
        execExprWithStep(s.expr, s.line);
        return;
      case 'If': {
        const ok = condition(s.test, s.line, 'Condition du if', 'vraie : on exécute le bloc du if.', s.alt ? 'fausse : on passe au else.' : 'fausse : on saute le bloc du if.');
        if (ok) withScope(() => exec(s.cons));
        else if (s.alt) withScope(() => exec(s.alt));
        return;
      }
      case 'While': {
        let tour = 0;
        for (;;) {
          const ok = condition(s.test, s.line, `Boucle while, test n°${tour + 1}`, `vrai : on fait le tour n°${tour + 1}.`, `faux : la boucle s'arrête après ${tour} tour${tour > 1 ? 's' : ''}.`);
          if (!ok) break;
          tour++;
          if (runLoopBody(s.body) === 'break') break;
        }
        return;
      }
      case 'DoWhile': {
        let tour = 0;
        for (;;) {
          tour++;
          if (runLoopBody(s.body) === 'break') break;
          const ok = condition(s.test, s.whileLine, `Fin du tour n°${tour}, test du do…while`, 'vrai : on recommence.', 'faux : la boucle s\'arrête.');
          if (!ok) break;
        }
        return;
      }
      case 'For':
        withScope(() => {
          if (s.init) {
            if (s.init.type === 'VarDecl') exec(s.init);
            else s.init.exprs.forEach((e) => execExprWithStep(e, s.line));
          }
          let tour = 0;
          for (;;) {
            if (s.test) {
              const ok = condition(s.test, s.line, `Boucle for, test n°${tour + 1}`, `vrai : on fait le tour n°${tour + 1}.`, `faux : la boucle s'arrête après ${tour} tour${tour > 1 ? 's' : ''}.`);
              if (!ok) break;
            }
            tour++;
            if (runLoopBody(s.body) === 'break') break;
            s.update.forEach((e) => execExprWithStep(e, s.line));
          }
          if (s.init?.type === 'VarDecl') {
            const names = s.init.decls.map((d) => d.name).join(', ');
            const f = frame();
            f.scopes[f.scopes.length - 1] = new Map();
            record(s.line, `Fin de la boucle for : la variable ${names} n'existe plus (elle n'était visible que dans la boucle).`, 'scope');
          }
        });
        return;
      case 'ForEach': {
        vals = new Map();
        const arr = evalExpr(s.iter);
        if (arr === null) throw nullError(show(s.iter), s.line);
        const n = arr.items.length;
        const items = [...arr.items];
        for (let i = 0; i < n; i++) {
          const v = coerce(s.elemType, items[i], arr.kind === 'list' ? arr.elem : elemOf(arr.type));
          let brk = false;
          withScope(() => {
            declare(s.name, s.elemType, v);
            record(s.line, `Tour n°${i + 1} sur ${n} : \`${s.name}\` reçoit ${arr.kind === 'list' ? "l'élément" : 'la case'} ${i} de ${show(s.iter)}, soit \`${fmt(s.elemType, v)}\`.`, 'cond');
            brk = runLoopBody(s.body) === 'break';
          });
          if (brk) break;
        }
        record(s.line, `Fin de la boucle : ${n === 0 ? `${show(s.iter)} était vide, aucun tour.` : `les ${n} ${arr.kind === 'list' ? 'éléments' : 'cases'} de ${show(s.iter)} ont été parcourus.`}`, 'scope');
        return;
      }
      case 'Break':
        record(s.line, '`break` : on sort immédiatement de la boucle.');
        throw new BreakSignal();
      case 'Continue':
        record(s.line, '`continue` : on passe directement au tour suivant.');
        throw new ContinueSignal();
      case 'Return': {
        vals = new Map();
        if (!s.value) {
          record(s.line, '`return` : on quitte la méthode tout de suite.');
          throw new ReturnSignal(undefined);
        }
        const v = evalExpr(s.value);
        record(s.line, `\`return\` : la méthode renvoie ${explain(s.value, v)}.`);
        const sig = new ReturnSignal(v);
        sig.type = s.value.st;
        throw sig;
      }
      case 'SuperCall':
        return;
      default:
        throw runtimeError(`Instruction inconnue ${s.type}`, s.line);
    }
  }

  // ---------- Démarrage ----------
  let error = null;
  try {
    // attributs static
    for (const c of classes.values()) {
      const sf = [...c.fields.values()].filter((f) => f.static);
      if (!sf.length) continue;
      statics.set(c.name, Object.fromEntries(sf.map((f) => [f.name, { type: f.type, value: defaultValue(f.type) }])));
    }
    frames.push({ label: 'static', self: null, scopes: [new Map()], cls: null });
    for (const c of classes.values()) {
      for (const f of c.fields.values()) {
        if (!f.static || !f.node.init) continue;
        frame().cls = c.name;
        statics.get(c.name)[f.name].value = f.node.init.type === 'ArrayLit' ? arrayLit(f.node.init, f.type) : coerce(f.type, evalExpr(f.node.init), f.node.init.st);
      }
    }
    frames.pop();

    const main = program.main;
    frames.push({ label: 'main', self: null, scopes: [new Map()], cls: main.owner });
    record(null, 'Le programme démarre dans la méthode main. La mémoire est vide.', 'start');
    withScope(() => {
      try {
        main.node.body.body.forEach(exec);
      } catch (sig) {
        if (!(sig instanceof ReturnSignal)) throw sig;
      }
      record(null, 'Fin du programme.', 'end');
    });
  } catch (err) {
    if (err instanceof StepLimit) {
      error = runtimeError(`Le programme a dépassé ${MAX_STEPS} étapes : il ne s'arrête sans doute jamais.`, steps[steps.length - 1]?.line,
        'Vérifie que la condition de ta boucle finit par devenir fausse (la variable testée doit changer à chaque tour).');
      error.infinite = true;
    } else if (err instanceof JavaError) {
      error = err;
      steps.push({ line: err.line, desc: err.message, kind: 'error', vars: err.vars || snapshotVars(), frames: err.frames || snapshotFrames(), out, world: structuredClone(state), event });
    } else {
      throw err;
    }
  }

  return { steps, error, out, world: state };
}
