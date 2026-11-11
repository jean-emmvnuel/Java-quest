# Java Quest

Apprendre Java en voyant ce que le code fait réellement. Tout tourne dans le navigateur, sans backend.
L'application est installable (PWA) et fonctionne **hors connexion**.

Missions jouables : 1 Découverte · 2 Variables · 3 Conditions · 4 Boucles · 5 Tableaux · 6 Fonctions et procédures · 7 Classes et objets · 8 Héritage · 9 POO approfondie · 10 Mission combinée (44 niveaux).

Projets de la vie réelle : **Application bancaire** (6 étapes : compte, opérations sécurisées, historique avec `ArrayList`, virements, banque, compte épargne). **Suivi des dépenses** (5 étapes : opération, carnet de comptes, totaux par catégorie, budget, sauvegarde dans un fichier). **Pendu et Morpion** (6 étapes : mot caché, proposer une lettre, gagné ou perdu, grille 2D, jouer un coup, trouver le gagnant). Chaque étape reprend le code écrit à l'étape précédente, comme dans un vrai projet. Le projet « Gestion des employés » arrive ensuite.

Java pris en charge : types de base, `String`, conditions, boucles (dont for-each), tableaux (y compris à deux dimensions), `ArrayList<T>`, `split`, `Integer.parseInt` / `Double.parseDouble`, méthodes, classes, constructeurs, `private`, héritage, `super`, `@Override`, polymorphisme, classes abstraites et interfaces.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # vérifie les 16 niveaux et l'interpréteur
npm run build    # version installable (dossier dist/)
npm run preview  # tester la version installable et le mode hors connexion
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
    projects/        Projets de la vie réelle (étapes qui reprennent le code précédent : carry)
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

## Suivi des visites (optionnel)

Un petit Worker Cloudflare t'envoie un message Telegram à chaque nouveau visiteur (adresse IP jamais stockée ni transmise : seulement ville et pays). Mise en place pas à pas : [worker/README.md](worker/README.md).
