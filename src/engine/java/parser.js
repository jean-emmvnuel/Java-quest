import { compileError } from './errors.js';

// Analyse syntaxique : transforme les jetons en arbre (AST).
// Le programme est un fichier Java complet : une ou plusieurs classes,
// avec attributs, constructeurs et méthodes.

export const PRIMITIVES = new Set(['int', 'double', 'boolean', 'char']);
const UNSUPPORTED_TYPES = new Set(['long', 'float', 'byte', 'short']);
const ASSIGN_OPS = new Set(['=', '+=', '-=', '*=', '/=', '%=']);
const MODIFIERS = new Set(['public', 'private', 'protected', 'static', 'final', 'abstract']);

export function parse(tokens) {
  let pos = 0;

  const peek = (k = 0) => tokens[Math.min(pos + k, tokens.length - 1)];
  const prev = () => tokens[Math.max(pos - 1, 0)];
  const next = () => tokens[pos++];
  const is = (t, v, k = 0) => {
    const tok = peek(k);
    return tok.t === t && (v === undefined || tok.v === v);
  };
  const isOp = (v, k) => is('op', v, k);
  const isKw = (v, k) => is('kw', v, k);
  const accept = (t, v) => (is(t, v) ? next() : null);

  const describe = (tok) => (tok.t === 'eof' ? 'la fin du code' : tok.t === 'str' ? `"${tok.v}"` : `« ${tok.t === 'char' ? `'${String.fromCharCode(tok.v)}'` : tok.v} »`);

  function expectOp(v, what) {
    if (isOp(v)) return next();
    const tok = peek();
    if (v === ';') {
      throw compileError(`Point-virgule ; attendu à la fin de l'instruction${what ? ` (${what})` : ''}.`, prev().line,
        'En Java, chaque instruction se termine par un point-virgule.');
    }
    if (v === ')') throw compileError(`Parenthèse fermante ) attendue, mais ${describe(tok)} trouvé.`, tok.t === 'eof' ? prev().line : tok.line, 'Vérifie que chaque ( a sa ) correspondante.');
    if (v === '}') throw compileError('Accolade fermante } manquante.', prev().line, 'Chaque { ouverte doit être refermée par une }.');
    if (v === '{') throw compileError(`Accolade ouvrante { attendue, mais ${describe(tok)} trouvé.`, tok.line);
    if (v === '(') throw compileError(`Parenthèse ouvrante ( attendue après ${describe(prev())}.`, tok.line);
    if (v === ']') throw compileError(`Crochet fermant ] attendu, mais ${describe(tok)} trouvé.`, tok.line);
    throw compileError(`« ${v} » attendu, mais ${describe(tok)} trouvé.`, tok.line);
  }

  function expectIdent(what) {
    const tok = peek();
    if (tok.t === 'id') return next();
    if (tok.t === 'kw') throw compileError(`« ${tok.v} » est un mot réservé de Java : il ne peut pas servir de ${what}.`, tok.line);
    throw compileError(`Nom de ${what} attendu, mais ${describe(tok)} trouvé.`, tok.line);
  }

  // ---------- Types ----------

  /** Longueur (en jetons) d'un type qui commence à k, ou 0 si ce n'est pas un type. */
  function typeLength(k = 0) {
    const tok = peek(k);
    let n;
    if (tok.t === 'kw' && (PRIMITIVES.has(tok.v) || UNSUPPORTED_TYPES.has(tok.v) || tok.v === 'var')) n = 1;
    else if (tok.t === 'id') {
      n = 1;
      // Type générique : ArrayList<String>
      const arg = peek(k + 2);
      if (isOp('<', k + 1) && (arg.t === 'id' || (arg.t === 'kw' && PRIMITIVES.has(arg.v))) && isOp('>', k + 3)) n = 4;
    } else return 0;
    while (isOp('[', k + n) && isOp(']', k + n + 1)) n += 2;
    return n;
  }

  /** Une déclaration de variable commence-t-elle ici ?  (Type nom …) */
  function startsDeclaration() {
    const n = typeLength(0);
    return n > 0 && is('id', undefined, n);
  }

  function parseType() {
    const tok = next();
    if (UNSUPPORTED_TYPES.has(tok.v)) {
      throw compileError(`Le type ${tok.v} n'est pas encore au programme de Java Quest.`, tok.line, 'Utilise int pour les entiers et double pour les nombres à virgule.');
    }
    if (tok.t !== 'id' && tok.t !== 'kw') throw compileError(`Type attendu, mais ${describe(tok)} trouvé.`, tok.line);
    let type = tok.v;
    if (tok.t === 'id' && isOp('<')) {
      next();
      const arg = next();
      if (arg.t !== 'id') throw compileError(`Type des éléments attendu entre < et >, mais ${describe(arg)} trouvé.`, arg.line,
        arg.t === 'kw' ? `Dans une ArrayList, on écrit les types de base avec une majuscule : ${{ int: 'Integer', double: 'Double', boolean: 'Boolean', char: 'Character' }[arg.v] ?? 'Integer'}.` : undefined);
      if (isOp('>>')) throw compileError('Les listes de listes ne sont pas prises en charge.', arg.line);
      expectOp('>');
      type = `${tok.v}<${arg.v}>`;
    }
    while (isOp('[')) {
      next();
      expectOp(']');
      type += '[]';
    }
    return type;
  }

  // ---------- Fichier et classes ----------

  function parseCompilationUnit() {
    const classes = [];
    while (!is('eof')) {
      const mods = parseModifiers();
      if (!isKw('class') && !isKw('interface')) {
        const tok = peek();
        if (isOp('}')) throw compileError('Accolade fermante } en trop.', tok.line, 'Compte les accolades : chaque { a une seule } qui la ferme.');
        throw compileError(`Une classe est attendue ici (class Nom { … }), mais ${describe(tok)} trouvé.`, tok.line,
          'Les méthodes et les attributs s\'écrivent à l\'intérieur des accolades d\'une classe.');
      }
      classes.push(parseClass(mods));
    }
    return { type: 'Program', classes };
  }

  function parseModifiers() {
    const mods = { annotations: [] };
    for (;;) {
      if (isOp('@')) {
        const at = next();
        const name = expectIdent('annotation');
        mods.annotations.push({ name: name.v, line: at.line });
        continue;
      }
      const tok = peek();
      if (tok.t === 'kw' && MODIFIERS.has(tok.v)) {
        if (mods[tok.v]) throw compileError(`Le mot ${tok.v} est écrit deux fois.`, tok.line);
        mods[tok.v] = true;
        next();
        continue;
      }
      return mods;
    }
  }

  function parseClass(mods) {
    const kw = next();
    const isInterface = kw.v === 'interface';
    const name = expectIdent(isInterface ? 'interface' : 'classe');
    let superName = null;
    const interfaces = [];
    const nameList = () => {
      do { interfaces.push(expectIdent('interface').v); } while (accept('op', ','));
    };
    if (is('id', 'extends')) {
      next();
      if (isInterface) nameList();
      else {
        superName = expectIdent('classe').v;
        if (isOp(',')) throw compileError('Une classe ne peut hériter (extends) que d\'une seule classe.', peek().line, 'Pour avoir plusieurs comportements, utilise des interfaces : implements A, B');
      }
    }
    if (is('id', 'implements')) {
      if (isInterface) throw compileError('Une interface hérite d\'autres interfaces avec extends, pas implements.', peek().line);
      next();
      nameList();
    }
    const open = expectOp('{');
    const cls = { type: 'Class', name: name.v, superName, interfaces, isInterface, fields: [], methods: [], ctors: [], line: kw.line, mods };
    while (!isOp('}')) {
      if (is('eof')) throw compileError(`Accolade fermante } manquante pour la classe ${name.v}.`, prev().line, `La classe ouverte ligne ${open.line} n'est jamais refermée.`);
      parseMember(cls);
    }
    next();
    return cls;
  }

  function parseMember(cls) {
    const startTok = peek();
    const mods = parseModifiers();
    if (isKw('class') || isKw('interface')) throw compileError('Une classe ne peut pas être écrite à l\'intérieur d\'une autre ici : sors-la de la classe.', peek().line);

    // Constructeur : NomDeLaClasse(…)
    if (is('id', cls.name) && isOp('(', 1)) {
      if (cls.isInterface) throw compileError('Une interface n\'a pas de constructeur.', peek().line);
      const nameTok = next();
      const params = parseParams();
      const body = parseBlock();
      cls.ctors.push({ type: 'Ctor', name: cls.name, params, body, mods, line: nameTok.line, owner: cls.name });
      return;
    }
    if (is('id') && isOp('(', 1)) {
      throw compileError(`Il manque le type de retour de la méthode ${peek().v} (ou void si elle ne renvoie rien).`, peek().line,
        `Si c'est un constructeur, il doit porter exactement le nom de la classe : ${cls.name}.`);
    }

    let ret;
    if (isKw('void')) { next(); ret = 'void'; } else {
      if (!typeLength(0)) throw compileError(`Je ne comprends pas ${describe(peek())} ici : on attend un attribut, un constructeur ou une méthode.`, startTok.line);
      ret = parseType();
    }
    const nameTok = expectIdent(isOp('(', 0) ? 'méthode' : 'attribut');

    if (isOp('(')) {
      const params = parseParams();
      let body = null;
      if (isOp(';')) {
        if (!mods.abstract && !cls.isInterface) {
          throw compileError(`La méthode ${nameTok.v} n'a pas de corps : ajoute { … } après les parenthèses.`, nameTok.line,
            'Une méthode sans corps doit être déclarée abstract (dans une classe abstraite) ou se trouver dans une interface.');
        }
        next();
      } else {
        if (mods.abstract) throw compileError(`La méthode abstraite ${nameTok.v} ne doit pas avoir de corps : termine-la par un point-virgule.`, nameTok.line, `abstract ${ret} ${nameTok.v}(…);`);
        if (cls.isInterface && !mods.static) throw compileError(`Dans une interface, la méthode ${nameTok.v} s'écrit sans corps, terminée par un point-virgule.`, nameTok.line);
        body = parseBlock();
      }
      cls.methods.push({ type: 'Method', name: nameTok.v, params, ret, body, mods, line: nameTok.line, owner: cls.name });
      return;
    }
    if (ret === 'void') throw compileError(`Un attribut ne peut pas être de type void.`, nameTok.line);
    if (cls.isInterface) throw compileError('Les attributs d\'interface ne sont pas pris en charge : une interface décrit seulement des méthodes.', nameTok.line);
    // Attribut(s)
    let tok = nameTok;
    for (;;) {
      let init = null;
      if (isOp('=')) { next(); init = isOp('{') ? parseArrayLit(ret) : parseExpression(); }
      cls.fields.push({ type: 'Field', name: tok.v, varType: ret, init, mods, line: tok.line, owner: cls.name });
      if (!accept('op', ',')) break;
      tok = expectIdent('attribut');
    }
    expectOp(';', 'attribut');
  }

  function parseParams() {
    expectOp('(');
    const params = [];
    if (!isOp(')')) {
      do {
        if (isKw('final')) next();
        if (!typeLength(0)) throw compileError(`Type du paramètre attendu, mais ${describe(peek())} trouvé.`, peek().line, 'Un paramètre s\'écrit avec son type : (int n, String nom)');
        const type = parseType();
        const name = expectIdent('paramètre');
        params.push({ type, name: name.v, line: name.line });
      } while (accept('op', ','));
    }
    expectOp(')');
    return params;
  }

  // ---------- Instructions ----------

  function parseBlock() {
    const open = expectOp('{');
    const body = [];
    while (!isOp('}')) {
      if (is('eof')) throw compileError('Accolade fermante } manquante.', prev().line, `Le bloc ouvert ligne ${open.line} n'est jamais refermé.`);
      body.push(parseStatement());
    }
    next();
    return { type: 'Block', body, line: open.line, endLine: prev().line };
  }

  function parseStatement() {
    const tok = peek();

    if (isOp('{')) return parseBlock();
    if (isOp(';')) { next(); return { type: 'Empty', line: tok.line }; }

    if (tok.t === 'kw') {
      switch (tok.v) {
        case 'if': return parseIf();
        case 'while': return parseWhile();
        case 'do': return parseDoWhile();
        case 'for': return parseFor();
        case 'break': next(); expectOp(';', 'break'); return { type: 'Break', line: tok.line };
        case 'continue': next(); expectOp(';', 'continue'); return { type: 'Continue', line: tok.line };
        case 'return': {
          next();
          const value = isOp(';') ? null : parseExpression();
          expectOp(';', 'return');
          return { type: 'Return', value, line: tok.line };
        }
        case 'else':
          throw compileError('else sans if : un else doit suivre directement le bloc d\'un if.', tok.line, 'Vérifie qu\'il n\'y a pas de ; juste après la parenthèse du if.');
        case 'public': case 'private': case 'protected': case 'static': case 'void':
          throw compileError(`« ${tok.v} » n'a pas sa place ici : on est à l'intérieur d'une méthode.`, tok.line,
            'Les méthodes s\'écrivent les unes à côté des autres dans la classe, jamais les unes dans les autres. Vérifie aussi tes accolades.');
        case 'class':
          throw compileError('Une classe ne s\'écrit pas à l\'intérieur d\'une méthode.', tok.line);
        case 'switch':
          throw compileError('Le switch arrive dans une prochaine mission. Utilise if / else if / else.', tok.line);
        case 'final': {
          next();
          if (!startsDeclaration()) throw compileError('Une déclaration de variable est attendue après final.', tok.line);
          const decl = parseDeclaration();
          decl.final = true;
          expectOp(';', 'déclaration');
          return decl;
        }
        case 'super':
          if (isOp('(', 1)) {
            next();
            const args = parseArgs();
            expectOp(';');
            return { type: 'SuperCall', args, line: tok.line };
          }
          break;
        default: break;
      }
    }

    if (startsDeclaration()) {
      const decl = parseDeclaration();
      expectOp(';', 'déclaration');
      return decl;
    }

    if (tok.t === 'id' && peek(1).t === 'id') {
      throw compileError(`Je ne comprends pas « ${tok.v} ${peek(1).v} ».`, tok.line,
        ['integer', 'bool', 'string', 'Int', 'Double', 'Boolean'].includes(tok.v)
          ? 'Pour déclarer une variable, utilise un type Java : int, double, boolean, char ou String.'
          : 'Une déclaration s\'écrit : type nom = valeur;  par exemple  int age = 20;');
    }

    const expr = parseExpression();
    if (!['Assign', 'Update', 'Call', 'New'].includes(expr.type)) {
      throw compileError(`Ce n'est pas une instruction : \`${shortSource(expr)}\` calcule une valeur mais n'en fait rien.`, expr.line,
        expr.type === 'Binary' && expr.op === '=='
          ? 'Pour donner une valeur à une variable, utilise un seul = .'
          : 'Range le résultat dans une variable ou affiche-le avec System.out.println(...).');
    }
    expectOp(';');
    return { type: 'ExprStmt', expr, line: tok.line };
  }

  function parseDeclaration() {
    const typeTok = peek();
    const varType = parseType();
    const decls = [];
    do {
      const name = expectIdent('variable');
      let init = null;
      if (isOp('[')) {
        throw compileError('En Java, les crochets se placent après le type : int[] notes (et non int notes[]).', name.line);
      }
      if (isOp('=')) {
        next();
        init = isOp('{') ? parseArrayLit(varType) : parseExpression();
      } else if (isOp('==')) {
        throw compileError('Pour donner une valeur à une variable, utilise un seul = .', name.line);
      }
      if (varType === 'var' && !init) throw compileError('Avec var, la variable doit recevoir une valeur tout de suite.', name.line);
      decls.push({ name: name.v, init, line: name.line });
    } while (accept('op', ','));
    if (peek().t === 'id' || peek().t === 'num' || peek().t === 'str') {
      throw compileError('Point-virgule ; ou = attendu dans la déclaration.', prev().line);
    }
    return { type: 'VarDecl', varType, decls, line: typeTok.line };
  }

  function parseArrayLit(arrayType) {
    const open = expectOp('{');
    const items = [];
    if (!isOp('}')) {
      do {
        if (isOp('}')) break;
        items.push(isOp('{') ? parseArrayLit(null) : parseExpression());
      } while (accept('op', ','));
    }
    expectOp('}');
    return { type: 'ArrayLit', items, arrayType, line: open.line };
  }

  function parseParenCondition(word) {
    if (!isOp('(')) throw compileError(`Après ${word}, la condition doit être entre parenthèses : ${word} (condition)`, prev().line);
    next();
    if (isOp(')')) throw compileError(`La condition du ${word} est vide.`, peek().line);
    const test = parseExpression();
    expectOp(')');
    return test;
  }

  function checkStraySemicolon(word, line) {
    if (isOp(';') && peek().line === line) {
      throw compileError(`Point-virgule juste après le ${word} (…) : le bloc qui suit ne dépendrait plus de la condition.`, line,
        `Retire le ; placé après la parenthèse du ${word}.`);
    }
  }

  function parseIf() {
    const tok = next();
    const test = parseParenCondition('if');
    checkStraySemicolon('if', prev().line);
    const cons = parseStatement();
    let alt = null;
    if (isKw('else')) { next(); alt = parseStatement(); }
    return { type: 'If', test, cons, alt, line: tok.line };
  }

  function parseWhile() {
    const tok = next();
    const test = parseParenCondition('while');
    checkStraySemicolon('while', prev().line);
    const body = parseStatement();
    return { type: 'While', test, body, line: tok.line };
  }

  function parseDoWhile() {
    const tok = next();
    const body = parseStatement();
    if (!isKw('while')) throw compileError('Un do { … } doit se terminer par while (condition);', prev().line);
    const wTok = next();
    const test = parseParenCondition('while');
    expectOp(';', 'do … while');
    return { type: 'DoWhile', body, test, line: tok.line, whileLine: wTok.line };
  }

  function parseFor() {
    const tok = next();
    expectOp('(');
    // for (Type x : tableau)
    const n = typeLength(0);
    if (n && is('id', undefined, n) && isOp(':', n + 1)) {
      const varType = parseType();
      const name = expectIdent('variable');
      next();
      const iter = parseExpression();
      expectOp(')');
      checkStraySemicolon('for', prev().line);
      const body = parseStatement();
      return { type: 'ForEach', varType, name: name.v, iter, body, line: tok.line };
    }
    let init = null;
    if (!isOp(';')) {
      if (startsDeclaration()) init = parseDeclaration();
      else init = { type: 'ExprList', exprs: parseExprList(), line: peek().line };
    }
    const forHint = () => compileError('Une boucle for s\'écrit avec deux points-virgules : for (début; condition; pas)', tok.line, 'Exemple : for (int i = 0; i < 5; i++)');
    if (!isOp(';')) throw forHint();
    next();
    const test = isOp(';') ? null : parseExpression();
    if (!isOp(';')) throw forHint();
    next();
    const update = isOp(')') ? [] : parseExprList();
    expectOp(')');
    checkStraySemicolon('for', prev().line);
    const body = parseStatement();
    return { type: 'For', init, test, update, body, line: tok.line };
  }

  function parseExprList() {
    const list = [parseExpression()];
    while (accept('op', ',')) list.push(parseExpression());
    return list;
  }

  // ---------- Expressions ----------

  function parseExpression() { return parseAssign(); }

  const isTarget = (e) => e.type === 'Ident' || e.type === 'Member' || e.type === 'Index';

  function parseAssign() {
    const left = parseTernary();
    if (peek().t === 'op' && ASSIGN_OPS.has(peek().v)) {
      const opTok = next();
      if (!isTarget(left)) throw compileError('On ne peut donner une valeur qu\'à une variable, un attribut ou une case de tableau.', opTok.line);
      const value = parseAssign();
      return { type: 'Assign', op: opTok.v, target: left, value, line: left.line };
    }
    return left;
  }

  function parseTernary() {
    const test = parseBinary(0);
    if (isOp('?')) {
      next();
      const cons = parseExpression();
      expectOp(':');
      const alt = parseTernary();
      return { type: 'Cond', test, cons, alt, line: test.line };
    }
    return test;
  }

  const LEVELS = [['||'], ['&&'], ['==', '!='], ['<', '>', '<=', '>='], ['+', '-'], ['*', '/', '%']];

  function parseBinary(level) {
    if (level >= LEVELS.length) return parseUnary();
    let left = parseBinary(level + 1);
    for (;;) {
      if (level === 3 && is('id', 'instanceof')) {
        throw compileError('instanceof arrive dans une prochaine mission.', peek().line);
      }
      if (!(peek().t === 'op' && LEVELS[level].includes(peek().v))) break;
      const op = next();
      const right = parseBinary(level + 1);
      left = { type: 'Binary', op: op.v, left, right, line: left.line };
    }
    if (peek().t === 'op' && ['&', '|', '^', '<<', '>>', '>>>', '~'].includes(peek().v)) {
      const v = peek().v;
      throw compileError(`L'opérateur ${v} n'est pas au programme de Java Quest.`, peek().line,
        v === '&' || v === '|' ? `Pour combiner des conditions, utilise ${v}${v} .` : undefined);
    }
    return left;
  }

  function isCastAhead() {
    if (!isOp('(')) return false;
    const t = peek(1);
    if (!(t.t === 'kw' && (PRIMITIVES.has(t.v) || UNSUPPORTED_TYPES.has(t.v)))) return false;
    return isOp(')', 2);
  }

  function parseUnary() {
    const tok = peek();
    if (tok.t === 'op' && (tok.v === '!' || tok.v === '-' || tok.v === '+')) {
      next();
      const arg = parseUnary();
      if (tok.v === '-' && arg.type === 'Lit' && (arg.vt === 'int' || arg.vt === 'double') && !arg.negated) {
        return { ...arg, value: -arg.value, text: `-${arg.text}`, negated: true, line: tok.line };
      }
      return { type: 'Unary', op: tok.v, arg, line: tok.line };
    }
    if (tok.t === 'op' && (tok.v === '++' || tok.v === '--')) {
      next();
      const target = parseUnary();
      if (!isTarget(target)) throw compileError(`${tok.v} s'applique seulement à une variable.`, tok.line);
      return { type: 'Update', op: tok.v, prefix: true, target, line: tok.line };
    }
    if (isCastAhead()) {
      next();
      const to = parseType();
      next();
      const expr = parseUnary();
      return { type: 'Cast', to, expr, line: tok.line };
    }
    return parsePostfix();
  }

  function parsePostfix() {
    let expr = parsePrimary();
    for (;;) {
      if (isOp('.')) {
        next();
        const name = expectIdent('méthode ou attribut');
        if (isOp('(')) {
          const args = parseArgs();
          expr = { type: 'Call', obj: expr, name: name.v, args, line: expr.line };
        } else {
          expr = { type: 'Member', obj: expr, name: name.v, line: expr.line };
        }
      } else if (isOp('(') && expr.type === 'Ident') {
        const args = parseArgs();
        expr = { type: 'Call', obj: null, name: expr.name, args, line: expr.line };
      } else if (isOp('[')) {
        next();
        if (isOp(']')) throw compileError('Il faut un numéro de case entre les crochets : notes[0].', prev().line);
        const index = parseExpression();
        expectOp(']');
        expr = { type: 'Index', obj: expr, index, line: expr.line };
      } else if (isOp('++') || isOp('--')) {
        const op = next();
        if (!isTarget(expr)) throw compileError(`${op.v} s'applique seulement à une variable.`, op.line);
        expr = { type: 'Update', op: op.v, prefix: false, target: expr, line: expr.line };
      } else {
        return expr;
      }
    }
  }

  function parseArgs() {
    expectOp('(');
    const args = [];
    if (!isOp(')')) {
      do { args.push(parseExpression()); } while (accept('op', ','));
    }
    expectOp(')');
    return args;
  }

  function parseNew(tok) {
    const typeTok = next();
    if (!(typeTok.t === 'id' || (typeTok.t === 'kw' && PRIMITIVES.has(typeTok.v)))) {
      throw compileError(`Après new, on attend un nom de classe ou un type de tableau, mais ${describe(typeTok)} trouvé.`, typeTok.line);
    }
    if (isOp('[')) {
      next();
      if (isOp(']')) {
        next();
        let type = `${typeTok.v}[]`;
        while (isOp('[') && isOp(']', 1)) { next(); next(); type += '[]'; }
        if (!isOp('{')) throw compileError('Il faut soit une taille (new int[5]), soit des valeurs (new int[]{1, 2}).', tok.line);
        return parseArrayLit(type);
      }
      const sizes = [parseExpression()];
      expectOp(']');
      let type = `${typeTok.v}[]`;
      // Tableau à plusieurs dimensions : new char[3][3]
      while (isOp('[')) {
        next();
        if (isOp(']')) { next(); type += '[]'; continue; }
        if (sizes.length < type.split('[]').length - 1) throw compileError('Les tailles se donnent dans l\'ordre : new int[3][4] (ou new int[3][]).', tok.line);
        sizes.push(parseExpression());
        expectOp(']');
        type += '[]';
      }
      return { type: 'NewArray', elemType: type.slice(0, -2), arrayType: type, size: sizes[0], sizes, line: tok.line };
    }
    if (typeTok.t === 'kw') throw compileError(`new ${typeTok.v} : un type de base ne se crée pas avec new (sauf un tableau : new ${typeTok.v}[5]).`, tok.line);
    let typeArg = null;
    let generic = false;
    if (isOp('<')) {
      generic = true;
      next();
      if (!isOp('>')) {
        const arg = next();
        if (arg.t !== 'id') throw compileError(`Type des éléments attendu entre < et >, mais ${describe(arg)} trouvé.`, arg.line);
        typeArg = arg.v;
      }
      expectOp('>');
    }
    const args = parseArgs();
    return { type: 'New', cls: typeTok.v, typeArg, generic, args, line: tok.line };
  }

  function parsePrimary() {
    const tok = peek();
    switch (tok.t) {
      case 'num':
        next();
        return { type: 'Lit', vt: tok.isDouble ? 'double' : 'int', value: tok.v, text: tok.text, line: tok.line };
      case 'str':
        next();
        return { type: 'Lit', vt: 'String', value: tok.v, line: tok.line };
      case 'char':
        next();
        return { type: 'Lit', vt: 'char', value: tok.v, line: tok.line };
      case 'id':
        next();
        return { type: 'Ident', name: tok.v, line: tok.line };
      case 'kw':
        if (tok.v === 'true' || tok.v === 'false') { next(); return { type: 'Lit', vt: 'boolean', value: tok.v === 'true', line: tok.line }; }
        if (tok.v === 'null') { next(); return { type: 'Lit', vt: 'null', value: null, line: tok.line }; }
        if (tok.v === 'new') { next(); return parseNew(tok); }
        if (tok.v === 'this') { next(); return { type: 'This', line: tok.line }; }
        if (tok.v === 'super') {
          next();
          if (!isOp('.')) throw compileError('super s\'utilise sous la forme super(…) au début d\'un constructeur, ou super.methode().', tok.line);
          return { type: 'Super', line: tok.line };
        }
        throw compileError(`« ${tok.v} » est un mot réservé : il ne peut pas apparaître ici.`, tok.line);
      case 'op':
        if (tok.v === '(') {
          next();
          if (isOp(')')) throw compileError('Parenthèses vides : une expression est attendue entre ( et ).', tok.line);
          const inner = parseExpression();
          expectOp(')');
          return { type: 'Paren', expr: inner, line: tok.line };
        }
        if (tok.v === '{') throw compileError('Les valeurs entre { } ne s\'écrivent que dans une déclaration : int[] t = {1, 2, 3};', tok.line, 'Sinon, écris new int[]{1, 2, 3}.');
        break;
      default:
        break;
    }
    if (tok.t === 'eof') throw compileError('Le code s\'arrête au milieu d\'une instruction.', prev().line);
    throw compileError(`Expression attendue, mais ${describe(tok)} trouvé.`, tok.line);
  }

  return parseCompilationUnit();
}

// Version texte courte d'une expression, pour les messages d'erreur.
function shortSource(e) {
  switch (e.type) {
    case 'Lit': return e.vt === 'String' ? `"${e.value}"` : e.text ?? String(e.value);
    case 'Ident': return e.name;
    case 'Binary': return `${shortSource(e.left)} ${e.op} ${shortSource(e.right)}`;
    case 'Paren': return `(${shortSource(e.expr)})`;
    case 'Member': return `${shortSource(e.obj)}.${e.name}`;
    case 'Index': return `${shortSource(e.obj)}[${shortSource(e.index)}]`;
    case 'This': return 'this';
    default: return '…';
  }
}
