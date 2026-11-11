import { expectOutput } from '../validators.js';

const SCREEN = ['.....', '..T..', '.....'];

/** Cadre : l'élève écrit une classe ; la classe Main (fixe) s'en sert. */
const useClass = (...lines) => ({
  before: [],
  after: ['', 'public class Main {', '    public static void main(String[] args) {', ...lines.map((l) => `        ${l}`), '    }', '}'],
  indent: 2,
});

const classNode = (ast, name) => ast.classes.find((c) => c.name === name);

const FIELDS = 'class Compte {\n    String titulaire;\n    double solde;\n';
const CTOR = '\n    Compte(String titulaire, double solde) {\n        this.titulaire = titulaire;\n        this.solde = solde;\n    }\n';

export default {
  id: 'objets',
  num: 7,
  title: 'Classes et objets',
  place: 'La banque',
  summary: 'Modéliser un compte bancaire : attributs, constructeur, méthodes et encapsulation.',
  levels: [
    {
      id: '7-1',
      title: 'La classe Compte',
      story: 'La banque veut un programme pour ses comptes. Chaque compte a un titulaire et un solde.',
      goal: [
        'Dans la classe `Compte`, déclare deux **attributs** : `String titulaire;` et `double solde;`.',
        'Le main crée un compte avec `new Compte()` et remplit ses attributs. Regarde la fiche de l\'objet apparaître dans la mémoire.',
      ],
      notion: {
        title: 'Classe et objet',
        text: 'Une classe est un plan : elle décrit ce que contient chaque objet (ses attributs). new crée un objet à partir de ce plan. On accède à un attribut avec un point : c.solde.',
        code: 'class Chat {\n    String nom;\n    int age;\n}\n// Chat c = new Chat(); c.nom = "Mimi";',
      },
      objects: [],
      frame: useClass('Compte c = new Compte();', 'c.titulaire = "Awa";', 'c.solde = 100;', 'System.out.println(c.titulaire + " a " + c.solde + " €");'),
      starter: 'class Compte {\n    \n}\n',
      solution: 'class Compte {\n    String titulaire;\n    double solde;\n}\n',
      hints: ['Un attribut se déclare comme une variable, mais directement dans la classe.', 'String titulaire;  puis  double solde;'],
      tests: [{ world: { map: SCREEN } }],
      check: (run) => expectOutput(run, ['Awa a 100.0 €']),
    },
    {
      id: '7-2',
      title: 'Le constructeur',
      story: 'Ouvrir un compte en trois lignes, c\'est long. Un constructeur remplit l\'objet dès sa création.',
      goal: [
        'Ajoute un constructeur `Compte(String titulaire, double solde)` qui range ses paramètres dans les attributs.',
        'Utilise `this.titulaire = titulaire;` : `this` désigne l\'objet en train d\'être créé.',
      ],
      notion: {
        title: 'Le constructeur',
        text: 'Le constructeur porte le nom de la classe et n\'a pas de type de retour. Il s\'exécute à chaque new. this.x désigne l\'attribut x de l\'objet, x tout seul désigne le paramètre.',
        code: 'Chat(String nom) {\n    this.nom = nom;\n}',
      },
      objects: [],
      frame: useClass('Compte a = new Compte("Awa", 100);', 'Compte b = new Compte("Léo", 40);', 'System.out.println(a.titulaire + " : " + a.solde);', 'System.out.println(b.titulaire + " : " + b.solde);'),
      starter: `${FIELDS}\n}\n`,
      solution: `${FIELDS}${CTOR}}\n`,
      hints: ['Compte(String titulaire, double solde) { … }  — pas de void, pas de type de retour.', 'Dans le constructeur : this.titulaire = titulaire;  this.solde = solde;'],
      tests: [{ world: { map: SCREEN } }],
      check: (run) => {
        if (run.out.includes('null') || run.out.includes(': 0.0')) {
          return 'Les attributs sont restés vides : as-tu bien écrit this.titulaire = titulaire ? (Sans this, on recopie le paramètre dans lui-même.)';
        }
        return expectOutput(run, ['Awa : 100.0', 'Léo : 40.0']);
      },
    },
    {
      id: '7-3',
      title: 'Déposer et retirer',
      story: 'Le client dépose 50 € puis retire 30 €. Ces opérations doivent faire partie du compte lui-même.',
      goal: [
        'Ajoute la méthode `void deposer(double montant)` qui augmente le solde, et `void retirer(double montant)` qui le diminue.',
        'Ces méthodes ne sont pas static : elles agissent sur **l\'objet** sur lequel on les appelle (`c.deposer(50)`).',
      ],
      notion: {
        title: 'Les méthodes d\'un objet',
        text: 'Une méthode d\'instance (sans static) travaille sur les attributs de l\'objet qui l\'appelle. Dans c.deposer(50), la méthode modifie le solde de c.',
        code: 'void anniversaire() {\n    age = age + 1;\n}',
      },
      objects: [],
      frame: useClass('Compte c = new Compte("Awa", 100);', 'c.deposer(50);', 'c.retirer(30);', 'System.out.println(c.solde);'),
      starter: `${FIELDS}${CTOR}\n}\n`,
      solution: `${FIELDS}${CTOR}\n    void deposer(double montant) {\n        solde = solde + montant;\n    }\n\n    void retirer(double montant) {\n        solde = solde - montant;\n    }\n}\n`,
      hints: ['void deposer(double montant) { solde = solde + montant; }', 'Même idée pour retirer, avec une soustraction.'],
      tests: [{ world: { map: SCREEN } }],
      check: (run) => expectOutput(run, ['120.0']),
    },
    {
      id: '7-4',
      title: 'L\'encapsulation',
      story: 'Problème : n\'importe qui peut écrire c.solde = 1000000 ! La banque veut protéger le solde.',
      goal: [
        'Rends les attributs `private`, et ajoute `double getSolde()` qui renvoie le solde.',
        'Dans `retirer`, refuse le retrait si le solde ne suffit pas : affiche `Solde insuffisant` et ne change rien.',
      ],
      notion: {
        title: 'private et les getters',
        text: 'Un attribut private n\'est visible que dans sa classe. Les autres passent par des méthodes (getters) : la classe garde le contrôle et peut vérifier les règles, comme « pas de solde négatif ».',
        code: 'private int age;\n\nint getAge() {\n    return age;\n}',
      },
      objects: [],
      frame: useClass('Compte c = new Compte("Awa", 100);', 'c.retirer(30);', 'c.retirer(500);', 'System.out.println(c.getSolde());'),
      starter: `${FIELDS}${CTOR}\n    void deposer(double montant) {\n        solde = solde + montant;\n    }\n\n    void retirer(double montant) {\n        solde = solde - montant;\n    }\n}\n`,
      solution: `class Compte {\n    private String titulaire;\n    private double solde;\n${CTOR}\n    double getSolde() {\n        return solde;\n    }\n\n    void deposer(double montant) {\n        solde = solde + montant;\n    }\n\n    void retirer(double montant) {\n        if (montant > solde) {\n            System.out.println("Solde insuffisant");\n        } else {\n            solde = solde - montant;\n        }\n    }\n}\n`,
      hints: ['private String titulaire;  private double solde;  et  double getSolde() { return solde; }', 'Dans retirer : if (montant > solde) { … } else { … }'],
      tests: [{ world: { map: SCREEN } }],
      check: (run) => expectOutput(run, ['Solde insuffisant', '70.0']),
      rules: (src, ast) => {
        const c = classNode(ast, 'Compte');
        if (!c) return 'La classe Compte a disparu.';
        const open = c.fields.filter((f) => !f.mods.private);
        return open.length ? `Rends private l'attribut ${open.map((f) => f.name).join(' et ')}.` : null;
      },
    },
  ],
};
