import m1 from './missions/m1-decouverte.js';
import m2 from './missions/m2-variables.js';
import m3 from './missions/m3-conditions.js';
import m4 from './missions/m4-boucles.js';
import m5 from './missions/m5-tableaux.js';
import m6 from './missions/m6-fonctions.js';
import m7 from './missions/m7-objets.js';
import m8 from './missions/m8-heritage.js';
import m9 from './missions/m9-poo.js';
import m10 from './missions/m10-combinee.js';
import banque from './projects/banque.js';

// Catalogue des missions. Pour ajouter une mission jouable : créer un fichier dans missions/ et l'ajouter ici.

// Projets de la vie réelle : de vraies applications construites étape par étape.
// Le code de chaque étape est repris à l'étape suivante (champ carry des niveaux).
export const PROJECTS = [
  banque,
  { id: 'depenses', title: 'Suivi des dépenses', summary: 'Revenus et dépenses par catégorie, totaux et historique sauvegardé.' },
  { id: 'jeux', title: 'Pendu ou Morpion', summary: 'Programmer la logique complète d\'un jeu classique.' },
  { id: 'gestion', title: 'Gestion des employés', summary: 'Classes Employe et Departement, listes, salaires et moyennes.' },
].map((p) => (p.levels ? p : { ...p, levels: [], upcoming: true }));

export const MISSIONS = [m1, m2, m3, m4, m5, m6, m7, m8, m9, m10];

/** Liste à plat de tous les niveaux jouables (missions puis projets), avec leur mission ou projet. */
export const LEVELS = [...MISSIONS, ...PROJECTS].flatMap((m) => m.levels.map((l) => ({ ...l, mission: m })));
