// Vérifie que chaque niveau est réussi avec sa solution et échoue avec son code de départ,
// puis teste quelques erreurs typiques de débutant.
import { LEVELS } from '../src/content/index.js';
import { runLevel } from '../src/engine/runLevel.js';
import { compile } from '../src/engine/java/compile.js';
import { execute } from '../src/engine/java/interpreter.js';

let failures = 0;
const fail = (msg) => { failures++; console.log(`  ✗ ${msg}`); };
const ok = (msg) => console.log(`  ✓ ${msg}`);

console.log('Niveaux');
for (const level of LEVELS) {
  const good = runLevel(level, level.solution);
  if (!good.passed) {
    fail(`${level.id} solution refusée : ${good.compileError?.message || good.ruleFailure || good.runs.find((r) => !r.passed)?.failure}`);
  } else ok(`${level.id} ${level.title} — solution validée (${good.runs.map((r) => r.steps.length).join('/')} étapes)`);
  const start = runLevel(level, level.starter);
  if (start.passed) fail(`${level.id} le code de départ réussit déjà`);
}

console.log('\nJava');
const run = (src) => {
  const c = compile(src, {});
  if (c.error) return { error: c.error };
  return execute(c.ast, { world: { cols: 1, rows: 1 } });
};
const expectOut = (src, want) => {
  const r = run(src);
  const got = r.error ? `ERREUR ${r.error.message}` : r.out;
  if (got === want) ok(JSON.stringify(src).slice(0, 60));
  else fail(`${JSON.stringify(src)}\n      attendu ${JSON.stringify(want)}\n      obtenu  ${JSON.stringify(got)}`);
};
const expectError = (src, re, line) => {
  const r = run(src);
  if (r.error && re.test(r.error.message) && (line === undefined || r.error.line === line)) ok(`erreur ok : ${r.error.message}`);
  else fail(`${JSON.stringify(src)} → ${r.error ? `${r.error.message} (ligne ${r.error.line})` : 'pas d\'erreur'}`);
};

expectOut('System.out.println(7 / 2);', '3\n');
expectOut('System.out.println(7 / 2.0);', '3.5\n');
expectOut('System.out.println(-7 / 2);', '-3\n');
expectOut('System.out.println(-7 % 3);', '-1\n');
expectOut('double d = 5; System.out.println(d);', '5.0\n');
expectOut('System.out.println("1" + 2 + 3);', '123\n');
expectOut('System.out.println(1 + 2 + "3");', '33\n');
expectOut("char c = 'A'; c++; System.out.println(c);", 'B\n');
expectOut("System.out.println('A' + 1);", '66\n');
expectOut('int x = 2147483647; x++; System.out.println(x);', '-2147483648\n');
expectOut('System.out.println((int) 3.99);', '3\n');
expectOut('System.out.println(0.1 + 0.2);', '0.30000000000000004\n');
expectOut('System.out.println(1e10);', '1.0E10\n');
expectOut('int s = 0; for (int i = 1; i <= 4; i++) { if (i == 3) continue; s += i; } System.out.println(s);', '7\n');
expectOut('int n = 0; while (true) { n++; if (n > 4) break; } System.out.println(n);', '5\n');
expectOut('int k = 0; do { k += 2; } while (k < 5); System.out.println(k);', '6\n');
expectOut('String s = "Java"; System.out.println(s.length() + " " + s.charAt(0) + s.substring(1).toUpperCase());', '4 JAVA\n');
expectOut('boolean b = 3 > 2 && !(1 == 2); System.out.println(b ? "oui" : "non");', 'oui\n');
expectOut('int a = 5; a *= 2 + 1; System.out.println(a);', '15\n');
expectOut('int i = 5; int j = i++ + ++i; System.out.println(i + " " + j);', '7 12\n');
expectOut('System.out.println(Math.max(3, 8) + Math.sqrt(16));', '12.0\n');
expectOut('var x = 4; System.out.print(x); System.out.print("!"); System.out.println();', '4!\n');

expectError('int x = 5\nSystem.out.println(x);', /Point-virgule/, 3);
expectError('int x = "5";', /String ne peut pas être converti en int/);
expectError('int x = 2.5;', /perte possible de double vers int/);
expectError('System.out.println(y);', /variable y n'existe pas/);
expectError('int total = 1; System.out.println(totl);', /n'existe pas/);
expectError('int x = 1; if (x = 2) { }', /doit être un boolean/);
expectError('int x = 1; int x = 2;', /déjà déclarée/);
expectError('system.out.println("a");', /introuvable/);
expectError('System.out.printn("a");', /n'existe pas/);
expectError('x + 1;', /n'est pas une instruction|n'existe pas/);
expectError('int a = 1;\nint b = 0;\nint c = a / b;', /division par zéro/, 5);
expectError('int i = 0; while (i < 10) { }', /dépassé/);
expectError('String s = "abc"; char c = s.charAt(5);', /StringIndexOutOfBounds/);
expectError('if (true) {\n  int a = 1;\n', /Accolade fermante/);
expectError('break;', /en dehors d'une boucle/);
expectError('for (int i = 0; i < 3; i++) { } System.out.println(i);', /n'existe pas/);
expectError('int x; System.out.println(x);', /pas encore reçu de valeur/);
expectError('String s = \'abc\';', /Caractère mal écrit/);


console.log('\nTableaux, méthodes, objets');
const FILE = { before: [], after: [] };
const runFile = (src) => {
  const c = compile(src, {}, FILE);
  if (c.error) return { error: c.error };
  return execute(c.ast, { world: { cols: 1, rows: 1 } });
};
const fileOut = (label, src, want) => {
  const r = runFile(src);
  const got = r.error ? `ERREUR ${r.error.message} (ligne ${r.error.line})` : r.out;
  if (got === want) ok(label);
  else fail(`${label}\n      attendu ${JSON.stringify(want)}\n      obtenu  ${JSON.stringify(got)}`);
};
const fileErr = (label, src, re) => {
  const r = runFile(src);
  if (r.error && re.test(r.error.message)) ok(`${label} : ${r.error.message}`);
  else fail(`${label} → ${r.error ? r.error.message : 'pas d\'erreur'}`);
};
const main = (body, extra = '') => `public class Main {\n${extra}\n public static void main(String[] args) {\n${body}\n }\n}`;

expectOut('int[] t = {3, 5, 8}; int s = 0; for (int i = 0; i < t.length; i++) { s += t[i]; } System.out.println(s);', '16\n');
expectOut('int[] t = new int[3]; t[1] = 7; for (int x : t) { System.out.print(x + " "); } System.out.println();', '0 7 0 \n');
expectOut('String[] n = {"a", "b"}; n[0] = n[0] + n[1]; System.out.println(n[0] + n.length);', 'ab2\n');
expectOut('double[] p = {2.5, 1.5}; double t = 0; for (double x : p) t += x; System.out.println(t);', '4.0\n');
expectError('int[] t = {1, 2, 3}; System.out.println(t[3]);', /ArrayIndexOutOfBounds/);
expectError('int[] t = {1, 2}; System.out.println(t.length());', /sans parenthèses/);
fileOut('méthode static', main('saluer("Awa"); System.out.println(carre(4));', ' static void saluer(String p) { System.out.println("Bonjour " + p); }\n static int carre(int n) { return n * n; }'), 'Bonjour Awa\n16\n');
fileOut('récursivité', main('System.out.println(fact(5));', ' static int fact(int n) { if (n <= 1) return 1; return n * fact(n - 1); }'), '120\n');
fileErr('static oublié', main('saluer();', ' void saluer() { }'), /pas static/);
fileErr('return manquant', main('', ' static int f(int n) { if (n > 0) { return 1; } }'), /Il manque un return/);
fileErr('void utilisé', main('int x = f();', ' static void f() { }'), /void/);
const compte = `class Compte {\n private String titulaire;\n private double solde;\n Compte(String titulaire, double solde) { this.titulaire = titulaire; this.solde = solde; }\n void deposer(double m) { solde += m; }\n double getSolde() { return solde; }\n public String toString() { return titulaire + " : " + solde; }\n}\n`;
fileOut('classe + constructeur + méthodes', compte + main('Compte c = new Compte("Awa", 100); c.deposer(50); System.out.println(c.getSolde()); System.out.println(c);'), '150.0\nAwa : 150.0\n');
fileErr('private', compte + main('Compte c = new Compte("Awa", 100); c.solde = 5;'), /private/);
fileErr('constructeur inconnu', compte + main('Compte c = new Compte();'), /ne correspondent pas|paramètres/);
fileErr('null', compte + main('Compte c = null; c.deposer(5);'), /NullPointerException/);
const vehicules = `class Vehicule {\n protected String nom;\n Vehicule(String nom) { this.nom = nom; }\n String decrire() { return nom + " roule"; }\n int roues() { return 4; }\n}\nclass Velo extends Vehicule {\n Velo() { super("Vélo"); }\n @Override\n String decrire() { return nom + " pédale sur " + roues() + " roues"; }\n int roues() { return 2; }\n}\n`;
fileOut('héritage + polymorphisme', vehicules + main('Vehicule[] p = {new Vehicule("Bus"), new Velo()}; for (Vehicule v : p) { System.out.println(v.decrire()); }'), 'Bus roule\nVélo pédale sur 2 roues\n');
fileErr('super manquant', 'class A { A(int x) { } }\nclass B extends A { B() { } }\n' + main(''), /super/);
fileErr('@Override faux', 'class A { void f() { } }\nclass B extends A { @Override void g() { } }\n' + main(''), /Override/);
fileOut('toString par défaut', 'class P { }\n' + main('P p = new P(); System.out.println(p.toString().startsWith("P@"));'), 'true\n');
fileOut('static champ', main('compteur++; compteur++; System.out.println(compteur);', ' static int compteur = 0;'), '2\n');
fileErr('StackOverflow', main('f(1);', ' static void f(int n) { f(n + 1); }'), /StackOverflow/);


console.log('\nClasses abstraites et interfaces');
const formes = `abstract class Forme {\n abstract double aire();\n String decrire() { return "Aire : " + aire(); }\n}\nclass Carre extends Forme {\n double c;\n Carre(double c) { this.c = c; }\n double aire() { return c * c; }\n}\n`;
fileOut('classe abstraite', formes + main('Forme f = new Carre(3); System.out.println(f.decrire());'), 'Aire : 9.0\n');
fileErr('new sur abstraite', formes + main('Forme f = new Forme();'), /abstraite/);
fileErr('méthode abstraite oubliée', 'abstract class A { abstract int f(); }\nclass B extends A { }\n' + main(''), /doit écrire la méthode/);
fileErr('abstract sans classe abstract', 'class A { abstract int f(); }\n' + main(''), /doit elle-même être déclarée abstract/);
const iface = `interface Rechargeable {\n int batterie();\n void recharger();\n}\ninterface Volant { String voler(); }\nclass Drone implements Rechargeable, Volant {\n private int b = 30;\n public int batterie() { return b; }\n public void recharger() { b = 100; }\n public String voler() { return "Je vole"; }\n}\n`;
fileOut('interfaces multiples', iface + main('Rechargeable r = new Drone(); r.recharger(); System.out.println(r.batterie()); Volant v = new Drone(); System.out.println(v.voler());'), '100\nJe vole\n');
fileErr('public oublié', 'interface I { void f(); }\nclass A implements I { void f() { } }\n' + main(''), /public/);
fileErr('new interface', 'interface I { void f(); }\n' + main('I i = new I();'), /interface/);
fileErr('extends interface', 'interface I { void f(); }\nclass A extends I { public void f() { } }\n' + main(''), /implements/);
fileErr('méthode interface manquante', 'interface I { void f(); }\nclass A implements I { }\n' + main(''), /doit écrire la méthode void f\(\)/);
fileOut('tableau d\'interface', iface + main('Rechargeable[] t = {new Drone(), new Drone()}; int s = 0; for (Rechargeable r : t) { s += r.batterie(); } System.out.println(s);'), '60\n');

console.log(failures ? `\n${failures} échec(s)` : '\nTout est vert.');
process.exit(failures ? 1 : 0);
