import { codeOnly, expectOutput } from '../validators.js';

const SCREEN = ['.....', '..T..', '.....'];

const mainLines = (lines) => ['', 'public class Main {', '    public static void main(String[] args) {', ...lines.map((l) => `        ${l}`), '    }', '}'];

const find = (ast, name) => ast.classes.find((c) => c.name === name);

// ---------- 9-1 : la boutique et ses moyens de paiement ----------
const PAIEMENT = [
  'abstract class Paiement {',
  '    protected double montant;',
  '',
  '    Paiement(double montant) {',
  '        this.montant = montant;',
  '    }',
  '',
  '    abstract double frais();',
  '',
  '    String recu() {',
  '        return "Montant : " + montant + " €, frais : " + frais() + " €";',
  '    }',
  '}',
  '',
];

// ---------- 9-2 : le devis du peintre ----------
const FORMES = [
  '',
  'class Mur extends Surface {',
  '    private double largeur, hauteur;',
  '',
  '    Mur(double largeur, double hauteur) {',
  '        this.largeur = largeur;',
  '        this.hauteur = hauteur;',
  '    }',
  '',
  '    double aire() {',
  '        return largeur * hauteur;',
  '    }',
  '}',
  '',
  'class Pignon extends Surface {',
  '    private double base, hauteur;',
  '',
  '    Pignon(double base, double hauteur) {',
  '        this.base = base;',
  '        this.hauteur = hauteur;',
  '    }',
  '',
  '    double aire() {',
  '        return base * hauteur / 2;',
  '    }',
  '}',
];

// ---------- 9-3 et 9-4 : les appareils rechargeables ----------
const RECHARGEABLE = [
  'interface Rechargeable {',
  '    int batterie();',
  '    void recharger();',
  '}',
  '',
];
const VOLANT = [
  'interface Volant {',
  '    String voler();',
  '}',
  '',
];

// ---------- 9-5 : le comptable ----------
const PAYABLE = [
  'interface Payable {',
  '    double montantDu();',
  '}',
  '',
  'class Facture implements Payable {',
  '    private String fournisseur;',
  '    private double montant;',
  '',
  '    Facture(String fournisseur, double montant) {',
  '        this.fournisseur = fournisseur;',
  '        this.montant = montant;',
  '    }',
  '',
  '    public double montantDu() {',
  '        return montant;',
  '    }',
  '}',
  '',
  'class Salaire implements Payable {',
  '    private String employe;',
  '    private double brut;',
  '',
  '    Salaire(String employe, double brut) {',
  '        this.employe = employe;',
  '        this.brut = brut;',
  '    }',
  '',
  '    public double montantDu() {',
  '        return brut * 0.78;',
  '    }',
  '}',
  '',
  'public class Main {',
  '    public static void main(String[] args) {',
  '        Payable[] aPayer = {new Facture("Électricité", 80), new Salaire("Awa", 1500), new Facture("Internet", 30)};',
];

export default {
  id: 'poo',
  num: 9,
  title: 'POO approfondie',
  place: 'La boutique et l\'entreprise',
  summary: 'Classes abstraites et interfaces : décrire ce que les objets savent faire, sans dire comment.',
  levels: [
    {
      id: '9-1',
      title: 'Les moyens de paiement',
      story: 'La boutique accepte la carte bancaire et les espèces. Chaque moyen de paiement calcule ses frais à sa façon.',
      goal: [
        'La classe `Paiement` (en haut) est **abstraite** : elle déclare `frais()` sans l\'écrire.',
        'Écris `CarteBancaire` (frais : 1 % du montant, soit `montant * 0.01`) et `Especes` (aucun frais : `0`). Chacune hérite de Paiement.',
      ],
      notion: {
        title: 'Une classe abstraite',
        text: 'Une classe abstract est un modèle incomplet : on ne peut pas créer d\'objet avec new. Ses méthodes abstract n\'ont pas de corps : chaque sous-classe est obligée de les écrire.',
        code: 'abstract class Animal {\n    abstract String cri();\n}\nclass Chat extends Animal {\n    String cri() { return "Miaou"; }\n}',
      },
      objects: [],
      frame: {
        before: PAIEMENT,
        after: mainLines(['Paiement[] caisse = {new CarteBancaire(50), new Especes(20)};', 'for (Paiement p : caisse) {', '    System.out.println(p.recu());', '}']),
        indent: 2,
      },
      starter: '// Écris ici les classes CarteBancaire et Especes\n',
      solution: 'class CarteBancaire extends Paiement {\n    CarteBancaire(double montant) {\n        super(montant);\n    }\n\n    double frais() {\n        return montant * 0.01;\n    }\n}\n\nclass Especes extends Paiement {\n    Especes(double montant) {\n        super(montant);\n    }\n\n    double frais() {\n        return 0;\n    }\n}\n',
      hints: ['Chaque classe : extends Paiement, un constructeur qui appelle super(montant), et la méthode double frais().', 'Pour la carte : return montant * 0.01;  pour les espèces : return 0;'],
      tests: [{ world: { map: SCREEN } }],
      check: (run) => expectOutput(run, ['Montant : 50.0 €, frais : 0.5 €', 'Montant : 20.0 €, frais : 0.0 €']),
    },
    {
      id: '9-2',
      title: 'Le devis du peintre',
      story: 'Un peintre fait un devis : 12 € par m². Il peint des murs rectangulaires et des pignons triangulaires. Les classes Mur et Pignon existent déjà (en bas), mais leur parent manque.',
      goal: [
        'Écris la classe abstraite `Surface` avec la méthode abstraite `double aire();`.',
        'Ajoute-lui une méthode normale `double prix()` qui renvoie `aire() * 12`. Mur et Pignon en hériteront sans rien changer.',
      ],
      notion: {
        title: 'Appeler une méthode abstraite',
        text: 'Une classe abstraite peut utiliser sa propre méthode abstraite : prix() appelle aire() sans savoir comment elle est calculée. À l\'exécution, c\'est la version de Mur ou de Pignon qui est appelée.',
        code: 'abstract class Forme {\n    abstract double aire();\n    double aireDouble() { return aire() * 2; }\n}',
      },
      objects: [],
      frame: {
        before: [],
        after: [...FORMES, ...mainLines(['Surface[] devis = {new Mur(4, 2.5), new Pignon(4, 3)};', 'for (Surface s : devis) {', '    System.out.println(s.aire() + " m² : " + s.prix() + " €");', '}'])],
        indent: 2,
      },
      starter: '// Écris ici la classe abstraite Surface\n',
      solution: 'abstract class Surface {\n    abstract double aire();\n\n    double prix() {\n        return aire() * 12;\n    }\n}\n',
      hints: ['abstract class Surface { … }', 'abstract double aire();  puis  double prix() { return aire() * 12; }'],
      tests: [{ world: { map: SCREEN } }],
      check: (run) => expectOutput(run, ['10.0 m² : 120.0 €', '6.0 m² : 72.0 €']),
      rules: (src, ast) => (find(ast, 'Surface')?.mods.abstract ? null : 'La classe Surface doit être abstract.'),
    },
    {
      id: '9-3',
      title: 'L\'interface Rechargeable',
      story: 'Téléphones, trottinettes, enceintes… Tous ces appareils se rechargent, sans avoir de parent commun. Une interface décrit ce point commun.',
      goal: [
        'Écris `class Telephone implements Rechargeable` avec un attribut `private int batterie = 20;`.',
        'Écris les deux méthodes de l\'interface, en **public** : `batterie()` renvoie le niveau, `recharger()` le met à 100.',
      ],
      notion: {
        title: 'Une interface',
        text: 'Une interface est un contrat : la liste des méthodes qu\'une classe promet d\'avoir. Avec implements, la classe s\'engage à toutes les écrire, et en public.',
        code: 'interface Sonore {\n    String son();\n}\nclass Cloche implements Sonore {\n    public String son() { return "Ding"; }\n}',
      },
      objects: [],
      frame: {
        before: RECHARGEABLE,
        after: mainLines(['Telephone t = new Telephone();', 'System.out.println("Batterie : " + t.batterie() + " %");', 't.recharger();', 'System.out.println("Batterie : " + t.batterie() + " %");']),
        indent: 2,
      },
      starter: '// Écris ici la classe Telephone\n',
      solution: 'class Telephone implements Rechargeable {\n    private int batterie = 20;\n\n    public int batterie() {\n        return batterie;\n    }\n\n    public void recharger() {\n        batterie = 100;\n    }\n}\n',
      hints: ['class Telephone implements Rechargeable { … }', 'public int batterie() { return batterie; }  et  public void recharger() { batterie = 100; }'],
      tests: [{ world: { map: SCREEN } }],
      check: (run) => expectOutput(run, ['Batterie : 20 %', 'Batterie : 100 %']),
    },
    {
      id: '9-4',
      title: 'Le drone livreur',
      story: 'Le drone de livraison se recharge ET il vole. Une classe ne peut avoir qu\'un seul parent, mais elle peut respecter plusieurs interfaces.',
      goal: [
        'Écris `class Drone implements Rechargeable, Volant` (batterie de départ : 50).',
        '`voler()` renvoie `"Le drone décolle"`. Le main utilise le même drone comme un Rechargeable puis comme un Volant.',
      ],
      notion: {
        title: 'Plusieurs interfaces',
        text: 'class X implements A, B : X respecte les deux contrats. Un objet X peut alors être rangé dans une variable de type A ou de type B.',
        code: 'class Canard implements Nageur, Volant {\n    // …\n}',
      },
      objects: [],
      frame: {
        before: [...RECHARGEABLE, ...VOLANT],
        after: mainLines(['Drone d = new Drone();', 'Rechargeable r = d;', 'Volant v = d;', 'System.out.println(v.voler());', 'r.recharger();', 'System.out.println("Batterie : " + r.batterie() + " %");']),
        indent: 2,
      },
      starter: '// Écris ici la classe Drone\n',
      solution: 'class Drone implements Rechargeable, Volant {\n    private int batterie = 50;\n\n    public int batterie() {\n        return batterie;\n    }\n\n    public void recharger() {\n        batterie = 100;\n    }\n\n    public String voler() {\n        return "Le drone décolle";\n    }\n}\n',
      hints: ['class Drone implements Rechargeable, Volant { … }', 'Trois méthodes public : batterie(), recharger() et voler().'],
      tests: [{ world: { map: SCREEN } }],
      check: (run) => expectOutput(run, ['Le drone décolle', 'Batterie : 100 %']),
    },
    {
      id: '9-5',
      title: 'Le comptable',
      story: 'Le comptable doit payer des factures et des salaires. Ce sont des objets très différents, mais tous sont « Payable » : ils ont un montant à payer.',
      goal: [
        'Dans le main, calcule le total de `montantDu()` pour tous les éléments du tableau `aPayer`.',
        'Affiche `Total à payer : …`. Tu n\'as pas besoin de savoir si c\'est une facture ou un salaire !',
      ],
      notion: {
        title: 'Programmer avec une interface',
        text: 'En manipulant des Payable, ton code marche pour toutes les classes qui respectent ce contrat, même celles qui seront créées plus tard. C\'est la force du polymorphisme.',
        code: 'for (Payable p : aPayer) {\n    // p.montantDu() appelle la bonne version\n}',
      },
      objects: [],
      frame: { before: PAYABLE, after: ['    }', '}'], indent: 8 },
      starter: 'double total = 0;\n\n',
      solution: 'double total = 0;\nfor (Payable p : aPayer) {\n    total += p.montantDu();\n}\nSystem.out.println("Total à payer : " + total + " €");\n',
      hints: ['for (Payable p : aPayer) { total += p.montantDu(); }', 'System.out.println("Total à payer : " + total + " €");'],
      tests: [{ world: { map: SCREEN } }],
      check: (run) => expectOutput(run, ['Total à payer : 1280.0 €']),
      rules: (src) => (/montantDu\s*\(/.test(codeOnly(src)) ? null : 'Utilise la méthode montantDu() de chaque élément.'),
    },
  ],
};
