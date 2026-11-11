import { codeOnly, hasNumber, expectOutput, finalVar, timesChanged, chestCheck, stripComments } from '../validators.js';

export default {
  id: 'variables',
  num: 2,
  title: 'Variables',
  place: 'La banque et le restaurant',
  summary: 'Ranger des valeurs en mémoire, les calculer et les faire évoluer, comme un solde de compte.',
  levels: [
    {
      id: '2-1',
      title: 'Le coffre de la banque',
      story: 'Le code du coffre-fort de l\'agence est la somme du numéro d\'agence (20) et du numéro de guichet (5).',
      goal: [
        'Déclare une variable `guichet` qui vaut 5.',
        'Déclare une variable `code` égale à `agence + guichet`, puis ouvre le coffre avec `coffre.ouvrir(code);`.',
        'N\'écris pas 25 directement : laisse Java faire le calcul.',
      ],
      notion: {
        title: 'Déclarer une variable',
        text: 'Une variable est une case mémoire qui porte un nom et un type. int est le type des nombres entiers.',
        code: 'int age = 20;\nint bonus = 5;\nint total = age + bonus;',
      },
      objects: ['coffre'],
      starter: 'int agence = 20;\n// Déclare guichet, puis code\n\n',
      solution: 'int agence = 20;\nint guichet = 5;\nint code = agence + guichet;\ncoffre.ouvrir(code);\n',
      hints: ['Une déclaration s\'écrit : int guichet = 5;', 'Puis : int code = agence + guichet;  et enfin coffre.ouvrir(code);'],
      tests: [{ world: { map: ['.....', '.R.C.', '.....'], chestCode: 25 } }],
      check: (run) => {
        if (finalVar(run, 'guichet')?.value !== '5') return 'Il faut une variable guichet qui vaut 5.';
        if (finalVar(run, 'code')?.value !== '25') return 'Il faut une variable code qui contient agence + guichet.';
        return chestCheck(run, 25);
      },
      rules: (src) => (hasNumber(src, 25) ? 'Ne tape pas 25 toi-même : calcule-le avec agence + guichet.' : null),
    },
    {
      id: '2-2',
      title: 'Le compte bancaire',
      story: 'Un client a 100 € sur son compte. Il dépose 50 €, puis retire 30 €.',
      goal: [
        'Mets à jour la variable `solde` après chaque opération : `solde = solde + 50;` puis le retrait.',
        'Enfin, déverrouille le coffre avec le solde final : `coffre.ouvrir(solde);`.',
      ],
      notion: {
        title: 'Changer la valeur d\'une variable',
        text: 'Le = de Java ne veut pas dire « égal » : il range la valeur de droite dans la variable de gauche. On peut donc écrire x = x + 1.',
        code: 'int points = 10;\npoints = points + 5;  // points vaut 15',
      },
      objects: ['coffre'],
      starter: 'int solde = 100;\n\n',
      solution: 'int solde = 100;\nsolde = solde + 50;\nsolde = solde - 30;\ncoffre.ouvrir(solde);\n',
      hints: ['Le dépôt : solde = solde + 50;', 'Le retrait : solde = solde - 30;  Tu peux aussi écrire solde -= 30;'],
      tests: [{ world: { map: ['.....', '.R.C.', '.....'], chestCode: 120 } }],
      check: (run) => {
        if (timesChanged(run, 'solde') < 3) return 'La variable solde doit changer deux fois : un dépôt puis un retrait.';
        return chestCheck(run, 120);
      },
      rules: (src) => {
        if (!/int\s+solde\s*=\s*100\s*;/.test(codeOnly(src))) return 'Garde la première ligne : int solde = 100;';
        if (hasNumber(src, 120)) return 'Ne tape pas 120 toi-même : fais les opérations sur solde.';
        return null;
      },
    },
    {
      id: '2-3',
      title: 'Partager l\'addition',
      story: 'Au restaurant, deux amis partagent une addition de 25 €. Le terminal affiche 12.0 au lieu de 12.5…',
      goal: [
        'Lance le programme et observe la valeur de `part` en mode Pas à pas.',
        'Corrige le calcul pour afficher `12.5`, sans changer les deux premières lignes.',
      ],
      notion: {
        title: 'int ou double ?',
        text: 'int contient des entiers, double des nombres à virgule. Une division entre deux int donne un int : 25 / 2 vaut 12, la partie décimale est perdue. Si l\'un des deux est un double, le résultat est un double.',
        code: '25 / 2     // 12\n25 / 2.0   // 12.5\n(double) 25 / 2   // 12.5',
      },
      objects: [],
      starter: 'int addition = 25;\nint personnes = 2;\ndouble part = addition / personnes;\nSystem.out.println(part);\n',
      solution: 'int addition = 25;\nint personnes = 2;\ndouble part = (double) addition / personnes;\nSystem.out.println(part);\n',
      hints: ['addition et personnes sont des int : leur division est entière.', 'Convertis l\'un des deux en double : (double) addition / personnes'],
      tests: [{ world: { map: ['.....', '.R.T.', '.....'] } }],
      check: (run) => expectOutput(run, ['12.5']),
      rules: (src) => {
        const c = codeOnly(src);
        if (!/int\s+addition\s*=\s*25\s*;/.test(c) || !/int\s+personnes\s*=\s*2\s*;/.test(c)) return 'Garde les deux premières lignes telles quelles.';
        if (hasNumber(src, 12.5)) return 'Ne tape pas 12.5 toi-même : corrige le calcul.';
        return null;
      },
    },
    {
      id: '2-4',
      title: 'Le badge employé',
      story: 'L\'imprimante à badges compose le texte à partir des informations de l\'employé.',
      goal: [
        'Affiche exactement : `Awa DIALLO - étage 3`.',
        'Utilise les variables, la concaténation avec `+` et `nom.toUpperCase()` pour mettre le nom en majuscules.',
      ],
      notion: {
        title: 'Le texte : String',
        text: 'Un String contient du texte. L\'opérateur + colle des morceaux ensemble (concaténation), y compris des nombres. Un String possède des méthodes, comme toUpperCase().',
        code: 'String ville = "Dakar";\nSystem.out.println("Ville : " + ville.toUpperCase());',
      },
      objects: [],
      starter: 'String prenom = "Awa";\nString nom = "Diallo";\nint etage = 3;\n\n',
      solution: 'String prenom = "Awa";\nString nom = "Diallo";\nint etage = 3;\nSystem.out.println(prenom + " " + nom.toUpperCase() + " - étage " + etage);\n',
      hints: ['Pense aux espaces : prenom + " " + …', 'System.out.println(prenom + " " + nom.toUpperCase() + " - étage " + etage);'],
      tests: [{ world: { map: ['.....', '.R.T.', '.....'] } }],
      check: (run) => expectOutput(run, ['Awa DIALLO - étage 3']),
      rules: (src) => {
        if (/DIALLO/.test(stripComments(src))) return 'N\'écris pas DIALLO toi-même : utilise nom.toUpperCase().';
        if (!/\betage\b/.test(codeOnly(src).split('\n').slice(3).join('\n'))) return 'Utilise la variable etage pour afficher l\'étage.';
        return null;
      },
    },
  ],
};
