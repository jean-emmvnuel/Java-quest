import { codeOnly, expectOutput } from '../validators.js';

// Projet « Gestion des employés » : le logiciel RH d'une petite entreprise, en 5 étapes.
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

const EQUIPE = [
  'Departement info = new Departement("Informatique");',
  'info.embaucher(new Employe("Awa", "Développeuse", 2500));',
  'info.embaucher(new Employe("Léo", "Développeur", 3200));',
];

// ---------- Solutions, étape par étape ----------
const EMPLOYE = `class Employe {
    private String nom;
    private String poste;
    private double salaire;

    Employe(String nom, String poste, double salaire) {
        this.nom = nom;
        this.poste = poste;
        this.salaire = salaire;
    }

    String getNom() {
        return nom;
    }

    double getSalaire() {
        return salaire;
    }

    void augmenter(double pourcentage) {
        salaire = salaire + salaire * pourcentage / 100;
    }

    public String toString() {
        return nom + " · " + poste + " · " + salaire + " €";
    }
`;
const COUT = `
    double coutMensuel() {
        return getSalaire() * 1.5;
    }
`;

const DEPARTEMENT = `
class Departement {
    private String nom;
    private ArrayList<Employe> employes = new ArrayList<>();

    Departement(String nom) {
        this.nom = nom;
    }

    String getNom() {
        return nom;
    }

    void embaucher(Employe e) {
        employes.add(e);
    }

    int effectif() {
        return employes.size();
    }

    double masseSalariale() {
        double total = 0;
        for (Employe e : employes) {
            total += e.getSalaire();
        }
        return total;
    }

    double salaireMoyen() {
        if (employes.isEmpty()) {
            return 0;
        }
        return masseSalariale() / employes.size();
    }

    void afficher() {
        System.out.println(nom + " (" + effectif() + " employés)");
        for (Employe e : employes) {
            System.out.println("- " + e);
        }
    }
`;
const RECHERCHE = `
    Employe mieuxPaye() {
        Employe meilleur = null;
        for (Employe e : employes) {
            if (meilleur == null || e.getSalaire() > meilleur.getSalaire()) {
                meilleur = e;
            }
        }
        return meilleur;
    }

    Employe chercher(String nom) {
        for (Employe e : employes) {
            if (e.getNom().equals(nom)) {
                return e;
            }
        }
        return null;
    }

    boolean licencier(String nom) {
        for (int i = 0; i < employes.size(); i++) {
            if (employes.get(i).getNom().equals(nom)) {
                employes.remove(i);
                return true;
            }
        }
        return false;
    }
`;
const COUT_TOTAL = `
    double coutTotal() {
        double total = 0;
        for (Employe e : employes) {
            total += e.coutMensuel();
        }
        return total;
    }
`;
const STAGIAIRE = `
class Stagiaire extends Employe {
    Stagiaire(String nom, String poste, double gratification) {
        super(nom, poste, gratification);
    }

    @Override
    double coutMensuel() {
        return getSalaire();
    }

    @Override
    public String toString() {
        return super.toString() + " (stagiaire)";
    }
}
`;
const ENTREPRISE = `
class Entreprise {
    private String nom;
    private ArrayList<Departement> departements = new ArrayList<>();

    Entreprise(String nom) {
        this.nom = nom;
    }

    void ajouter(Departement d) {
        departements.add(d);
    }

    int effectifTotal() {
        int total = 0;
        for (Departement d : departements) {
            total += d.effectif();
        }
        return total;
    }

    Departement plusGrosBudget() {
        Departement max = null;
        for (Departement d : departements) {
            if (max == null || d.masseSalariale() > max.masseSalariale()) {
                max = d;
            }
        }
        return max;
    }

    void rapport() {
        System.out.println("Rapport de " + nom);
        for (Departement d : departements) {
            System.out.println(d.getNom() + " : " + d.effectif() + " employés, salaire moyen " + d.salaireMoyen() + " €");
        }
    }
}
`;

const S1 = `${EMPLOYE}}\n`;
const S2 = `${EMPLOYE}}\n${DEPARTEMENT}}\n`;
const S3 = `${EMPLOYE}}\n${DEPARTEMENT}${RECHERCHE}}\n`;
const S4 = `${EMPLOYE}${COUT}}\n${STAGIAIRE}${DEPARTEMENT}${RECHERCHE}${COUT_TOTAL}}\n`;
const S5 = `${S4}${ENTREPRISE}`;

export default {
  id: 'employes',
  num: 'P4',
  project: true,
  title: 'Gestion des employés',
  place: 'Projet · Le logiciel RH',
  summary: 'Le logiciel des ressources humaines d\'une entreprise : employés, départements, salaires, moyennes et contrats.',
  levels: [
    {
      id: 'E-1',
      title: 'L\'employé',
      story: 'Une jeune entreprise te confie son logiciel de ressources humaines. Première brique : un employé, avec son nom, son poste et son salaire.',
      goal: [
        'Écris la classe `Employe` : attributs private `nom`, `poste` (String) et `salaire` (double), un constructeur, `getNom()` et `getSalaire()`.',
        'Ajoute `void augmenter(double pourcentage)` (+10 % sur 2500 € donne 2750 €) et `public String toString()` : `Awa · Développeuse · 2500.0 €`.',
      ],
      notion: {
        title: 'Un pourcentage',
        text: 'Augmenter de p % revient à ajouter salaire × p / 100. On modifie l\'attribut de l\'objet : chaque employé a son propre salaire.',
        code: 'prix = prix - prix * 20 / 100;  // -20 %',
      },
      objects: [],
      frame: useMain('Employe e = new Employe("Awa", "Développeuse", 2500);', 'System.out.println(e);', 'e.augmenter(10);', 'System.out.println(e.getNom() + " gagne maintenant " + e.getSalaire() + " €");'),
      starter: 'class Employe {\n    \n}\n',
      solution: S1,
      hints: ['Trois attributs private, un constructeur avec this, deux getters.', 'void augmenter(double pourcentage) { salaire = salaire + salaire * pourcentage / 100; }'],
      tests: [{ world: { map: SCREEN } }],
      check: (run) => expectOutput(run, ['Awa · Développeuse · 2500.0 €', 'Awa gagne maintenant 2750.0 €']),
      rules: privateRule('Employe'),
    },
    {
      id: 'E-2',
      title: 'Le département',
      story: 'Les employés sont regroupés en départements. Le service Informatique veut connaître sa masse salariale et le salaire moyen.',
      goal: [
        'Écris `Departement` : un nom, une `ArrayList<Employe>`, et les méthodes `getNom()`, `embaucher(Employe e)`, `effectif()`, `masseSalariale()` et `salaireMoyen()` (0 si personne).',
        'Ajoute `afficher()` : `Informatique (3 employés)` puis une ligne `- …` par employé.',
      ],
      notion: {
        title: 'La moyenne',
        text: 'La moyenne, c\'est la somme divisée par le nombre d\'éléments. Attention à la liste vide : diviser par 0 n\'a pas de sens, on renvoie 0 dans ce cas.',
        code: 'if (liste.isEmpty()) {\n    return 0;\n}\nreturn somme / liste.size();',
      },
      objects: [],
      carry: true,
      frame: useMain(...EQUIPE, 'info.embaucher(new Employe("Moussa", "Technicien", 1800));', 'info.afficher();', 'System.out.println("Masse salariale : " + info.masseSalariale() + " €");', 'System.out.println("Salaire moyen : " + info.salaireMoyen() + " €");'),
      starter: S1,
      solution: S2,
      hints: ['masseSalariale : une boucle for (Employe e : employes) qui additionne e.getSalaire().', 'salaireMoyen : if (employes.isEmpty()) { return 0; }  puis  return masseSalariale() / employes.size();'],
      tests: [{ world: { map: SCREEN } }],
      check: (run) => expectOutput(run, [
        'Informatique (3 employés)', '- Awa · Développeuse · 2500.0 €', '- Léo · Développeur · 3200.0 €', '- Moussa · Technicien · 1800.0 €',
        'Masse salariale : 7500.0 €', 'Salaire moyen : 2500.0 €',
      ]),
      rules: privateRule('Employe', 'Departement'),
    },
    {
      id: 'E-3',
      title: 'Chercher et licencier',
      story: 'La responsable RH veut retrouver un employé par son nom, savoir qui est le mieux payé, et parfois retirer quelqu\'un qui quitte l\'entreprise.',
      goal: [
        'Ajoute `Employe mieuxPaye()` et `Employe chercher(String nom)` (renvoie `null` si personne ne porte ce nom).',
        'Ajoute `boolean licencier(String nom)` : retire l\'employé de la liste avec `remove(i)` et renvoie `true`, ou `false` s\'il n\'existe pas.',
      ],
      notion: {
        title: 'Retirer d\'une liste',
        text: 'Pour retirer un élément, on cherche sa position i avec une boucle classique, puis remove(i). On ne retire rien pendant une boucle for-each : la liste changerait sous nos pieds.',
        code: 'for (int i = 0; i < liste.size(); i++) {\n    if (liste.get(i).equals(x)) {\n        liste.remove(i);\n        return true;\n    }\n}\nreturn false;',
      },
      objects: [],
      carry: true,
      frame: useMain(
        ...EQUIPE,
        'info.embaucher(new Employe("Moussa", "Technicien", 1800));',
        'System.out.println("Mieux payé : " + info.mieuxPaye().getNom());',
        'Employe m = info.chercher("Moussa");',
        'm.augmenter(10);',
        'System.out.println(m);',
        'System.out.println(info.chercher("Zoé") == null ? "Zoé introuvable" : "Erreur");',
        'boolean parti = info.licencier("Léo");',
        'System.out.println("Léo parti : " + parti + " → " + info.effectif() + " employés");',
        'System.out.println("Mieux payé : " + info.mieuxPaye().getNom());',
      ),
      starter: S2,
      solution: S3,
      hints: ['mieuxPaye : Employe meilleur = null;  puis  if (meilleur == null || e.getSalaire() > meilleur.getSalaire()) meilleur = e;', 'chercher : if (e.getNom().equals(nom)) return e;  — et return null; après la boucle.'],
      tests: [{ world: { map: SCREEN } }],
      check: (run) => expectOutput(run, ['Mieux payé : Léo', 'Moussa · Technicien · 1980.0 €', 'Zoé introuvable', 'Léo parti : true → 2 employés', 'Mieux payé : Awa']),
      rules: (src, ast) => (/\.equals\s*\(/.test(codeOnly(src)) ? privateRule('Employe', 'Departement')(src, ast) : 'Compare les noms avec .equals(…).'),
    },
    {
      id: 'E-4',
      title: 'Les types de contrat',
      story: 'Un salarié coûte à l\'entreprise son salaire plus environ 50 % de charges. Un stagiaire, lui, ne coûte que sa gratification.',
      goal: [
        'Dans `Employe`, ajoute `double coutMensuel()` qui renvoie le salaire × 1.5.',
        'Écris `Stagiaire extends Employe` qui redéfinit `coutMensuel()` (la gratification seule) et `toString()` (ajoute ` (stagiaire)`). Dans `Departement`, ajoute `coutTotal()`.',
      ],
      notion: {
        title: 'Le polymorphisme au travail',
        text: 'La liste du département contient des Employe… dont certains sont des Stagiaire. coutTotal() appelle coutMensuel() sur chacun, et Java choisit automatiquement la bonne version.',
        code: 'for (Employe e : employes) {\n    total += e.coutMensuel(); // version de Stagiaire si c\'en est un\n}',
      },
      objects: [],
      carry: true,
      frame: useMain(...EQUIPE, 'info.embaucher(new Stagiaire("Inès", "Stagiaire data", 900));', 'info.afficher();', 'System.out.println("Coût mensuel : " + info.coutTotal() + " €");'),
      starter: S3,
      solution: S4,
      hints: ['Le constructeur : Stagiaire(String nom, String poste, double gratification) { super(nom, poste, gratification); }', '@Override\ndouble coutMensuel() { return getSalaire(); }   et   return super.toString() + " (stagiaire)";'],
      tests: [{ world: { map: SCREEN } }],
      check: (run) => expectOutput(run, ['Informatique (3 employés)', '- Awa · Développeuse · 2500.0 €', '- Léo · Développeur · 3200.0 €', '- Inès · Stagiaire data · 900.0 € (stagiaire)', 'Coût mensuel : 9450.0 €']),
      rules: (src, ast) => {
        const c = ast.classes.find((k) => k.name === 'Stagiaire');
        if (!c || c.superName !== 'Employe') return 'Stagiaire doit hériter de Employe : class Stagiaire extends Employe';
        return privateRule('Employe', 'Departement')(src, ast);
      },
    },
    {
      id: 'E-5',
      title: 'L\'entreprise',
      story: 'Fin d\'année : la direction veut un rapport sur toute l\'entreprise, tous départements confondus.',
      goal: [
        'Écris `Entreprise` : un nom, une `ArrayList<Departement>`, `ajouter(Departement d)`, `effectifTotal()` et `plusGrosBudget()` (le département à la plus grosse masse salariale).',
        'Ajoute `rapport()` : `Rapport de Java Corp` puis, pour chaque département, `Informatique : 3 employés, salaire moyen 2200.0 €`.',
      ],
      notion: {
        title: 'Des objets qui contiennent des objets',
        text: 'Une Entreprise contient des Departement, qui contiennent des Employe. Chaque classe s\'occupe de son niveau et s\'appuie sur les méthodes du niveau en dessous.',
        code: 'int total = 0;\nfor (Departement d : departements) {\n    total += d.effectif();\n}',
      },
      objects: [],
      carry: true,
      frame: useMain(
        'Entreprise ent = new Entreprise("Java Corp");',
        ...EQUIPE,
        'info.embaucher(new Stagiaire("Inès", "Stagiaire data", 900));',
        'Departement com = new Departement("Commercial");',
        'com.embaucher(new Employe("Tom", "Commercial", 2200));',
        'com.embaucher(new Employe("Sara", "Responsable", 3400));',
        'ent.ajouter(info);',
        'ent.ajouter(com);',
        'ent.rapport();',
        'System.out.println("Effectif total : " + ent.effectifTotal());',
        'System.out.println("Plus gros budget : " + ent.plusGrosBudget().getNom());',
      ),
      starter: S4,
      solution: S5,
      hints: ['effectifTotal : additionne d.effectif() pour chaque département.', 'plusGrosBudget : même idée que mieuxPaye, en comparant d.masseSalariale().'],
      tests: [{ world: { map: SCREEN } }],
      check: (run) => expectOutput(run, [
        'Rapport de Java Corp',
        'Informatique : 3 employés, salaire moyen 2200.0 €',
        'Commercial : 2 employés, salaire moyen 2800.0 €',
        'Effectif total : 5',
        'Plus gros budget : Informatique',
      ]),
      rules: privateRule('Employe', 'Departement', 'Entreprise'),
    },
  ],
};
