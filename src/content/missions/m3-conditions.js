import { expectOutput, goalCheck } from '../validators.js';

export default {
  id: 'conditions',
  num: 3,
  title: 'Conditions',
  place: 'La maison connectée',
  summary: 'Prendre des décisions : ouvrir une porte, régler le chauffage, contrôler un accès.',
  levels: [
    {
      id: '3-1',
      title: 'La porte automatique',
      story: 'La porte du garage est parfois ouverte, parfois fermée. Le robot ne doit jamais foncer dedans.',
      goal: [
        'Si `porte.estOuverte()` est vrai, fais avancer le robot jusqu\'à la zone d\'arrivée (4 cases).',
        'Sinon, affiche `Porte fermée`.',
        'Ton code sera testé avec la porte ouverte ET avec la porte fermée.',
      ],
      notion: {
        title: 'if / else',
        text: 'if exécute un bloc seulement si la condition est vraie (true). Le bloc else est exécuté dans le cas contraire.',
        code: 'if (pluie) {\n    System.out.println("Parapluie");\n} else {\n    System.out.println("Lunettes");\n}',
      },
      objects: ['robot', 'porte'],
      starter: 'if (porte.estOuverte()) {\n    \n} else {\n    \n}\n',
      solution: 'if (porte.estOuverte()) {\n    robot.avancer();\n    robot.avancer();\n    robot.avancer();\n    robot.avancer();\n} else {\n    System.out.println("Porte fermée");\n}\n',
      hints: ['Mets les 4 robot.avancer(); dans le premier bloc.', 'Dans le else : System.out.println("Porte fermée");'],
      tests: [
        { label: 'Porte ouverte', world: { map: ['R.D.G'], doorOpen: true } },
        { label: 'Porte fermée', world: { map: ['R.D.G'], doorOpen: false } },
      ],
      check: (run, { test }) => (test.world.doorOpen ? goalCheck(run) : expectOutput(run, ['Porte fermée'])),
    },
    {
      id: '3-2',
      title: 'Le thermostat',
      story: 'Le thermostat de la maison choisit entre chauffage, ventilation et climatisation.',
      goal: [
        'Lis la température avec `thermostat.temperature()`.',
        'En dessous de 18 °C, active le levier 1 (chauffage). De 18 à 25 °C inclus, le levier 2 (ventilation). Au-dessus de 25 °C, le levier 3 (climatisation).',
        'Ton code est testé avec 12, 18, 25 et 31 °C : attention aux limites !',
      ],
      notion: {
        title: 'else if',
        text: 'On enchaîne plusieurs conditions avec else if. Java les teste dans l\'ordre et exécute seulement le premier bloc dont la condition est vraie.',
        code: 'if (note >= 16) {\n    mention = "Très bien";\n} else if (note >= 12) {\n    mention = "Bien";\n} else {\n    mention = "Passable";\n}',
      },
      objects: ['thermostat', 'leviers'],
      starter: 'int t = thermostat.temperature();\n\n',
      solution: 'int t = thermostat.temperature();\nif (t < 18) {\n    leviers.activer(1);\n} else if (t <= 25) {\n    leviers.activer(2);\n} else {\n    leviers.activer(3);\n}\n',
      hints: ['Premier test : if (t < 18)', '« De 18 à 25 inclus » se teste avec <= 25.'],
      tests: [12, 18, 25, 31].map((temp) => ({ label: `${temp} °C`, world: { map: ['.....', '.S.L.', '..R..'], temp } })),
      check: (run, { test }) => {
        const t = test.world.temp;
        const want = t < 18 ? 1 : t <= 25 ? 2 : 3;
        const got = run.world.lever.value;
        if (got === want) return null;
        if (!got) return `À ${t} °C, aucun levier n'a été activé.`;
        return `À ${t} °C, il fallait le levier ${want}, pas le levier ${got}.`;
      },
    },
    {
      id: '3-3',
      title: 'Accès sécurisé',
      story: 'La salle des serveurs ne s\'ouvre que pour un robot qui a un badge ET au moins 20 % de batterie.',
      goal: [
        'Si `robot.aBadge()` est vrai et que `robot.energie()` vaut au moins 20, ouvre la porte avec `porte.ouvrir()`.',
        'Sinon, affiche `Accès refusé`.',
      ],
      notion: {
        title: 'Combiner des conditions',
        text: '&& signifie ET : les deux conditions doivent être vraies. || signifie OU : il suffit qu\'une seule soit vraie. ! signifie NON.',
        code: 'if (age >= 18 && aPermis) {\n    System.out.println("Peut conduire");\n}',
      },
      objects: ['robot', 'porte'],
      starter: '\n',
      solution: 'if (robot.aBadge() && robot.energie() >= 20) {\n    porte.ouvrir();\n} else {\n    System.out.println("Accès refusé");\n}\n',
      hints: ['Les deux conditions se combinent avec && .', 'if (robot.aBadge() && robot.energie() >= 20) { … } else { … }'],
      tests: [
        { label: 'Badge, 80 %', world: { map: ['R.D.G'], badge: true, energy: 80 } },
        { label: 'Badge, 20 %', world: { map: ['R.D.G'], badge: true, energy: 20 } },
        { label: 'Badge, 10 %', world: { map: ['R.D.G'], badge: true, energy: 10 } },
        { label: 'Sans badge', world: { map: ['R.D.G'], badge: false, energy: 90 } },
      ],
      check: (run, { test }) => {
        const ok = test.world.badge && test.world.energy >= 20;
        if (ok) return run.world.door.open ? null : `Le robot a un badge et ${test.world.energy} % de batterie : la porte devait s'ouvrir.`;
        if (run.world.door.open) return `Avec ${test.world.badge ? `${test.world.energy} % de batterie` : 'aucun badge'}, la porte ne devait pas s'ouvrir !`;
        return expectOutput(run, ['Accès refusé']);
      },
    },
  ],
};
