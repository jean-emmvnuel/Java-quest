import { expectOutput } from '../validators.js';

// Projet « Pendu et Morpion » : programmer la logique de deux jeux classiques.
// Étapes 1 à 3 : le Pendu (textes, caractères). Étapes 4 à 6 : le Morpion (grille à deux dimensions).
// Le code est repris d'une étape à l'autre (carry) à l'intérieur de chaque jeu.

const SCREEN = ['.....', '..T..', '.....'];

const useMain = (...lines) => ({
  before: [],
  after: ['', 'public class Main {', '    public static void main(String[] args) {', ...lines.map((l) => `        ${l}`), '    }', '}'],
  indent: 2,
});

// ---------- Pendu ----------
const PENDU_BASE = `class Pendu {
    private String mot;
    private String trouvees = "";
    private int erreurs = 0;

    Pendu(String mot) {
        this.mot = mot;
    }

    String motCache() {
        String resultat = "";
        for (int i = 0; i < mot.length(); i++) {
            char c = mot.charAt(i);
            if (trouvees.indexOf(c) >= 0) {
                resultat += c + " ";
            } else {
                resultat += "_ ";
            }
        }
        return resultat.trim();
    }
`;
const PROPOSER = `
    boolean proposer(char lettre) {
        if (mot.indexOf(lettre) >= 0) {
            if (trouvees.indexOf(lettre) < 0) {
                trouvees += lettre;
            }
            return true;
        }
        erreurs++;
        return false;
    }

    int getErreurs() {
        return erreurs;
    }
`;
const FIN = `
    boolean estGagne() {
        return motCache().indexOf('_') < 0;
    }

    boolean estPerdu() {
        return erreurs >= 6;
    }
`;
const P1 = `${PENDU_BASE}}\n`;
const P2 = `${PENDU_BASE}${PROPOSER}}\n`;
const P3 = `${PENDU_BASE}${PROPOSER}${FIN}}\n`;

// ---------- Morpion ----------
const MORPION_BASE = `class Morpion {
    private char[][] grille = new char[3][3];

    Morpion() {
        for (int i = 0; i < 3; i++) {
            for (int j = 0; j < 3; j++) {
                grille[i][j] = '.';
            }
        }
    }

    void afficher() {
        for (int i = 0; i < 3; i++) {
            System.out.println(grille[i][0] + " " + grille[i][1] + " " + grille[i][2]);
        }
    }
`;
const JOUER = `
    boolean jouer(int ligne, int colonne, char joueur) {
        if (ligne < 0 || ligne > 2 || colonne < 0 || colonne > 2 || grille[ligne][colonne] != '.') {
            System.out.println("Case invalide");
            return false;
        }
        grille[ligne][colonne] = joueur;
        return true;
    }
`;
const GAGNANT = `
    char gagnant() {
        for (int i = 0; i < 3; i++) {
            if (grille[i][0] != '.' && grille[i][0] == grille[i][1] && grille[i][1] == grille[i][2]) {
                return grille[i][0];
            }
            if (grille[0][i] != '.' && grille[0][i] == grille[1][i] && grille[1][i] == grille[2][i]) {
                return grille[0][i];
            }
        }
        if (grille[1][1] != '.' && grille[0][0] == grille[1][1] && grille[1][1] == grille[2][2]) {
            return grille[1][1];
        }
        if (grille[1][1] != '.' && grille[0][2] == grille[1][1] && grille[1][1] == grille[2][0]) {
            return grille[1][1];
        }
        return '.';
    }
`;
const M1 = `${MORPION_BASE}}\n`;
const M2 = `${MORPION_BASE}${JOUER}}\n`;
const M3 = `${MORPION_BASE}${JOUER}${GAGNANT}}\n`;

export default {
  id: 'jeux',
  num: 'P3',
  project: true,
  title: 'Pendu et Morpion',
  place: 'Projet · Tes premiers jeux',
  summary: 'Programme la logique de deux jeux classiques : le Pendu (lettres et mots) puis le Morpion (une grille).',
  levels: [
    {
      id: 'J-1',
      title: 'Le mot caché',
      story: 'Au Pendu, le joueur doit deviner un mot lettre par lettre. Au début, le mot est caché : on n\'affiche qu\'un tiret par lettre.',
      goal: [
        'Écris la classe `Pendu` : attributs private `mot`, `trouvees` (les lettres déjà trouvées, `""` au départ) et `erreurs` (0), et un constructeur `Pendu(String mot)`.',
        'Ajoute `String motCache()` : pour chaque lettre du mot, `J ` si elle est dans `trouvees`, sinon `_ `. Pour JAVA au début : `_ _ _ _`.',
      ],
      notion: {
        title: 'Parcourir un texte',
        text: 'Un String se parcourt comme un tableau : length() donne sa longueur et charAt(i) le caractère n°i. indexOf(c) renvoie la position d\'un caractère, ou -1 s\'il est absent.',
        code: 'String mot = "CHAT";\nfor (int i = 0; i < mot.length(); i++) {\n    char c = mot.charAt(i);\n}',
      },
      objects: [],
      frame: useMain('Pendu p = new Pendu("JAVA");', 'System.out.println(p.motCache());', 'Pendu q = new Pendu("ORDINATEUR");', 'System.out.println(q.motCache());'),
      starter: 'class Pendu {\n    \n}\n',
      solution: P1,
      hints: ['Construis le résultat dans un String vide, puis ajoute un morceau à chaque tour de boucle.', 'if (trouvees.indexOf(c) >= 0) { resultat += c + " "; } else { resultat += "_ "; }  et à la fin : return resultat.trim();'],
      tests: [{ world: { map: SCREEN } }],
      check: (run) => expectOutput(run, ['_ _ _ _', '_ _ _ _ _ _ _ _ _ _']),
    },
    {
      id: 'J-2',
      title: 'Proposer une lettre',
      story: 'Le joueur propose des lettres. Une bonne lettre apparaît partout dans le mot ; une mauvaise ajoute une erreur.',
      goal: [
        'Ajoute `boolean proposer(char lettre)` : si la lettre est dans le mot, ajoute-la à `trouvees` (une seule fois) et renvoie `true` ; sinon compte une erreur et renvoie `false`.',
        'Ajoute `int getErreurs()`.',
      ],
      notion: {
        title: 'Ajouter un caractère à un texte',
        text: 'On peut coller un char à un String avec + ou += : "AB" + \'C\' donne "ABC". C\'est pratique pour retenir les lettres déjà trouvées.',
        code: 'String vues = "";\nvues += \'A\';\nvues += \'E\';  // vues vaut "AE"',
      },
      objects: [],
      carry: true,
      frame: useMain(
        'Pendu p = new Pendu("JAVA");',
        "char[] essais = {'A', 'E', 'J', 'Z'};",
        'for (char c : essais) {',
        '    boolean bon = p.proposer(c);',
        '    System.out.println(c + (bon ? " : oui → " : " : non → ") + p.motCache());',
        '}',
        'System.out.println("Erreurs : " + p.getErreurs());',
      ),
      starter: P1,
      solution: P2,
      hints: ['if (mot.indexOf(lettre) >= 0) { … return true; }  puis  erreurs++; return false;', 'Pour ne l\'ajouter qu\'une fois : if (trouvees.indexOf(lettre) < 0) { trouvees += lettre; }'],
      tests: [{ world: { map: SCREEN } }],
      check: (run) => expectOutput(run, ['A : oui → _ A _ A', 'E : non → _ A _ A', 'J : oui → J A _ A', 'Z : non → J A _ A', 'Erreurs : 2']),
    },
    {
      id: 'J-3',
      title: 'Gagné ou perdu ?',
      story: 'Une partie complète ! Le joueur gagne quand il ne reste plus de tiret, et perd à la 6ᵉ erreur.',
      goal: [
        'Ajoute `boolean estGagne()` (plus aucun `_` dans le mot caché) et `boolean estPerdu()` (au moins 6 erreurs).',
        'Le main joue la partie lettre par lettre. Ton code est testé avec trois parties : une gagnée, une perdue, une pas finie.',
      ],
      notion: {
        title: 'Réutiliser ses méthodes',
        text: 'estGagne() peut simplement appeler motCache() et regarder s\'il reste un tiret : pas besoin de refaire la boucle.',
        code: 'boolean estVide() {\n    return texte().length() == 0;\n}',
      },
      objects: ['partie'],
      carry: true,
      frame: useMain(
        'Pendu p = new Pendu(partie.mot());',
        'for (char c : partie.lettres()) {',
        '    p.proposer(c);',
        '    if (p.estGagne() || p.estPerdu()) {',
        '        break;',
        '    }',
        '}',
        'System.out.println(p.motCache());',
        'if (p.estGagne()) {',
        '    System.out.println("Gagné ! Le mot était " + partie.mot());',
        '} else if (p.estPerdu()) {',
        '    System.out.println("Perdu ! Le mot était " + partie.mot());',
        '} else {',
        '    System.out.println("Partie en cours");',
        '}',
      ),
      starter: P2,
      solution: P3,
      hints: ['boolean estGagne() { return motCache().indexOf(\'_\') < 0; }', 'boolean estPerdu() { return erreurs >= 6; }'],
      tests: [
        { label: 'Gagnée', world: { map: SCREEN, mot: 'JAVA', lettres: 'AEJV' }, expected: ['J A V A', 'Gagné ! Le mot était JAVA'] },
        { label: 'Perdue', world: { map: SCREEN, mot: 'ROBOT', lettres: 'AEIUYSXO' }, expected: ['_ _ _ _ _', 'Perdu ! Le mot était ROBOT'] },
        { label: 'En cours', world: { map: SCREEN, mot: 'CODE', lettres: 'CO' }, expected: ['C O _ _', 'Partie en cours'] },
      ],
      check: (run, { test }) => expectOutput(run, test.expected),
    },
    {
      id: 'J-4',
      title: 'La grille du morpion',
      story: 'Deuxième jeu : le Morpion ! Deux joueurs, X et O, remplissent tour à tour une grille de 3 × 3 cases.',
      goal: [
        'Écris la classe `Morpion` avec une grille à deux dimensions : `private char[][] grille = new char[3][3];`.',
        'Le constructeur remplit toutes les cases avec `\'.\'` (deux boucles imbriquées), et `afficher()` montre les 3 lignes : `. . .`',
      ],
      notion: {
        title: 'Un tableau à deux dimensions',
        text: 'Un tableau 2D est un tableau de lignes. grille[1][2] désigne la ligne 1, colonne 2. On le parcourt avec deux boucles : une pour les lignes, une pour les colonnes.',
        code: 'int[][] t = new int[2][3];\nt[1][2] = 7;\nfor (int i = 0; i < 2; i++) {\n    for (int j = 0; j < 3; j++) {\n        // t[i][j]\n    }\n}',
      },
      objects: [],
      frame: useMain('Morpion m = new Morpion();', 'm.afficher();'),
      starter: 'class Morpion {\n    \n}\n',
      solution: M1,
      hints: ['Dans le constructeur : for (int i = 0; i < 3; i++) { for (int j = 0; j < 3; j++) { grille[i][j] = \'.\'; } }', 'Dans afficher : System.out.println(grille[i][0] + " " + grille[i][1] + " " + grille[i][2]);'],
      tests: [{ world: { map: SCREEN } }],
      check: (run) => expectOutput(run, ['. . .', '. . .', '. . .']),
    },
    {
      id: 'J-5',
      title: 'Jouer un coup',
      story: 'Un joueur choisit une case (ligne et colonne, de 0 à 2). Interdit de jouer hors de la grille ou sur une case déjà prise !',
      goal: [
        'Ajoute `boolean jouer(int ligne, int colonne, char joueur)`.',
        'Si la case n\'existe pas ou n\'est pas libre : affiche `Case invalide` et renvoie `false`. Sinon, place le symbole du joueur et renvoie `true`.',
      ],
      notion: {
        title: 'Vérifier avant d\'agir',
        text: 'L\'ordre des tests compte : on vérifie d\'abord que ligne et colonne sont entre 0 et 2, et seulement ensuite on regarde la case, sinon grille[3][0] provoquerait une erreur.',
        code: 'if (i < 0 || i >= t.length || t[i] != 0) {\n    return false;\n}',
      },
      objects: [],
      carry: true,
      frame: useMain('Morpion m = new Morpion();', "m.jouer(1, 1, 'X');", "m.jouer(0, 0, 'O');", "m.jouer(1, 1, 'O');", "m.jouer(3, 0, 'X');", "m.jouer(2, 2, 'X');", 'm.afficher();'),
      starter: M1,
      solution: M2,
      hints: ['if (ligne < 0 || ligne > 2 || colonne < 0 || colonne > 2 || grille[ligne][colonne] != \'.\') { … }', 'Sinon : grille[ligne][colonne] = joueur; return true;'],
      tests: [{ world: { map: SCREEN } }],
      check: (run) => expectOutput(run, ['Case invalide', 'Case invalide', 'O . .', '. X .', '. . X']),
    },
    {
      id: 'J-6',
      title: 'Qui a gagné ?',
      story: 'Un joueur gagne s\'il aligne trois symboles : sur une ligne, une colonne ou une diagonale.',
      goal: [
        'Ajoute `char gagnant()` : renvoie `\'X\'` ou `\'O\'` s\'il y a trois symboles alignés, sinon `\'.\'`.',
        'Vérifie les 3 lignes, les 3 colonnes et les 2 diagonales. Ton code est testé avec trois parties.',
      ],
      notion: {
        title: 'Plusieurs conditions',
        text: 'Trois cases sont alignées si elles ne sont pas vides et que la 1ʳᵉ est égale à la 2ᵉ ET la 2ᵉ égale à la 3ᵉ. Une boucle sur i permet de tester la ligne i et la colonne i en même temps.',
        code: 'if (a != \'.\' && a == b && b == c) {\n    return a;\n}',
      },
      objects: ['partie'],
      carry: true,
      frame: useMain(
        'Morpion m = new Morpion();',
        'int[] coups = partie.coups();',
        "char joueur = 'X';",
        'for (int i = 0; i < coups.length; i += 2) {',
        '    m.jouer(coups[i], coups[i + 1], joueur);',
        "    if (m.gagnant() != '.') {",
        '        break;',
        '    }',
        "    joueur = joueur == 'X' ? 'O' : 'X';",
        '}',
        'm.afficher();',
        'char g = m.gagnant();',
        'System.out.println(g == \'.\' ? "Match nul" : "Gagnant : " + g);',
      ),
      starter: M2,
      solution: M3,
      hints: ['Dans une boucle for (int i = 0; i < 3; i++) : teste la ligne grille[i][0..2] et la colonne grille[0..2][i].', 'Puis les deux diagonales, et enfin return \'.\'; si personne n\'a gagné.'],
      tests: [
        { label: 'Diagonale', world: { map: SCREEN, coups: [0, 0, 0, 1, 1, 1, 0, 2, 2, 2] }, expected: ['X O O', '. X .', '. . X', 'Gagnant : X'] },
        { label: 'Colonne', world: { map: SCREEN, coups: [0, 0, 0, 1, 2, 2, 1, 1, 1, 0, 2, 1] }, expected: ['X O .', 'X O .', '. O X', 'Gagnant : O'] },
        { label: 'Match nul', world: { map: SCREEN, coups: [0, 0, 0, 1, 0, 2, 1, 1, 1, 0, 1, 2, 2, 1, 2, 0, 2, 2] }, expected: ['X O X', 'X O O', 'O X X', 'Match nul'] },
      ],
      check: (run, { test }) => expectOutput(run, test.expected),
    },
  ],
};
