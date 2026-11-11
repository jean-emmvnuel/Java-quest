# Java Quest

Apprendre Java en voyant ce que le code fait réellement. Tout tourne dans le navigateur, sans backend.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # vérifie les 16 niveaux et l'interpréteur
npm run build
```

## Architecture

```
src/
  engine/            Moteur, sans React (testable en Node)
    java/            Interpréteur Java : lexer → parser → checker (« javac ») → interpreter (trace pas à pas)
    world/           Le monde : map.js (grille, robot) et objects.js (robot, coffre, porte… appelables depuis Java)
    runLevel.js      Compile, exécute chaque situation de test et valide le niveau
  content/           Contenu pédagogique, sans code d'interface
    missions/        Un fichier par mission (niveaux, consignes, tests)
    validators.js    Aides de validation partagées
    index.js         Catalogue : missions, projets à venir, liste des niveaux
  state/             Hooks React : progression (étoiles), exécution automatique, lecture de la trace
  ui/                Composants, chacun avec sa feuille de style
  styles/            Tokens de design (thème clair) et styles de base
tests/               npm test : chaque solution passe, chaque code de départ échoue
design/logo/         Recherches de logo
```

Le code s'exécute **automatiquement et en silence** : pendant la frappe rien ne s'affiche ; dès que l'élève s'arrête (0,8 s) et que le code compile, il est exécuté puis rejoué sur la scène. Les explications d'erreur ne s'affichent que si l'élève clique sur « Pourquoi ça ne marche pas ? » (proposé après 3 s sans frappe).

## Ajouter un niveau

Dans `src/content/missions/`, ajoute un objet à la liste `levels` d'une mission : `story`, `goal`, `notion`, `objects`, `starter`, `solution`, `hints`, `tests` (une carte ASCII par situation) et `check(run)` qui renvoie `null` si c'est réussi, ou un message sinon. Lance `npm test`.
