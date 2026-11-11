import { expectOutput, goalCheck } from '../validators.js';

const SCREEN = ['.....', '..T..', '.....'];

/** Cadre : l'élève écrit des méthodes dans la classe Main ; le main (fixe) les utilise. */
const withMain = (...lines) => ({
  before: ['public class Main {', ''],
  after: ['', '    public static void main(String[] args) {', ...lines.map((l) => `        ${l}`), '    }', '}'],
  indent: 4,
});

export default {
  id: 'fonctions',
  num: 6,
  title: 'Fonctions et procédures',
  place: 'L\'atelier',
  summary: 'Créer ses propres méthodes : donner un nom à une action, lui passer des paramètres, renvoyer un résultat.',
  levels: [
    {
      id: '6-1',
      title: 'Ma première procédure',
      story: 'À l\'accueil de l\'atelier, on dit bonjour à chaque visiteur. Plutôt que de répéter le code, on lui donne un nom.',
      goal: [
        'Complète la méthode `saluer()` pour qu\'elle affiche `Bonjour !`.',
        'Regarde le main en bas : il appelle `saluer()` deux fois. Observe en Pas à pas comment Java saute dans ta méthode puis revient.',
      ],
      notion: {
        title: 'Une procédure',
        text: 'Une méthode void (une « procédure ») regroupe des instructions sous un nom. On l\'exécute en l\'appelant : saluer();  Le mot static permet de l\'appeler directement depuis main.',
        code: 'static void direAuRevoir() {\n    System.out.println("Au revoir");\n}',
      },
      objects: [],
      frame: withMain('saluer();', 'saluer();'),
      starter: 'static void saluer() {\n    \n}\n',
      solution: 'static void saluer() {\n    System.out.println("Bonjour !");\n}\n',
      hints: ['Entre les accolades de saluer, écris l\'affichage.', 'System.out.println("Bonjour !");'],
      tests: [{ world: { map: SCREEN } }],
      check: (run) => expectOutput(run, ['Bonjour !', 'Bonjour !']),
    },
    {
      id: '6-2',
      title: 'Avec un paramètre',
      story: 'Les visiteurs aiment qu\'on les appelle par leur prénom.',
      goal: [
        'Écris la méthode `static void saluer(String prenom)` qui affiche `Bonjour Awa !` (avec le prénom reçu).',
        'Le main l\'appelle avec "Awa" puis avec "Léo".',
      ],
      notion: {
        title: 'Les paramètres',
        text: 'Un paramètre est une variable qui reçoit une valeur au moment de l\'appel. Avec saluer("Léo"), le paramètre prenom vaut "Léo" pendant l\'exécution de la méthode.',
        code: 'static void feliciter(String nom) {\n    System.out.println("Bravo " + nom);\n}',
      },
      objects: [],
      frame: withMain('saluer("Awa");', 'saluer("Léo");'),
      starter: '// Écris ici la méthode saluer(String prenom)\n',
      solution: 'static void saluer(String prenom) {\n    System.out.println("Bonjour " + prenom + " !");\n}\n',
      hints: ['La première ligne : static void saluer(String prenom) {', 'À l\'intérieur : System.out.println("Bonjour " + prenom + " !");'],
      tests: [{ world: { map: SCREEN } }],
      check: (run) => expectOutput(run, ['Bonjour Awa !', 'Bonjour Léo !']),
    },
    {
      id: '6-3',
      title: 'Le prix TTC',
      story: 'La boutique de l\'atelier affiche ses prix hors taxes. Il faut ajouter 20 % de TVA.',
      goal: [
        'Écris la fonction `static double prixTTC(double prixHT)` qui **renvoie** le prix multiplié par 1.2.',
        'C\'est le main qui affiche le résultat : ta fonction ne doit rien afficher, seulement renvoyer la valeur avec `return`.',
      ],
      notion: {
        title: 'Une fonction qui renvoie',
        text: 'Au lieu de void, on écrit le type du résultat. return renvoie la valeur à celui qui a appelé la fonction, qui peut alors l\'utiliser.',
        code: 'static int doubler(int n) {\n    return n * 2;\n}\n// doubler(5) vaut 10',
      },
      objects: [],
      frame: withMain('System.out.println(prixTTC(10));', 'System.out.println(prixTTC(50));'),
      starter: '// Écris ici la fonction prixTTC\n',
      solution: 'static double prixTTC(double prixHT) {\n    return prixHT * 1.2;\n}\n',
      hints: ['static double prixTTC(double prixHT) { … }', 'Une seule ligne dans la fonction : return prixHT * 1.2;'],
      tests: [{ world: { map: SCREEN } }],
      check: (run) => expectOutput(run, ['12.0', '60.0']),
    },
    {
      id: '6-4',
      title: 'Le convertisseur',
      story: 'Un correspondant américain parle de la température en degrés Fahrenheit.',
      goal: [
        'Écris `static double enFahrenheit(double celsius)` qui renvoie `celsius * 9 / 5 + 32`.',
        'Le main convertit 0 °C, 100 °C et 37 °C.',
      ],
      notion: {
        title: 'Réutiliser une fonction',
        text: 'Une fonction écrite une fois peut être appelée autant de fois qu\'on veut, avec des valeurs différentes. Chaque appel a ses propres paramètres.',
        code: 'System.out.println(enFahrenheit(20));',
      },
      objects: [],
      frame: withMain('System.out.println(enFahrenheit(0));', 'System.out.println(enFahrenheit(100));', 'System.out.println(enFahrenheit(37));'),
      starter: '// Écris ici la fonction enFahrenheit\n',
      solution: 'static double enFahrenheit(double celsius) {\n    return celsius * 9 / 5 + 32;\n}\n',
      hints: ['La fonction reçoit un double et renvoie un double.', 'return celsius * 9 / 5 + 32;'],
      tests: [{ world: { map: SCREEN } }],
      check: (run) => expectOutput(run, ['32.0', '212.0', '98.6']),
    },
    {
      id: '6-5',
      title: 'Les pas du robot',
      story: 'Le robot de l\'atelier répète souvent « avancer plusieurs fois ». Créons-lui une action sur mesure.',
      goal: [
        'Écris `static void avancerDe(int n)` qui fait avancer le robot de `n` cases, avec une boucle.',
        'Le main l\'utilise pour amener le robot à la zone d\'arrivée.',
      ],
      notion: {
        title: 'Une procédure avec une boucle',
        text: 'Le paramètre peut servir à contrôler une boucle : la même méthode fait 2 pas, 3 pas ou 10 pas selon la valeur reçue.',
        code: 'static void sauter(int fois) {\n    for (int i = 0; i < fois; i++) {\n        // …\n    }\n}',
      },
      objects: ['robot'],
      frame: withMain('avancerDe(3);', 'robot.tournerDroite();', 'avancerDe(2);'),
      starter: '// Écris ici la méthode avancerDe(int n)\n',
      solution: 'static void avancerDe(int n) {\n    for (int i = 0; i < n; i++) {\n        robot.avancer();\n    }\n}\n',
      hints: ['static void avancerDe(int n) { … }', 'Dans la méthode : for (int i = 0; i < n; i++) { robot.avancer(); }'],
      tests: [{ world: { map: ['R...#', '###.#', '###G#'] } }],
      check: goalCheck,
    },
    {
      id: '6-6',
      title: 'Pair ou impair ?',
      story: 'Pour former des équipes de deux, l\'atelier doit savoir si un nombre de participants est pair.',
      goal: [
        'Écris `static boolean estPair(int n)` qui renvoie `true` si n est pair, `false` sinon.',
        'Un nombre est pair quand le reste de sa division par 2 vaut 0 : `n % 2 == 0`.',
      ],
      notion: {
        title: 'Renvoyer un boolean',
        text: 'Une fonction peut renvoyer le résultat d\'une comparaison directement : return a > b; renvoie true ou false.',
        code: 'static boolean estMajeur(int age) {\n    return age >= 18;\n}',
      },
      objects: [],
      frame: withMain('System.out.println(estPair(4));', 'System.out.println(estPair(7));', 'System.out.println(estPair(0));'),
      starter: '// Écris ici la fonction estPair\n',
      solution: 'static boolean estPair(int n) {\n    return n % 2 == 0;\n}\n',
      hints: ['static boolean estPair(int n) { … }', 'return n % 2 == 0;'],
      tests: [{ world: { map: SCREEN } }],
      check: (run) => expectOutput(run, ['true', 'false', 'true']),
    },
  ],
};
