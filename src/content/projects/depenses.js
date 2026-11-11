import { codeOnly, expectOutput } from '../validators.js';

// Projet « Suivi des dépenses » : un carnet de comptes personnel, construit en 5 étapes.
// Le code de chaque étape est repris à l'étape suivante (carry).

const SCREEN = ['.....', '..T..', '.....'];

const useMain = (...lines) => ({
  before: [],
  after: ['', 'public class Main {', '    public static void main(String[] args) {', ...lines.map((l) => `        ${l}`), '    }', '}'],
  indent: 2,
});

const privateRule = (...names) => (src, ast) => {
  for (const name of names) {
    const c = ast.classes.find((k) => k.name === name);
    if (!c) return `La classe ${name} a disparu.`;
    const open = c.fields.filter((f) => !f.mods.private);
    if (open.length) return `Garde les attributs de ${name} private : ${open.map((f) => f.name).join(', ')}.`;
  }
  return null;
};

const OPS = [
  'c.ajouter("Salaire", "revenu", 1500);',
  'c.ajouter("Loyer", "logement", -600);',
  'c.ajouter("Courses", "alimentation", -45.5);',
  'c.ajouter("Cinéma", "loisirs", -12);',
  'c.ajouter("Courses", "alimentation", -80);',
];

// ---------- Solutions, étape par étape ----------
const OPERATION = `class Operation {
    private String libelle;
    private String categorie;
    private double montant;

    Operation(String libelle, String categorie, double montant) {
        this.libelle = libelle;
        this.categorie = categorie;
        this.montant = montant;
    }

    String getLibelle() {
        return libelle;
    }

    String getCategorie() {
        return categorie;
    }

    double getMontant() {
        return montant;
    }

    boolean estDepense() {
        return montant < 0;
    }

    public String toString() {
        return libelle + " (" + categorie + ") : " + montant + " €";
    }
}
`;

const CARNET = `
class Carnet {
    private ArrayList<Operation> operations = new ArrayList<>();

    void ajouter(String libelle, String categorie, double montant) {
        operations.add(new Operation(libelle, categorie, montant));
    }

    void afficher() {
        for (Operation o : operations) {
            System.out.println(o);
        }
    }

    double totalRevenus() {
        double total = 0;
        for (Operation o : operations) {
            if (!o.estDepense()) {
                total += o.getMontant();
            }
        }
        return total;
    }

    double totalDepenses() {
        double total = 0;
        for (Operation o : operations) {
            if (o.estDepense()) {
                total -= o.getMontant();
            }
        }
        return total;
    }

    double solde() {
        return totalRevenus() - totalDepenses();
    }
`;

const CATEGORIE = `
    double totalCategorie(String categorie) {
        double total = 0;
        for (Operation o : operations) {
            if (o.getCategorie().equals(categorie)) {
                total += o.getMontant();
            }
        }
        return total;
    }
`;

const BUDGET = `
    void verifierBudget(String categorie, double budget) {
        double depense = -totalCategorie(categorie);
        if (depense > budget) {
            System.out.println("⚠️ Budget " + categorie + " dépassé de " + (depense - budget) + " €");
        } else {
            System.out.println("✅ " + categorie + " : il reste " + (budget - depense) + " €");
        }
    }
`;

const FICHIER = `
    void sauvegarder() {
        fichier.vider();
        for (Operation o : operations) {
            fichier.ecrireLigne(o.getLibelle() + ";" + o.getCategorie() + ";" + o.getMontant());
        }
    }

    void charger() {
        operations.clear();
        for (String ligne : fichier.lignes()) {
            String[] morceaux = ligne.split(";");
            ajouter(morceaux[0], morceaux[1], Double.parseDouble(morceaux[2]));
        }
    }
`;

const S1 = OPERATION;
const S2 = `${OPERATION}${CARNET}}\n`;
const S3 = `${OPERATION}${CARNET}${CATEGORIE}}\n`;
const S4 = `${OPERATION}${CARNET}${CATEGORIE}${BUDGET}}\n`;
const S5 = `${OPERATION}${CARNET}${CATEGORIE}${BUDGET}${FICHIER}}\n`;

export default {
  id: 'depenses',
  num: 'P2',
  project: true,
  title: 'Suivi des dépenses',
  place: 'Projet · Ton carnet de comptes',
  summary: 'Enregistre tes revenus et tes dépenses par catégorie, surveille ton budget et sauvegarde tout dans un fichier.',
  levels: [
    {
      id: 'D-1',
      title: 'Une opération',
      story: 'Awa veut savoir où passe son argent. Chaque mouvement d\'argent est une opération : un libellé, une catégorie, un montant (négatif pour une dépense).',
      goal: [
        'Écris la classe `Operation` : attributs **private** `libelle`, `categorie` (String) et `montant` (double), un constructeur et les trois getters.',
        'Ajoute `boolean estDepense()` (montant négatif) et `public String toString()` qui renvoie `Courses (alimentation) : -45.5 €`.',
      ],
      notion: {
        title: 'Modéliser la réalité',
        text: 'Avant d\'écrire une application, on choisit les objets qui la composent et leurs informations. Ici, une Operation sait tout ce qu\'il faut savoir sur un mouvement d\'argent.',
        code: 'class Note {\n    private String matiere;\n    private double valeur;\n    // constructeur, getters…\n}',
      },
      objects: [],
      frame: useMain('Operation a = new Operation("Salaire", "revenu", 1500);', 'Operation b = new Operation("Courses", "alimentation", -45.5);', 'System.out.println(a);', 'System.out.println(b);', 'System.out.println(b.estDepense());'),
      starter: 'class Operation {\n    \n}\n',
      solution: S1,
      hints: ['Trois attributs private, un constructeur avec this, trois getters.', 'boolean estDepense() { return montant < 0; }  et  return libelle + " (" + categorie + ") : " + montant + " €";'],
      tests: [{ world: { map: SCREEN } }],
      check: (run) => expectOutput(run, ['Salaire (revenu) : 1500.0 €', 'Courses (alimentation) : -45.5 €', 'true']),
      rules: privateRule('Operation'),
    },
    {
      id: 'D-2',
      title: 'Le carnet de comptes',
      story: 'Une opération seule ne sert à rien : il faut toutes les garder dans un carnet, et calculer les totaux du mois.',
      goal: [
        'Écris la classe `Carnet` avec une `ArrayList<Operation>` et les méthodes `ajouter(libelle, categorie, montant)` et `afficher()`.',
        'Ajoute `totalRevenus()`, `totalDepenses()` (en positif : 737.5 et non -737.5) et `solde()` (revenus − dépenses).',
      ],
      notion: {
        title: 'Une classe qui en gère d\'autres',
        text: 'Le Carnet contient une liste d\'Operation et propose des méthodes pour les ajouter et les additionner. Le main n\'a plus à manipuler la liste lui-même.',
        code: 'double total = 0;\nfor (Operation o : operations) {\n    total += o.getMontant();\n}',
      },
      objects: [],
      carry: true,
      frame: useMain('Carnet c = new Carnet();', ...OPS, 'c.afficher();', 'System.out.println("Revenus : " + c.totalRevenus() + " €");', 'System.out.println("Dépenses : " + c.totalDepenses() + " €");', 'System.out.println("Solde : " + c.solde() + " €");'),
      starter: S1,
      solution: S2,
      hints: ['ajouter : operations.add(new Operation(libelle, categorie, montant));', 'totalDepenses : pour chaque dépense, total -= o.getMontant();  (moins un nombre négatif = plus)'],
      tests: [{ world: { map: SCREEN } }],
      check: (run) => expectOutput(run, [
        'Salaire (revenu) : 1500.0 €', 'Loyer (logement) : -600.0 €', 'Courses (alimentation) : -45.5 €', 'Cinéma (loisirs) : -12.0 €', 'Courses (alimentation) : -80.0 €',
        'Revenus : 1500.0 €', 'Dépenses : 737.5 €', 'Solde : 762.5 €',
      ]),
      rules: privateRule('Operation', 'Carnet'),
    },
    {
      id: 'D-3',
      title: 'Par catégorie',
      story: 'Combien Awa dépense-t-elle en nourriture ? En loisirs ? Il faut regrouper les opérations par catégorie.',
      goal: [
        'Ajoute `double totalCategorie(String categorie)` : la somme des montants des opérations de cette catégorie.',
        'Pour comparer deux textes, utilise `.equals(…)` et non `==`.',
      ],
      notion: {
        title: 'Comparer des String',
        text: 'Avec des objets, == vérifie si c\'est le même objet en mémoire, pas si le texte est identique. Pour comparer le contenu de deux String, on utilise toujours equals().',
        code: 'if (ville.equals("Dakar")) {\n    // …\n}',
      },
      objects: [],
      carry: true,
      frame: useMain('Carnet c = new Carnet();', ...OPS, 'String[] categories = {"logement", "alimentation", "loisirs"};', 'for (String cat : categories) {', '    System.out.println(cat + " : " + (-c.totalCategorie(cat)) + " €");', '}'),
      starter: S2,
      solution: S3,
      hints: ['Même structure que totalRevenus, avec un if différent.', 'if (o.getCategorie().equals(categorie)) { total += o.getMontant(); }'],
      tests: [{ world: { map: SCREEN } }],
      check: (run) => expectOutput(run, ['logement : 600.0 €', 'alimentation : 125.5 €', 'loisirs : 12.0 €']),
      rules: (src, ast) => (/\.equals\s*\(/.test(codeOnly(src)) ? privateRule('Operation', 'Carnet')(src, ast) : 'Compare les catégories avec .equals(…).'),
    },
    {
      id: 'D-4',
      title: 'Le budget',
      story: 'Awa se fixe un budget par catégorie. L\'application doit la prévenir quand elle le dépasse.',
      goal: [
        'Ajoute `void verifierBudget(String categorie, double budget)`.',
        'Si la dépense de la catégorie dépasse le budget : `⚠️ Budget alimentation dépassé de 25.5 €`. Sinon : `✅ loisirs : il reste 38.0 €`.',
      ],
      notion: {
        title: 'Réutiliser ses méthodes',
        text: 'Une méthode peut en appeler une autre de la même classe : verifierBudget s\'appuie sur totalCategorie au lieu de refaire la boucle.',
        code: 'void alerte() {\n    if (total() > limite) {\n        System.out.println("Attention !");\n    }\n}',
      },
      objects: [],
      carry: true,
      frame: useMain('Carnet c = new Carnet();', ...OPS, 'c.verifierBudget("alimentation", 100);', 'c.verifierBudget("loisirs", 50);'),
      starter: S3,
      solution: S4,
      hints: ['double depense = -totalCategorie(categorie);', 'if (depense > budget) { … dépassé de (depense - budget) … } else { … il reste (budget - depense) … }'],
      tests: [{ world: { map: SCREEN } }],
      check: (run) => expectOutput(run, ['⚠️ Budget alimentation dépassé de 25.5 €', '✅ loisirs : il reste 38.0 €']),
      rules: privateRule('Operation', 'Carnet'),
    },
    {
      id: 'D-5',
      title: 'Sauvegarder dans un fichier',
      story: 'Si Awa ferme l\'application, tout est perdu ! Il faut sauvegarder les opérations dans le fichier depenses.txt, une ligne par opération, et pouvoir les recharger.',
      goal: [
        'Ajoute `sauvegarder()` : vide le fichier, puis écris une ligne `Salaire;revenu;1500.0` par opération avec `fichier.ecrireLigne(…)`.',
        'Ajoute `charger()` : vide la liste, puis pour chaque ligne de `fichier.lignes()`, découpe-la avec `split(";")` et recrée l\'opération avec `Double.parseDouble(…)`.',
      ],
      notion: {
        title: 'Écrire et relire du texte',
        text: 'Un fichier ne contient que du texte. Pour sauvegarder un objet, on écrit ses informations séparées par un caractère (;). Pour le relire, split découpe la ligne en morceaux, et parseDouble retransforme le texte en nombre.',
        code: 'String[] p = "Pain;2.5".split(";");\n// p[0] vaut "Pain", p[1] vaut "2.5"\ndouble prix = Double.parseDouble(p[1]);',
      },
      objects: ['fichier'],
      carry: true,
      frame: useMain(
        'Carnet c = new Carnet();',
        'c.ajouter("Salaire", "revenu", 1500);',
        'c.ajouter("Loyer", "logement", -600);',
        'c.ajouter("Courses", "alimentation", -45.5);',
        'c.sauvegarder();',
        'Carnet copie = new Carnet();',
        'copie.charger();',
        'copie.afficher();',
        'System.out.println("Solde retrouvé : " + copie.solde() + " €");',
      ),
      starter: S4,
      solution: S5,
      hints: ['sauvegarder : fichier.vider(); puis une boucle avec fichier.ecrireLigne(o.getLibelle() + ";" + o.getCategorie() + ";" + o.getMontant());', 'charger : operations.clear(); for (String ligne : fichier.lignes()) { String[] morceaux = ligne.split(";"); ajouter(morceaux[0], morceaux[1], Double.parseDouble(morceaux[2])); }'],
      tests: [
        { label: 'Fichier vide', world: { map: SCREEN, fichier: [] } },
        { label: 'Ancien fichier', world: { map: SCREEN, fichier: ['Vieux;test;-1.0', 'Ancien;test;-2.0'] } },
      ],
      check: (run) => {
        const want = ['Salaire;revenu;1500.0', 'Loyer;logement;-600.0', 'Courses;alimentation;-45.5'];
        const got = run.world.fichier;
        if (got.length !== want.length || got.some((l, i) => l !== want[i])) {
          return `Le fichier contient ${got.length} ligne${got.length > 1 ? 's' : ''} : ${got.map((l) => `« ${l} »`).join(', ') || 'aucune'}. Attendu : ${want.map((l) => `« ${l} »`).join(', ')} (pense à vider le fichier d'abord).`;
        }
        return expectOutput(run, ['Salaire (revenu) : 1500.0 €', 'Loyer (logement) : -600.0 €', 'Courses (alimentation) : -45.5 €', 'Solde retrouvé : 854.5 €']);
      },
      rules: privateRule('Operation', 'Carnet'),
    },
  ],
};
