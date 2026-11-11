import m1 from './missions/m1-decouverte.js';
import m2 from './missions/m2-variables.js';
import m3 from './missions/m3-conditions.js';
import m4 from './missions/m4-boucles.js';

// Catalogue des missions. Pour ajouter une mission jouable : créer un fichier dans missions/ et l'ajouter ici.

// Missions à venir : elles demandent d'étendre l'interpréteur (tableaux, méthodes, classes).
const UPCOMING = [
  { id: 'tableaux', num: 5, title: 'Tableaux', place: 'Le magasin', summary: 'Gérer l\'inventaire d\'un magasin : stocker, parcourir et trier des listes de produits.' },
  { id: 'fonctions', num: 6, title: 'Fonctions et procédures', place: 'L\'atelier', summary: 'Créer ses propres méthodes : paramètres, valeur de retour, découpage d\'un programme.' },
  { id: 'objets', num: 7, title: 'Classes et objets', place: 'La banque', summary: 'Modéliser un compte bancaire : attributs, constructeur, méthodes et encapsulation.' },
  { id: 'heritage', num: 8, title: 'Héritage', place: 'Le parc de véhicules', summary: 'Véhicule, camion, drone : partager un comportement commun et le spécialiser.' },
  { id: 'poo', num: 9, title: 'POO approfondie', place: 'Plusieurs missions', summary: 'Polymorphisme, interfaces et classes abstraites, à travers plusieurs missions.' },
  { id: 'combinee', num: 10, title: 'Mission combinée', place: 'La journée de l\'entrepôt', summary: 'Une mission complète qui réunit toutes les notions vues jusqu\'ici.' },
].map((m) => ({ ...m, levels: [], upcoming: true }));

export const PROJECTS = [
  { id: 'banque', title: 'Application bancaire', summary: 'Comptes, dépôts, retraits, virements et historique des opérations.' },
  { id: 'depenses', title: 'Suivi des dépenses', summary: 'Revenus et dépenses par catégorie, totaux et historique sauvegardé.' },
  { id: 'jeux', title: 'Pendu ou Morpion', summary: 'Programmer la logique complète d\'un jeu classique.' },
  { id: 'gestion', title: 'Gestion des employés', summary: 'Classes Employe et Departement, listes, salaires et moyennes.' },
];

export const MISSIONS = [m1, m2, m3, m4, ...UPCOMING];

/** Liste à plat de tous les niveaux jouables, avec leur mission. */
export const LEVELS = MISSIONS.flatMap((m) => m.levels.map((l) => ({ ...l, mission: m })));
