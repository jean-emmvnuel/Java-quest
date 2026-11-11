import { expectOutput } from '../validators.js';

// Projet « Application bancaire » : l'élève construit une vraie petite banque en 6 étapes.
// Le code de chaque étape est repris à l'étape suivante (carry), comme dans un vrai projet.

const SCREEN = ['.....', '..T..', '.....'];

const useMain = (...lines) => ({
  before: [],
  after: ['', 'public class Main {', '    public static void main(String[] args) {', ...lines.map((l) => `        ${l}`), '    }', '}'],
  indent: 2,
});

const privateRule = (name) => (src, ast) => {
  const c = ast.classes.find((k) => k.name === name);
  if (!c) return `La classe ${name} a disparu.`;
  const open = c.fields.filter((f) => !f.mods.private);
  return open.length ? `Garde les attributs de ${name} private : ${open.map((f) => f.name).join(', ')}.` : null;
};

// ---------- Solutions, étape par étape ----------
const COMPTE_BASE = `class Compte {
    private int numero;
    private String titulaire;
    private double solde;

    Compte(int numero, String titulaire, double solde) {
        this.numero = numero;
        this.titulaire = titulaire;
        this.solde = solde;
    }

    int getNumero() {
        return numero;
    }

    String getTitulaire() {
        return titulaire;
    }

    double getSolde() {
        return solde;
    }

    public String toString() {
        return "n°" + numero + " · " + titulaire + " · " + solde + " €";
    }
`;

const OPERATIONS = `
    boolean deposer(double montant) {
        if (montant <= 0) {
            System.out.println("Montant invalide");
            return false;
        }
        solde = solde + montant;
        return true;
    }

    boolean retirer(double montant) {
        if (montant <= 0) {
            System.out.println("Montant invalide");
            return false;
        }
        if (montant > solde) {
            System.out.println("Solde insuffisant");
            return false;
        }
        solde = solde - montant;
        return true;
    }
`;

const S1 = `${COMPTE_BASE}}\n`;
const S2 = `${COMPTE_BASE}${OPERATIONS}}\n`;

const COMPTE_HISTO = COMPTE_BASE
  .replace('    private double solde;\n', '    private double solde;\n    private ArrayList<String> historique = new ArrayList<>();\n');
const OPERATIONS_HISTO = OPERATIONS
  .replace('        solde = solde + montant;\n        return true;', '        solde = solde + montant;\n        historique.add("Dépôt : +" + montant + " €");\n        return true;')
  .replace('        solde = solde - montant;\n        return true;', '        solde = solde - montant;\n        historique.add("Retrait : -" + montant + " €");\n        return true;');
const HISTO = `
    void afficherHistorique() {
        System.out.println("Historique de " + titulaire + " :");
        for (String ligne : historique) {
            System.out.println(ligne);
        }
    }

    int nombreOperations() {
        return historique.size();
    }
`;
const S3 = `${COMPTE_HISTO}${OPERATIONS_HISTO}${HISTO}}\n`;

const VIREMENT = `
    boolean virer(Compte destination, double montant) {
        if (montant <= 0 || montant > solde) {
            System.out.println("Virement refusé");
            return false;
        }
        solde = solde - montant;
        destination.solde = destination.solde + montant;
        historique.add("Virement vers " + destination.titulaire + " : -" + montant + " €");
        destination.historique.add("Virement de " + titulaire + " : +" + montant + " €");
        return true;
    }
`;
const S4 = `${COMPTE_HISTO}${OPERATIONS_HISTO}${HISTO}${VIREMENT}}\n`;

const BANQUE = `
class Banque {
    private String nom;
    private ArrayList<Compte> comptes = new ArrayList<>();
    private int prochainNumero = 1;

    Banque(String nom) {
        this.nom = nom;
    }

    Compte ouvrirCompte(String titulaire, double depot) {
        Compte c = new Compte(prochainNumero, titulaire, depot);
        prochainNumero++;
        comptes.add(c);
        return c;
    }

    Compte trouver(int numero) {
        for (Compte c : comptes) {
            if (c.getNumero() == numero) {
                return c;
            }
        }
        return null;
    }

    int nombreComptes() {
        return comptes.size();
    }

    double totalDepots() {
        double total = 0;
        for (Compte c : comptes) {
            total += c.getSolde();
        }
        return total;
    }
`;
const S5 = `${S4}${BANQUE}}\n`;

const EPARGNE = `
class CompteEpargne extends Compte {
    private double taux;

    CompteEpargne(int numero, String titulaire, double solde, double taux) {
        super(numero, titulaire, solde);
        this.taux = taux;
    }

    void appliquerInterets() {
        deposer(getSolde() * taux);
    }

    @Override
    public String toString() {
        return super.toString() + " (épargne " + (taux * 100) + " %)";
    }
}
`;
const BANQUE_PLUS = `
    CompteEpargne ouvrirEpargne(String titulaire, double depot, double taux) {
        CompteEpargne c = new CompteEpargne(prochainNumero, titulaire, depot, taux);
        prochainNumero++;
        comptes.add(c);
        return c;
    }

    void afficherComptes() {
        System.out.println("Comptes de " + nom + " :");
        for (Compte c : comptes) {
            System.out.println(c);
        }
    }
`;
const S6 = `${S4}${EPARGNE}${BANQUE}${BANQUE_PLUS}}\n`;

export default {
  id: 'banque',
  num: 'P1',
  project: true,
  title: 'Application bancaire',
  place: 'Ta propre banque',
  summary: 'Construis une vraie petite banque : comptes, opérations sécurisées, historique, virements, épargne.',
  levels: [
    {
      id: 'B-1',
      title: 'Le compte bancaire',
      story: 'Tu es chargé de programmer le logiciel d\'une nouvelle banque. Tout commence par un compte.',
      goal: [
        'Écris la classe `Compte` avec trois attributs **private** : `numero` (int), `titulaire` (String), `solde` (double), et un constructeur qui les remplit.',
        'Ajoute les getters `getNumero()`, `getTitulaire()`, `getSolde()` et `public String toString()` qui renvoie `n°1 · Awa · 100.0 €`.',
      ],
      notion: {
        title: 'toString()',
        text: 'Quand on affiche un objet avec println, Java appelle sa méthode toString(). En l\'écrivant, tu choisis comment l\'objet se présente.',
        code: 'public String toString() {\n    return "Chat " + nom;\n}',
      },
      objects: [],
      frame: useMain('Compte c = new Compte(1, "Awa", 100);', 'System.out.println(c);', 'System.out.println(c.getTitulaire() + " a " + c.getSolde() + " €");'),
      starter: 'class Compte {\n    \n}\n',
      solution: S1,
      hints: ['Trois attributs private, un constructeur avec this, puis trois getters.', 'return "n°" + numero + " · " + titulaire + " · " + solde + " €";'],
      tests: [{ world: { map: SCREEN } }],
      check: (run) => expectOutput(run, ['n°1 · Awa · 100.0 €', 'Awa a 100.0 €']),
      rules: privateRule('Compte'),
    },
    {
      id: 'B-2',
      title: 'Des opérations sécurisées',
      story: 'Une banque ne peut pas accepter n\'importe quoi : pas de dépôt négatif, pas de retrait au-delà du solde.',
      goal: [
        'Ajoute `boolean deposer(double montant)` et `boolean retirer(double montant)`. Elles renvoient `true` si l\'opération est faite, `false` sinon.',
        'Montant nul ou négatif : affiche `Montant invalide`. Retrait plus grand que le solde : affiche `Solde insuffisant`.',
      ],
      notion: {
        title: 'Renvoyer true ou false',
        text: 'Une méthode qui peut échouer renvoie souvent un boolean : celui qui l\'appelle sait ainsi si l\'opération a réussi. Un return arrête la méthode tout de suite.',
        code: 'boolean payer(double prix) {\n    if (prix > argent) {\n        return false;\n    }\n    argent -= prix;\n    return true;\n}',
      },
      objects: [],
      carry: true,
      frame: useMain('Compte c = new Compte(1, "Awa", 100);', 'c.deposer(50);', 'c.deposer(-5);', 'c.retirer(500);', 'boolean ok = c.retirer(30);', 'System.out.println("Retrait accepté : " + ok);', 'System.out.println(c);'),
      starter: S1,
      solution: S2,
      hints: ['Dans deposer : if (montant <= 0) { System.out.println("Montant invalide"); return false; }', 'Dans retirer, deux vérifications avant de modifier le solde : montant <= 0, puis montant > solde.'],
      tests: [{ world: { map: SCREEN } }],
      check: (run) => expectOutput(run, ['Montant invalide', 'Solde insuffisant', 'Retrait accepté : true', 'n°1 · Awa · 120.0 €']),
      rules: privateRule('Compte'),
    },
    {
      id: 'B-3',
      title: 'L\'historique des opérations',
      story: 'Les clients veulent voir leur relevé : la liste de toutes les opérations réussies. Combien y en aura-t-il ? Impossible de le savoir à l\'avance…',
      goal: [
        'Ajoute l\'attribut `private ArrayList<String> historique = new ArrayList<>();` et, à chaque opération **réussie**, ajoute une ligne : `Dépôt : +50.0 €` ou `Retrait : -30.0 €`.',
        'Écris `void afficherHistorique()` (titre `Historique de Awa :` puis une ligne par opération) et `int nombreOperations()`.',
      ],
      notion: {
        title: 'ArrayList : une liste qui grandit',
        text: 'Un tableau a une taille fixe. Une ArrayList grandit à chaque add(…). size() donne le nombre d\'éléments, get(i) lit l\'élément n°i, et for (String x : liste) la parcourt.',
        code: 'ArrayList<String> courses = new ArrayList<>();\ncourses.add("Pain");\ncourses.add("Lait");\nSystem.out.println(courses.size()); // 2',
      },
      objects: [],
      carry: true,
      frame: useMain('Compte c = new Compte(1, "Awa", 100);', 'c.deposer(50);', 'c.retirer(30);', 'c.retirer(500);', 'c.afficherHistorique();', 'System.out.println(c.nombreOperations() + " opérations");'),
      starter: S2,
      solution: S3,
      hints: ['Dans deposer, juste avant return true : historique.add("Dépôt : +" + montant + " €");', 'afficherHistorique : un println pour le titre, puis for (String ligne : historique) { System.out.println(ligne); }'],
      tests: [{ world: { map: SCREEN } }],
      check: (run) => expectOutput(run, ['Solde insuffisant', 'Historique de Awa :', 'Dépôt : +50.0 €', 'Retrait : -30.0 €', '2 opérations']),
      rules: privateRule('Compte'),
    },
    {
      id: 'B-4',
      title: 'Les virements',
      story: 'Awa veut rembourser Léo : il faut transférer de l\'argent d\'un compte à un autre, et que cela apparaisse dans les deux historiques.',
      goal: [
        'Ajoute `boolean virer(Compte destination, double montant)`. Si le montant est invalide ou trop grand : affiche `Virement refusé` et renvoie `false`.',
        'Sinon, déplace l\'argent et ajoute `Virement vers Léo : -40.0 €` dans ton historique, et `Virement de Awa : +40.0 €` dans celui du destinataire.',
      ],
      notion: {
        title: 'Un objet en paramètre',
        text: 'Une méthode peut recevoir un autre objet de la même classe. Comme on est dans la classe Compte, on a le droit de lire ses attributs private : destination.solde.',
        code: 'void donner(Joueur autre, int pieces) {\n    this.pieces -= pieces;\n    autre.pieces += pieces;\n}',
      },
      objects: [],
      carry: true,
      frame: useMain('Compte a = new Compte(1, "Awa", 100);', 'Compte b = new Compte(2, "Léo", 20);', 'a.virer(b, 40);', 'a.virer(b, 1000);', 'a.afficherHistorique();', 'b.afficherHistorique();', 'System.out.println(a);', 'System.out.println(b);'),
      starter: S3,
      solution: S4,
      hints: ['if (montant <= 0 || montant > solde) { System.out.println("Virement refusé"); return false; }', 'destination.solde = destination.solde + montant;  et  destination.historique.add(…);'],
      tests: [{ world: { map: SCREEN } }],
      check: (run) => expectOutput(run, ['Virement refusé', 'Historique de Awa :', 'Virement vers Léo : -40.0 €', 'Historique de Léo :', 'Virement de Awa : +40.0 €', 'n°1 · Awa · 60.0 €', 'n°2 · Léo · 60.0 €']),
      rules: privateRule('Compte'),
    },
    {
      id: 'B-5',
      title: 'La banque',
      story: 'La banque ouvre ses portes ! Elle doit gérer tous ses comptes, leur donner un numéro et retrouver un compte à partir de son numéro.',
      goal: [
        'Écris la classe `Banque` : un nom, une `ArrayList<Compte>` et un compteur `prochainNumero` qui commence à 1.',
        'Méthodes : `ouvrirCompte(titulaire, depot)` (crée, numérote, ajoute et renvoie le compte), `trouver(numero)` (renvoie le compte ou `null`), `nombreComptes()` et `totalDepots()`.',
      ],
      notion: {
        title: 'Une liste d\'objets',
        text: 'Une ArrayList<Compte> range des objets. Pour en retrouver un, on parcourt la liste et on renvoie le premier qui correspond ; s\'il n\'y en a aucun, on renvoie null.',
        code: 'Livre chercher(String titre) {\n    for (Livre l : livres) {\n        if (l.getTitre().equals(titre)) return l;\n    }\n    return null;\n}',
      },
      objects: [],
      carry: true,
      frame: useMain(
        'Banque b = new Banque("Banque Java");',
        'Compte a = b.ouvrirCompte("Awa", 100);',
        'b.ouvrirCompte("Léo", 250);',
        'b.ouvrirCompte("Inès", 75.5);',
        'b.trouver(2).virer(a, 50);',
        'System.out.println(b.nombreComptes() + " comptes");',
        'System.out.println("Total : " + b.totalDepots() + " €");',
        'System.out.println(b.trouver(1));',
        'System.out.println(b.trouver(9) == null ? "Compte n°9 introuvable" : "Erreur");',
      ),
      starter: S4,
      solution: S5,
      hints: ['ouvrirCompte : Compte c = new Compte(prochainNumero, titulaire, depot); prochainNumero++; comptes.add(c); return c;', 'trouver : une boucle for (Compte c : comptes) avec if (c.getNumero() == numero) return c;  puis return null; après la boucle.'],
      tests: [{ world: { map: SCREEN } }],
      check: (run) => expectOutput(run, ['3 comptes', 'Total : 425.5 €', 'n°1 · Awa · 150.0 €', 'Compte n°9 introuvable']),
      rules: (src, ast) => privateRule('Compte')(src, ast) ?? privateRule('Banque')(src, ast),
    },
    {
      id: 'B-6',
      title: 'Le compte épargne',
      story: 'La banque lance un compte épargne : il rapporte des intérêts. C\'est un compte comme les autres, avec un taux en plus.',
      goal: [
        'Écris `CompteEpargne extends Compte` avec un `taux`, une méthode `appliquerInterets()` (dépose solde × taux) et un `toString()` qui ajoute ` (épargne 3.0 %)` grâce à `super.toString()`.',
        'Dans `Banque`, ajoute `ouvrirEpargne(titulaire, depot, taux)` et `afficherComptes()`. Les deux sortes de comptes vivent dans la même liste !',
      ],
      notion: {
        title: 'Réutiliser le parent',
        text: 'super.toString() appelle la version de la classe parente : on la complète au lieu de tout réécrire. Et comme un CompteEpargne EST un Compte, il trouve sa place dans une ArrayList<Compte>.',
        code: '@Override\npublic String toString() {\n    return super.toString() + " (VIP)";\n}',
      },
      objects: [],
      carry: true,
      frame: useMain(
        'Banque b = new Banque("Banque Java");',
        'b.ouvrirCompte("Awa", 100);',
        'CompteEpargne e = b.ouvrirEpargne("Léo", 1000, 0.03);',
        'e.appliquerInterets();',
        'b.afficherComptes();',
        'System.out.println("Total : " + b.totalDepots() + " €");',
      ),
      starter: S5,
      solution: S6,
      hints: ['Le constructeur : CompteEpargne(int numero, String titulaire, double solde, double taux) { super(numero, titulaire, solde); this.taux = taux; }', 'appliquerInterets : deposer(getSolde() * taux);  — le solde est private dans Compte, d\'où getSolde().'],
      tests: [{ world: { map: SCREEN } }],
      check: (run) => expectOutput(run, ['Comptes de Banque Java :', 'n°1 · Awa · 100.0 €', 'n°2 · Léo · 1030.0 € (épargne 3.0 %)', 'Total : 1130.0 €']),
      rules: (src, ast) => {
        const c = ast.classes.find((k) => k.name === 'CompteEpargne');
        if (!c || c.superName !== 'Compte') return 'CompteEpargne doit hériter de Compte : class CompteEpargne extends Compte';
        return privateRule('Compte')(src, ast);
      },
    },
  ],
};
