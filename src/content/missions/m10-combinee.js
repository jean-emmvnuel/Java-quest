import { codeOnly, expectOutput, goalCheck, hasNumber, stripComments } from '../validators.js';

const SCREEN = ['.....', '..T..', '.....'];

const mainLines = (lines) => ['    public static void main(String[] args) {', ...lines.map((l) => `        ${l}`), '    }', '}'];
const methodsFrame = (...lines) => ({ before: ['public class Main {', ''], after: ['', ...mainLines(lines)], indent: 4 });
const classFrame = (before, ...lines) => ({ before, after: ['', 'public class Main {', ...mainLines(lines)], indent: 2 });

// ---------- 10-4 : la flotte de livraison ----------
const TRANSPORT = [
  'interface Transport {',
  '    String nom();',
  '    boolean peutLivrer(int km);',
  '    double cout(int km);',
  '}',
  '',
];
const CHOIX = [
  'Transport[] flotte = {new VeloCargo(), new Camionnette()};',
  'int[] distances = {3, 40};',
  'for (int km : distances) {',
  '    Transport choix = null;',
  '    for (Transport t : flotte) {',
  '        if (t.peutLivrer(km) && (choix == null || t.cout(km) < choix.cout(km))) {',
  '            choix = t;',
  '        }',
  '    }',
  '    System.out.println(km + " km : " + choix.nom() + " (" + choix.cout(km) + " €)");',
  '}',
];

// ---------- 10-5 : le bilan de la journée ----------
const COMMANDES = [
  'class Commande {',
  '    private String client;',
  '    private double montant;',
  '    private boolean livree;',
  '',
  '    Commande(String client, double montant, boolean livree) {',
  '        this.client = client;',
  '        this.montant = montant;',
  '        this.livree = livree;',
  '    }',
  '',
  '    String getClient() { return client; }',
  '    double getMontant() { return montant; }',
  '    boolean estLivree() { return livree; }',
  '}',
  '',
  'public class Main {',
  '    public static void main(String[] args) {',
  '        Commande[] commandes = {',
  '            new Commande("Awa", 45.5, true),',
  '            new Commande("Léo", 120, false),',
  '            new Commande("Inès", 80, true),',
  '            new Commande("Tom", 15, true)',
  '        };',
];

export default {
  id: 'combinee',
  num: 10,
  title: 'Mission combinée',
  place: 'La journée de l\'entrepôt',
  summary: 'Une journée complète à l\'entrepôt : chaque niveau mélange plusieurs notions vues jusqu\'ici.',
  levels: [
    {
      id: '10-1',
      title: 'Le tri des colis',
      story: 'Huit heures du matin : les colis arrivent. Ceux de plus de 20 kg doivent partir au quai des charges lourdes.',
      goal: [
        'Écris `static int compterLourds(int[] poids)` qui renvoie le nombre de colis de **plus de 20 kg**.',
        'Écris `static int poidsTotal(int[] poids)` qui renvoie la somme de tous les poids. Ton code est testé avec deux arrivages.',
      ],
      notion: {
        title: 'Méthodes + tableaux + boucles',
        text: 'Une méthode peut recevoir un tableau en paramètre et le parcourir. Elle renvoie ensuite un résultat calculé, que le main affiche.',
        code: 'static int compterPairs(int[] t) {\n    int n = 0;\n    for (int x : t) {\n        if (x % 2 == 0) n++;\n    }\n    return n;\n}',
      },
      objects: ['entrepot'],
      frame: methodsFrame('int[] poids = entrepot.poids();', 'System.out.println("Colis lourds : " + compterLourds(poids));', 'System.out.println("Poids total : " + poidsTotal(poids) + " kg");'),
      starter: '// Écris ici compterLourds et poidsTotal\n',
      solution: 'static int compterLourds(int[] poids) {\n    int n = 0;\n    for (int p : poids) {\n        if (p > 20) {\n            n++;\n        }\n    }\n    return n;\n}\n\nstatic int poidsTotal(int[] poids) {\n    int total = 0;\n    for (int p : poids) {\n        total += p;\n    }\n    return total;\n}\n',
      hints: ['Deux méthodes static int, chacune avec une boucle for (int p : poids).', 'compterLourds : if (p > 20) n++;  poidsTotal : total += p;  et n\'oublie pas les return.'],
      tests: [
        { label: 'Arrivage 1', world: { map: SCREEN, poids: [12, 25, 8, 30, 21] } },
        { label: 'Arrivage 2', world: { map: SCREEN, poids: [5, 7, 20] } },
      ],
      check: (run, { test }) => {
        const p = test.world.poids;
        return expectOutput(run, [`Colis lourds : ${p.filter((x) => x > 20).length}`, `Poids total : ${p.reduce((a, b) => a + b, 0)} kg`]);
      },
    },
    {
      id: '10-2',
      title: 'Le robot préparateur',
      story: 'Le robot doit traverser l\'entrepôt jusqu\'au quai de chargement. Les allées changent selon les jours, mais le trajet suit toujours les murs.',
      goal: [
        'Écris `static int allerAuMur()` : le robot avance tant qu\'il n\'est pas devant un mur, puis la méthode **renvoie le nombre de cases** parcourues.',
        'Le main l\'utilise trois fois et affiche la distance totale. Testé dans deux plans.',
      ],
      notion: {
        title: 'Méthode + while + compteur',
        text: 'Une méthode peut agir (faire avancer le robot) ET renvoyer un résultat (combien de pas). Le compteur est une variable locale de la méthode.',
        code: 'static int marcher() {\n    int pas = 0;\n    while (/* … */) {\n        pas++;\n    }\n    return pas;\n}',
      },
      objects: ['robot'],
      frame: methodsFrame('int distance = allerAuMur();', 'robot.tournerDroite();', 'distance += allerAuMur();', 'robot.tournerGauche();', 'distance += allerAuMur();', 'System.out.println("Distance : " + distance + " cases");'),
      starter: '// Écris ici la méthode allerAuMur\n',
      solution: 'static int allerAuMur() {\n    int pas = 0;\n    while (!robot.devantMur()) {\n        robot.avancer();\n        pas++;\n    }\n    return pas;\n}\n',
      hints: ['int pas = 0;  puis  while (!robot.devantMur()) { … }', 'Dans la boucle : robot.avancer(); pas++;  après la boucle : return pas;'],
      tests: [
        { label: 'Plan A', world: { map: ['R..####', '##.####', '##...G#', '#######'] }, distance: 7 },
        { label: 'Plan B', world: { map: ['R....####', '####.####', '####.####', '####...G#', '#########'] }, distance: 10 },
      ],
      check: (run, { test }) => goalCheck(run) ?? expectOutput(run, [`Distance : ${test.distance} cases`]),
    },
    {
      id: '10-3',
      title: 'Le catalogue',
      story: 'Le responsable veut connaître la valeur du stock : pour chaque produit, prix × quantité, et une alerte quand un produit est épuisé.',
      goal: [
        'Écris la classe `Produit` : attributs **private** `nom`, `prix` (double) et `stock` (int), un constructeur, et les méthodes `getNom()`, `valeurStock()` (prix × stock) et `enRupture()` (stock à 0).',
        'Le main (en bas) parcourt le catalogue et affiche le bilan.',
      ],
      notion: {
        title: 'Une classe complète',
        text: 'Attributs privés, constructeur, getters et méthodes de calcul : c\'est la forme habituelle d\'une classe Java bien encapsulée.',
        code: 'class Livre {\n    private String titre;\n    Livre(String titre) { this.titre = titre; }\n    String getTitre() { return titre; }\n}',
      },
      objects: [],
      frame: classFrame([],
        'Produit[] catalogue = {new Produit("Clavier", 25.0, 4), new Produit("Souris", 12.5, 0), new Produit("Écran", 150.0, 2)};',
        'double total = 0;',
        'for (Produit p : catalogue) {',
        '    if (p.enRupture()) {',
        '        System.out.println(p.getNom() + " : en rupture !");',
        '    } else {',
        '        System.out.println(p.getNom() + " : " + p.valeurStock() + " €");',
        '    }',
        '    total += p.valeurStock();',
        '}',
        'System.out.println("Valeur du stock : " + total + " €");'),
      starter: 'class Produit {\n    \n}\n',
      solution: 'class Produit {\n    private String nom;\n    private double prix;\n    private int stock;\n\n    Produit(String nom, double prix, int stock) {\n        this.nom = nom;\n        this.prix = prix;\n        this.stock = stock;\n    }\n\n    String getNom() {\n        return nom;\n    }\n\n    double valeurStock() {\n        return prix * stock;\n    }\n\n    boolean enRupture() {\n        return stock == 0;\n    }\n}\n',
      hints: ['Le constructeur : Produit(String nom, double prix, int stock) { this.nom = nom; … }', 'double valeurStock() { return prix * stock; }  et  boolean enRupture() { return stock == 0; }'],
      tests: [{ world: { map: SCREEN } }],
      check: (run) => expectOutput(run, ['Clavier : 100.0 €', 'Souris : en rupture !', 'Écran : 300.0 €', 'Valeur du stock : 400.0 €']),
      rules: (src, ast) => {
        const c = ast.classes.find((k) => k.name === 'Produit');
        const open = c?.fields.filter((f) => !f.mods.private) ?? [];
        return open.length ? `Rends private l'attribut ${open.map((f) => f.name).join(' et ')}.` : null;
      },
    },
    {
      id: '10-4',
      title: 'La flotte de livraison',
      story: 'Pour chaque livraison, l\'entrepôt choisit le transport le moins cher. Le vélo cargo est économique mais ne dépasse pas 10 km.',
      goal: [
        'Écris `VeloCargo` et `Camionnette`, qui implémentent l\'interface `Transport` (en haut).',
        'Vélo cargo : nom `"Vélo cargo"`, livre jusqu\'à 10 km, coût `2 + km * 0.5`. Camionnette : nom `"Camionnette"`, livre partout, coût `15 + km * 0.5`.',
      ],
      notion: {
        title: 'Interface + choix automatique',
        text: 'Le main ne connaît que l\'interface Transport : il compare les coûts sans savoir de quel véhicule il s\'agit. Ajouter un nouveau transport plus tard ne demandera aucun changement dans le main.',
        code: 'class Moto implements Transport {\n    public String nom() { return "Moto"; }\n    // …\n}',
      },
      objects: [],
      frame: classFrame(TRANSPORT, ...CHOIX),
      starter: '// Écris ici VeloCargo et Camionnette\n',
      solution: 'class VeloCargo implements Transport {\n    public String nom() {\n        return "Vélo cargo";\n    }\n\n    public boolean peutLivrer(int km) {\n        return km <= 10;\n    }\n\n    public double cout(int km) {\n        return 2 + km * 0.5;\n    }\n}\n\nclass Camionnette implements Transport {\n    public String nom() {\n        return "Camionnette";\n    }\n\n    public boolean peutLivrer(int km) {\n        return true;\n    }\n\n    public double cout(int km) {\n        return 15 + km * 0.5;\n    }\n}\n',
      hints: ['class VeloCargo implements Transport { … }  avec trois méthodes public.', 'peutLivrer : return km <= 10;  (et return true; pour la camionnette)'],
      tests: [{ world: { map: SCREEN } }],
      check: (run) => expectOutput(run, ['3 km : Vélo cargo (3.5 €)', '40 km : Camionnette (35.0 €)']),
    },
    {
      id: '10-5',
      title: 'Le bilan de la journée',
      story: 'Dix-huit heures : la journée se termine. Le directeur veut un bilan des commandes, calculé par le programme.',
      goal: [
        'Dans le main, parcours le tableau `commandes` et affiche exactement trois lignes :',
        '`Livrées : 3 / 4` · `Chiffre d\'affaires : 140.5 €` (somme des commandes **livrées**) · `Plus grosse commande : Léo (120.0 €)`.',
        'Tout doit être calculé : n\'écris aucun de ces nombres ou prénoms toi-même.',
      ],
      notion: {
        title: 'Tout ensemble',
        text: 'Une boucle, des compteurs, des conditions, des objets et leurs getters : c\'est ainsi qu\'on écrit de vrais programmes. Avance pas à pas et regarde les variables évoluer dans la mémoire.',
        code: 'int n = 0;\ndouble somme = 0;\nCommande max = commandes[0];\nfor (Commande c : commandes) {\n    // …\n}',
      },
      objects: [],
      frame: { before: COMMANDES, after: ['    }', '}'], indent: 8 },
      starter: 'int livrees = 0;\ndouble chiffre = 0;\nCommande plusGrosse = commandes[0];\n\n',
      solution: 'int livrees = 0;\ndouble chiffre = 0;\nCommande plusGrosse = commandes[0];\nfor (Commande c : commandes) {\n    if (c.estLivree()) {\n        livrees++;\n        chiffre += c.getMontant();\n    }\n    if (c.getMontant() > plusGrosse.getMontant()) {\n        plusGrosse = c;\n    }\n}\nSystem.out.println("Livrées : " + livrees + " / " + commandes.length);\nSystem.out.println("Chiffre d\'affaires : " + chiffre + " €");\nSystem.out.println("Plus grosse commande : " + plusGrosse.getClient() + " (" + plusGrosse.getMontant() + " €)");\n',
      hints: ['Une seule boucle for (Commande c : commandes) avec deux if : un pour les commandes livrées, un pour la plus grosse.', 'Pour la plus grosse : if (c.getMontant() > plusGrosse.getMontant()) { plusGrosse = c; }'],
      tests: [{ world: { map: SCREEN } }],
      check: (run) => expectOutput(run, ['Livrées : 3 / 4', 'Chiffre d\'affaires : 140.5 €', 'Plus grosse commande : Léo (120.0 €)']),
      rules: (src) => {
        if ([140.5, 120, 3, 4].some((n) => hasNumber(src.replace(/\/\/.*$/gm, '').split('\n').filter((l) => !/=\s*0;|commandes\[0\]/.test(l)).join('\n'), n))) {
          return 'Calcule les résultats avec la boucle : n\'écris pas les nombres toi-même.';
        }
        if (/Léo|Awa|Inès|Tom/.test(stripComments(src))) return 'N\'écris pas le prénom toi-même : utilise getClient().';
        if (!/commandes\s*\.\s*length/.test(codeOnly(src))) return 'Pour le nombre total de commandes, utilise commandes.length.';
        return null;
      },
    },
  ],
};
