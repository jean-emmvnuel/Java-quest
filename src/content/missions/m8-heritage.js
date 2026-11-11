import { expectOutput } from '../validators.js';

const SCREEN = ['.....', '..T..', '.....'];

// La classe Vehicule est fournie (fixe, au-dessus) ; l'élève écrit les sous-classes ; le main est en dessous.
const VEHICULE = [
  'class Vehicule {',
  '    protected String nom;',
  '    protected int roues;',
  '',
  '    Vehicule(String nom, int roues) {',
  '        this.nom = nom;',
  '        this.roues = roues;',
  '    }',
  '',
  '    String decrire() {',
  '        return nom + " a " + roues + " roues";',
  '    }',
  '',
  '    String klaxonner() {',
  '        return "Tut tut";',
  '    }',
  '',
  '    double coutParKm() {',
  '        return 0.25;',
  '    }',
  '}',
  '',
];

const frame = (...lines) => ({
  before: VEHICULE,
  after: ['', 'public class Main {', '    public static void main(String[] args) {', ...lines.map((l) => `        ${l}`), '    }', '}'],
  indent: 2,
});

const extendsCheck = (ast, name) => {
  const c = ast.classes.find((k) => k.name === name);
  if (!c) return `Écris la classe ${name}.`;
  if (c.superName !== 'Vehicule') return `${name} doit hériter de Vehicule : class ${name} extends Vehicule`;
  return null;
};

export default {
  id: 'heritage',
  num: 8,
  title: 'Héritage',
  place: 'Le parc de véhicules',
  summary: 'Voiture, vélo, camion : partager un comportement commun et le spécialiser.',
  levels: [
    {
      id: '8-1',
      title: 'La voiture est un véhicule',
      story: 'La mairie gère un parc de véhicules. La classe Vehicule existe déjà (en haut). Une voiture, c\'est un véhicule à 4 roues.',
      goal: [
        'Écris `class Voiture extends Vehicule` avec un constructeur `Voiture(String nom)`.',
        'Ce constructeur appelle celui de Vehicule avec `super(nom, 4);`. Voiture hérite alors de `decrire()` sans la réécrire.',
      ],
      notion: {
        title: 'extends et super',
        text: 'class B extends A : B hérite des attributs et des méthodes de A. Le constructeur de B commence par super(…) pour construire d\'abord la partie A de l\'objet.',
        code: 'class Chien extends Animal {\n    Chien(String nom) {\n        super(nom);\n    }\n}',
      },
      objects: [],
      frame: frame('Voiture v = new Voiture("Taxi");', 'System.out.println(v.decrire());'),
      starter: '// Écris ici la classe Voiture\n',
      solution: 'class Voiture extends Vehicule {\n    Voiture(String nom) {\n        super(nom, 4);\n    }\n}\n',
      hints: ['class Voiture extends Vehicule { … }', 'Le constructeur : Voiture(String nom) { super(nom, 4); }'],
      tests: [{ world: { map: SCREEN } }],
      check: (run) => expectOutput(run, ['Taxi a 4 roues']),
      rules: (src, ast) => extendsCheck(ast, 'Voiture'),
    },
    {
      id: '8-2',
      title: 'Redéfinir une méthode',
      story: 'Un vélo ne fait pas « Tut tut » : il fait « Dring dring » !',
      goal: [
        'Écris `class Velo extends Vehicule` (2 roues) qui **redéfinit** `String klaxonner()` pour renvoyer `"Dring dring"`.',
        'Place `@Override` au-dessus : Java vérifiera que la méthode existe bien dans Vehicule.',
      ],
      notion: {
        title: 'Redéfinir (@Override)',
        text: 'Une sous-classe peut remplacer une méthode héritée en la réécrivant avec exactement le même nom et les mêmes paramètres. @Override demande à Java de vérifier qu\'elle existe dans la classe parente.',
        code: '@Override\nString crier() {\n    return "Wouf";\n}',
      },
      objects: [],
      frame: frame('Vehicule[] parc = {new Vehicule("Bus", 6), new Velo("Vélo bleu")};', 'for (Vehicule v : parc) {', '    System.out.println(v.decrire() + " : " + v.klaxonner());', '}'),
      starter: '// Écris ici la classe Velo\n',
      solution: 'class Velo extends Vehicule {\n    Velo(String nom) {\n        super(nom, 2);\n    }\n\n    @Override\n    String klaxonner() {\n        return "Dring dring";\n    }\n}\n',
      hints: ['Le constructeur : Velo(String nom) { super(nom, 2); }', '@Override\nString klaxonner() { return "Dring dring"; }'],
      tests: [{ world: { map: SCREEN } }],
      check: (run) => expectOutput(run, ['Bus a 6 roues : Tut tut', 'Vélo bleu a 2 roues : Dring dring']),
      rules: (src, ast) => {
        const err = extendsCheck(ast, 'Velo');
        if (err) return err;
        const m = ast.classes.find((k) => k.name === 'Velo').methods.find((x) => x.name === 'klaxonner');
        return m && m.mods.annotations.some((a) => a.name === 'Override') ? null : 'Ajoute @Override au-dessus de klaxonner().';
      },
    },
    {
      id: '8-3',
      title: 'Le polymorphisme',
      story: 'La mairie calcule le coût d\'un trajet de 100 km pour chaque véhicule. Un camion coûte plus cher, une trottinette beaucoup moins.',
      goal: [
        'Écris `Camion` (6 roues, `coutParKm()` renvoie 0.5) et `Trottinette` (2 roues, `coutParKm()` renvoie 0.05).',
        'Le main parcourt un tableau de `Vehicule` : pour chaque objet, Java appelle automatiquement la bonne version de `coutParKm()`.',
      ],
      notion: {
        title: 'Le polymorphisme',
        text: 'Une variable de type Vehicule peut contenir un Camion ou une Trottinette. Quand on appelle v.coutParKm(), Java exécute la version de la classe réelle de l\'objet. Observe-le en Pas à pas !',
        code: 'Animal a = new Chien("Rex");\na.crier(); // version de Chien',
      },
      objects: [],
      frame: frame(
        'Vehicule[] parc = {new Vehicule("Voiture", 4), new Camion("Camion"), new Trottinette("Trottinette")};',
        'for (Vehicule v : parc) {',
        '    System.out.println(v.nom + " : " + v.coutParKm() * 100 + " €");',
        '}',
      ),
      starter: '// Écris ici les classes Camion et Trottinette\n',
      solution: 'class Camion extends Vehicule {\n    Camion(String nom) {\n        super(nom, 6);\n    }\n\n    @Override\n    double coutParKm() {\n        return 0.5;\n    }\n}\n\nclass Trottinette extends Vehicule {\n    Trottinette(String nom) {\n        super(nom, 2);\n    }\n\n    @Override\n    double coutParKm() {\n        return 0.05;\n    }\n}\n',
      hints: ['Deux classes, chacune avec extends Vehicule, un constructeur qui appelle super(nom, …) et une méthode coutParKm() redéfinie.', '@Override\ndouble coutParKm() { return 0.5; }'],
      tests: [{ world: { map: SCREEN } }],
      check: (run) => expectOutput(run, ['Voiture : 25.0 €', 'Camion : 50.0 €', 'Trottinette : 5.0 €']),
      rules: (src, ast) => extendsCheck(ast, 'Camion') ?? extendsCheck(ast, 'Trottinette'),
    },
  ],
};
