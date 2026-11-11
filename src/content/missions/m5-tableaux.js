import { codeOnly, count, expectOutput } from '../validators.js';
import { formatDouble } from '../../engine/java/format.js';

const SCREEN = ['.....', '..T..', '.....'];

export default {
  id: 'tableaux',
  num: 5,
  title: 'Tableaux',
  place: 'L\'école et le magasin',
  summary: 'Ranger plusieurs valeurs sous un seul nom : notes, stocks, prix d\'un ticket de caisse.',
  levels: [
    {
      id: '5-1',
      title: 'Les notes de la classe',
      story: 'Le professeur a rangé les notes de quatre élèves dans un seul tableau.',
      goal: [
        'Affiche la **première** note, puis la **dernière** note du tableau `notes`.',
        'Utilise les numéros de case : n\'écris pas les nombres toi-même.',
      ],
      notion: {
        title: 'Un tableau',
        text: 'Un tableau range plusieurs valeurs du même type, les unes à côté des autres. Chaque case a un numéro (son indice) qui commence à 0 : la première case est notes[0].',
        code: 'int[] notes = {12, 15, 9, 18};\nSystem.out.println(notes[1]); // 15',
      },
      objects: [],
      starter: 'int[] notes = {12, 15, 9, 18};\n\n',
      solution: 'int[] notes = {12, 15, 9, 18};\nSystem.out.println(notes[0]);\nSystem.out.println(notes[3]);\n',
      hints: ['La première case est la case 0.', 'Il y a 4 notes : la dernière est dans la case 3 (ou notes.length - 1).'],
      tests: [{ world: { map: SCREEN } }],
      check: (run) => expectOutput(run, ['12', '18']),
      rules: (src) => {
        const rest = codeOnly(src).split('\n').slice(1).join('\n');
        if (/\b(12|18)\b/.test(rest)) return 'N\'écris pas les notes toi-même : lis-les dans le tableau avec notes[…].';
        return null;
      },
    },
    {
      id: '5-2',
      title: 'Le stock du magasin',
      story: 'Le magasin suit le stock de trois produits. Un client achète 3 exemplaires du produit n°2, et le produit n°1 est réapprovisionné de 10.',
      goal: [
        'Mets à jour le tableau : enlève 3 à `stock[2]` et ajoute 10 à `stock[1]`.',
        'Affiche ensuite chaque case avec une boucle `for` qui va jusqu\'à `stock.length`.',
      ],
      notion: {
        title: 'Modifier et parcourir',
        text: 'Une case se modifie comme une variable : stock[0] = 4;  Pour parcourir tout le tableau, on fait varier l\'indice de 0 à length - 1.',
        code: 'for (int i = 0; i < t.length; i++) {\n    System.out.println(t[i]);\n}',
      },
      objects: [],
      starter: 'int[] stock = {5, 0, 8};\n\n',
      solution: 'int[] stock = {5, 0, 8};\nstock[2] = stock[2] - 3;\nstock[1] = stock[1] + 10;\nfor (int i = 0; i < stock.length; i++) {\n    System.out.println(stock[i]);\n}\n',
      hints: ['stock[2] = stock[2] - 3;  (ou stock[2] -= 3;)', 'for (int i = 0; i < stock.length; i++) { System.out.println(stock[i]); }'],
      tests: [{ world: { map: SCREEN } }],
      check: (run) => expectOutput(run, ['5', '10', '5']),
      rules: (src) => {
        if (!/stock\s*\.\s*length/.test(codeOnly(src))) return 'Utilise stock.length dans ta boucle.';
        if (count(src, /System\s*\.\s*out\s*\.\s*print/g) > 1) return 'Un seul System.out.println, dans la boucle.';
        return null;
      },
    },
    {
      id: '5-3',
      title: 'Le ticket de caisse',
      story: 'La caisse du supermarché envoie la liste des prix des articles scannés. Il faut calculer le total.',
      goal: [
        'Additionne tous les prix du tableau dans une variable `total`, avec une boucle.',
        'Affiche le total. Ton code est testé avec deux paniers différents.',
      ],
      notion: {
        title: 'Additionner un tableau',
        text: 'On part d\'un total à 0 et on lui ajoute chaque case, une par une.',
        code: 'double total = 0;\nfor (int i = 0; i < prix.length; i++) {\n    total += prix[i];\n}',
      },
      objects: ['caisse'],
      starter: 'double[] prix = caisse.prix();\ndouble total = 0;\n\n',
      solution: 'double[] prix = caisse.prix();\ndouble total = 0;\nfor (int i = 0; i < prix.length; i++) {\n    total += prix[i];\n}\nSystem.out.println(total);\n',
      hints: ['for (int i = 0; i < prix.length; i++) { … }', 'Dans la boucle : total += prix[i];  après la boucle : System.out.println(total);'],
      tests: [
        { label: 'Panier 1', world: { map: SCREEN, prix: [2.5, 4.0, 1.5, 3.0] } },
        { label: 'Panier 2', world: { map: SCREEN, prix: [1.25, 2.75, 10.0] } },
      ],
      check: (run, { test }) => expectOutput(run, [formatDouble(test.world.prix.reduce((a, b) => a + b, 0))]),
    },
    {
      id: '5-4',
      title: 'La meilleure note',
      story: 'Le bulletin doit afficher la meilleure note de la classe. Le nombre d\'élèves change d\'une classe à l\'autre.',
      goal: [
        'Trouve la plus grande note du tableau et affiche `Meilleure note : 18` (avec la bonne valeur).',
        'Idée : garde la meilleure note vue jusqu\'ici dans une variable, et compare-la à chaque case.',
      ],
      notion: {
        title: 'Chercher un maximum',
        text: 'On commence avec la première case comme « meilleure », puis on la remplace chaque fois qu\'on trouve plus grand.',
        code: 'int max = t[0];\nfor (int i = 1; i < t.length; i++) {\n    if (t[i] > max) {\n        max = t[i];\n    }\n}',
      },
      objects: ['ecole'],
      starter: 'int[] notes = ecole.notes();\n\n',
      solution: 'int[] notes = ecole.notes();\nint max = notes[0];\nfor (int i = 1; i < notes.length; i++) {\n    if (notes[i] > max) {\n        max = notes[i];\n    }\n}\nSystem.out.println("Meilleure note : " + max);\n',
      hints: ['int max = notes[0];', 'Dans la boucle : if (notes[i] > max) { max = notes[i]; }'],
      tests: [
        { label: 'Classe A', world: { map: SCREEN, notes: [12, 15, 9, 18] } },
        { label: 'Classe B', world: { map: SCREEN, notes: [7, 19, 3] } },
        { label: 'Un élève', world: { map: SCREEN, notes: [11] } },
      ],
      check: (run, { test }) => expectOutput(run, [`Meilleure note : ${Math.max(...test.world.notes)}`]),
    },
    {
      id: '5-5',
      title: 'Les admis',
      story: 'Pour le conseil de classe, il faut compter les élèves qui ont au moins 10.',
      goal: [
        'Compte les notes supérieures ou égales à 10 et affiche `Admis : 3` (avec le bon nombre).',
        'Utilise la boucle « pour chaque » : `for (int note : notes)`.',
      ],
      notion: {
        title: 'La boucle « pour chaque »',
        text: 'for (int note : notes) passe sur chaque case du tableau, dans l\'ordre. Pas besoin d\'indice : la variable note prend directement chaque valeur.',
        code: 'for (int note : notes) {\n    System.out.println(note);\n}',
      },
      objects: ['ecole'],
      starter: 'int[] notes = ecole.notes();\nint admis = 0;\n\n',
      solution: 'int[] notes = ecole.notes();\nint admis = 0;\nfor (int note : notes) {\n    if (note >= 10) {\n        admis++;\n    }\n}\nSystem.out.println("Admis : " + admis);\n',
      hints: ['for (int note : notes) { … }', 'Dans la boucle : if (note >= 10) { admis++; }'],
      tests: [
        { label: 'Classe A', world: { map: SCREEN, notes: [12, 15, 9, 18] } },
        { label: 'Classe B', world: { map: SCREEN, notes: [4, 8, 10] } },
      ],
      check: (run, { test }) => expectOutput(run, [`Admis : ${test.world.notes.filter((n) => n >= 10).length}`]),
      rules: (src) => (/for\s*\(\s*int\s+\w+\s*:/.test(codeOnly(src)) ? null : 'Utilise la boucle for (int note : notes).'),
    },
  ],
};
