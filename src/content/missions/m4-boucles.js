import { codeOnly, count, hasNumber, expectOutput, chestCheck, goalCheck } from '../validators.js';

export default {
  id: 'boucles',
  num: 4,
  title: 'Boucles',
  place: 'La logistique',
  summary: 'Répéter des actions sans recopier le code : couloirs, comptes à rebours, épargne et labyrinthe.',
  levels: [
    {
      id: '4-1',
      title: 'Le long couloir',
      story: 'Le couloir des réserves fait 8 cases. Recopier 8 fois la même ligne ? Pas question.',
      goal: [
        'Amène le robot au bout du couloir en écrivant `robot.avancer();` une seule fois.',
        'Utilise une boucle `for` qui répète l\'instruction 8 fois.',
      ],
      notion: {
        title: 'La boucle for',
        text: 'for (départ; condition; pas) répète son bloc tant que la condition est vraie. La variable i compte les tours.',
        code: 'for (int i = 0; i < 3; i++) {\n    System.out.println("Tour " + i);\n}',
      },
      objects: ['robot'],
      starter: '\n',
      solution: 'for (int i = 0; i < 8; i++) {\n    robot.avancer();\n}\n',
      hints: ['for (int i = 0; i < 8; i++) { … }', 'Observe en Pas à pas comment i passe de 0 à 8.'],
      tests: [{ world: { map: ['..........', 'R.......G.', '..........'] } }],
      check: goalCheck,
      rules: (src) => (count(src, /robot\s*\.\s*avancer\s*\(/g) > 1 ? 'Écris robot.avancer(); une seule fois, dans une boucle.' : null),
    },
    {
      id: '4-2',
      title: 'Le micro-ondes',
      story: 'Le micro-ondes affiche un compte à rebours de 5 à 1, puis sonne.',
      goal: [
        'Affiche `5`, `4`, `3`, `2`, `1` (une valeur par ligne) puis `Ding !`.',
        'Utilise une boucle : `System.out.println` ne doit apparaître que deux fois dans ton code.',
      ],
      notion: {
        title: 'Compter à rebours',
        text: 'Une boucle peut aussi descendre : on part d\'une grande valeur et on la diminue avec i-- à chaque tour.',
        code: 'for (int i = 3; i >= 1; i--) {\n    System.out.println(i);\n}',
      },
      objects: [],
      starter: '\n',
      solution: 'for (int i = 5; i >= 1; i--) {\n    System.out.println(i);\n}\nSystem.out.println("Ding !");\n',
      hints: ['Commence à 5, continue tant que i >= 1, et diminue i à chaque tour.', 'Le « Ding ! » s\'affiche une seule fois : après la boucle.'],
      tests: [{ world: { map: ['.....', '.R.T.', '.....'] } }],
      check: (run) => expectOutput(run, ['5', '4', '3', '2', '1', 'Ding !']),
      rules: (src) => (count(src, /System\s*\.\s*out\s*\.\s*print/g) > 2 ? 'Utilise une boucle : pas plus de deux System.out.println.' : null),
    },
    {
      id: '4-3',
      title: 'Distance inconnue',
      story: 'Les rayonnages changent de place chaque jour : le robot ne sait pas à l\'avance combien de cases parcourir.',
      goal: [
        'Fais avancer le robot tant qu\'il n\'est pas devant un mur : `robot.devantMur()` renvoie true quand la voie est bloquée.',
        'Ton code est testé dans deux allées de longueurs différentes.',
      ],
      notion: {
        title: 'La boucle while',
        text: 'while (condition) répète son bloc tant que la condition est vraie. On l\'utilise quand on ne connaît pas le nombre de tours à l\'avance. ! inverse une condition.',
        code: 'while (!estArrive) {\n    // avancer…\n}',
      },
      objects: ['robot'],
      starter: '\n',
      solution: 'while (!robot.devantMur()) {\n    robot.avancer();\n}\n',
      hints: ['while (!robot.devantMur()) { … }', 'Dans la boucle, une seule instruction : robot.avancer();'],
      tests: [
        { label: 'Allée courte', world: { map: ['R..G#'] } },
        { label: 'Allée longue', world: { map: ['R......G#'] } },
      ],
      check: goalCheck,
    },
    {
      id: '4-4',
      title: 'Le plan d\'épargne',
      story: 'Une étudiante épargne 10 € la 1re semaine, 20 € la 2e, 30 € la 3e… jusqu\'à la 10e semaine.',
      goal: [
        'Calcule le total épargné au bout de 10 semaines avec une boucle et une variable `total`.',
        'Ouvre la tirelire-coffre avec `coffre.ouvrir(total);`.',
      ],
      notion: {
        title: 'L\'accumulateur',
        text: 'Pour additionner beaucoup de valeurs, on part d\'une variable à 0 et on lui ajoute une valeur à chaque tour de boucle.',
        code: 'int somme = 0;\nfor (int i = 1; i <= 3; i++) {\n    somme = somme + i;\n}',
      },
      objects: ['coffre'],
      starter: 'int total = 0;\n\n',
      solution: 'int total = 0;\nfor (int semaine = 1; semaine <= 10; semaine++) {\n    total += semaine * 10;\n}\ncoffre.ouvrir(total);\n',
      hints: ['for (int semaine = 1; semaine <= 10; semaine++)', 'À chaque tour : total = total + semaine * 10;'],
      tests: [{ world: { map: ['.....', '.R.C.', '.....'], chestCode: 550 } }],
      check: (run) => chestCheck(run, 'le total des 10 semaines'),
      rules: (src) => {
        if (!/\b(for|while)\b/.test(codeOnly(src))) return 'Utilise une boucle pour faire le calcul.';
        if (hasNumber(src, 550)) return 'Ne tape pas le résultat toi-même : calcule-le avec la boucle.';
        return null;
      },
    },
    {
      id: '4-5',
      title: 'Le labyrinthe',
      story: 'Le robot doit sortir de la zone de stockage, dont le plan change selon les jours.',
      goal: [
        'Répète tant que le robot n\'est pas sur la sortie (`robot.surSortie()`) : s\'il est devant un mur, il tourne à droite, sinon il avance.',
        'Ton code est testé dans deux plans différents.',
      ],
      notion: {
        title: 'Une condition dans une boucle',
        text: 'On peut placer un if dans une boucle : à chaque tour, le programme décide quoi faire selon la situation.',
        code: 'while (!fini) {\n    if (obstacle) {\n        // contourner\n    } else {\n        // avancer\n    }\n}',
      },
      objects: ['robot'],
      starter: 'while (!robot.surSortie()) {\n    \n}\n',
      solution: 'while (!robot.surSortie()) {\n    if (robot.devantMur()) {\n        robot.tournerDroite();\n    } else {\n        robot.avancer();\n    }\n}\n',
      hints: ['Dans la boucle : if (robot.devantMur()) { … } else { … }', 'Bloc if : robot.tournerDroite();  bloc else : robot.avancer();'],
      tests: [
        { label: 'Plan A', world: { map: ['R....', '####.', '..G#.', '.###.', '.....'] } },
        { label: 'Plan B', world: { map: ['R..#', '##.#', 'G..#'] } },
      ],
      check: goalCheck,
    },
  ],
};
