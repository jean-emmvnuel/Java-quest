import { toJavaString } from '../java/format.js';
import { DIRS, isBlocked } from './map.js';

// Objets que le code Java de l'élève peut utiliser (robot, coffre…).
// OBJECT_TYPES décrit leurs méthodes pour le compilateur, API les implémente.

// Signatures vues par le compilateur (types des paramètres et du retour)
export const OBJECT_TYPES = {
  robot: {
    type: 'Robot',
    methods: {
      avancer: { params: [], ret: 'void', doc: 'avance d\'une case dans la direction où il regarde' },
      tournerGauche: { params: [], ret: 'void', doc: 'pivote d\'un quart de tour à gauche' },
      tournerDroite: { params: [], ret: 'void', doc: 'pivote d\'un quart de tour à droite' },
      devantMur: { params: [], ret: 'boolean', doc: 'true si un obstacle bloque la case devant lui' },
      surSortie: { params: [], ret: 'boolean', doc: 'true s\'il est sur la zone d\'arrivée' },
      aBadge: { params: [], ret: 'boolean', doc: 'true s\'il possède un badge d\'accès' },
      energie: { params: [], ret: 'int', doc: 'niveau de batterie, de 0 à 100' },
    },
  },
  coffre: {
    type: 'Coffre',
    methods: {
      ouvrir: { params: ['double'], ret: 'void', doc: 'tente d\'ouvrir le coffre avec un code' },
    },
  },
  porte: {
    type: 'Porte',
    methods: {
      estOuverte: { params: [], ret: 'boolean', doc: 'true si la porte est ouverte' },
      ouvrir: { params: [], ret: 'void', doc: 'déverrouille la porte' },
    },
  },
  thermostat: {
    type: 'Thermostat',
    methods: {
      temperature: { params: [], ret: 'int', doc: 'température de la pièce en °C' },
    },
  },
  ecole: {
    type: 'Ecole',
    methods: {
      notes: { params: [], ret: 'int[]', doc: 'renvoie le tableau des notes de la classe' },
    },
  },
  entrepot: {
    type: 'Entrepot',
    methods: {
      poids: { params: [], ret: 'int[]', doc: 'renvoie le poids (en kg) de chaque colis arrivé ce matin' },
    },
  },
  caisse: {
    type: 'Caisse',
    methods: {
      prix: { params: [], ret: 'double[]', doc: 'renvoie le tableau des prix des articles scannés' },
    },
  },
  fichier: {
    type: 'Fichier',
    methods: {
      ecrireLigne: { params: ['String'], ret: 'void', doc: 'ajoute une ligne à la fin du fichier depenses.txt' },
      lignes: { params: [], ret: 'String[]', doc: 'renvoie toutes les lignes du fichier' },
      vider: { params: [], ret: 'void', doc: 'efface tout le contenu du fichier' },
    },
  },
  partie: {
    type: 'Partie',
    methods: {
      mot: { params: [], ret: 'String', doc: 'le mot secret de la partie de pendu' },
      lettres: { params: [], ret: 'char[]', doc: 'les lettres proposées par le joueur, dans l\'ordre' },
      coups: { params: [], ret: 'int[]', doc: 'les coups joués au morpion : ligne, colonne, ligne, colonne…' },
    },
  },
  leviers: {
    type: 'Leviers',
    methods: {
      activer: { params: ['int'], ret: 'void', doc: 'active le levier n°1, 2 ou 3' },
    },
  },
};

export function objectsFor(names) {
  return Object.fromEntries(names.map((n) => [n, OBJECT_TYPES[n]]));
}

// Implémentations : (monde, arguments, types des arguments) → { value, desc, crash, event }
export const API = {
  robot: {
    avancer(w) {
      const d = DIRS[w.robot.dir];
      const nx = w.robot.x + d.dx;
      const ny = w.robot.y + d.dy;
      const obstacle = isBlocked(w, nx, ny);
      if (obstacle) {
        w.bumped = { x: nx, y: ny };
        return {
          crash: `Boum ! Le robot a foncé dans ${obstacle}.`,
          hint: 'Avant d\'avancer, vérifie la direction du robot et le nombre de cases à parcourir.',
          event: 'bump',
        };
      }
      w.robot.x = nx;
      w.robot.y = ny;
      w.visited.push(`${nx},${ny}`);
      return { desc: `Le robot avance d'une case vers ${d.name}.`, event: 'move' };
    },
    tournerGauche(w) {
      w.robot.dir = (w.robot.dir + 3) % 4;
      return { desc: `Le robot pivote à gauche : il regarde maintenant vers ${DIRS[w.robot.dir].name}.`, event: 'turn' };
    },
    tournerDroite(w) {
      w.robot.dir = (w.robot.dir + 1) % 4;
      return { desc: `Le robot pivote à droite : il regarde maintenant vers ${DIRS[w.robot.dir].name}.`, event: 'turn' };
    },
    devantMur(w) {
      const d = DIRS[w.robot.dir];
      const value = !!isBlocked(w, w.robot.x + d.dx, w.robot.y + d.dy);
      return { value, desc: `Le robot regarde devant lui : ${value ? 'obstacle' : 'la voie est libre'}.` };
    },
    surSortie(w) {
      const value = !!w.goal && w.robot.x === w.goal.x && w.robot.y === w.goal.y;
      return { value };
    },
    aBadge(w) { return { value: w.badge }; },
    energie(w) { return { value: w.energy }; },
  },
  coffre: {
    ouvrir(w, [code], [type]) {
      const shown = toJavaString(type, code);
      if (w.chest.open) return { desc: 'Le coffre est déjà ouvert.' };
      if (code === w.chest.code) {
        w.chest.open = true;
        w.chest.wrong = null;
        return { desc: `Le coffre-fort reconnaît le code ${shown} et s'ouvre !`, event: 'open' };
      }
      w.chest.wrong = shown;
      return { desc: `Code ${shown} refusé : le coffre-fort reste fermé.`, event: 'deny' };
    },
  },
  porte: {
    estOuverte(w) { return { value: w.door.open }; },
    ouvrir(w) {
      w.door.open = true;
      return { desc: 'La porte se déverrouille et s\'ouvre.', event: 'open' };
    },
  },
  thermostat: {
    temperature(w) { return { value: w.sensor.temp }; },
  },
  ecole: {
    notes(w) { return { value: [...w.notes], desc: `L'école transmet ${w.notes.length} notes.` }; },
  },
  entrepot: {
    poids(w) { return { value: [...w.poids], desc: `L'entrepôt transmet le poids de ${w.poids.length} colis.` }; },
  },
  caisse: {
    prix(w) { return { value: [...w.prix], desc: `La caisse transmet ${w.prix.length} prix.` }; },
  },
  fichier: {
    ecrireLigne(w, [ligne]) {
      w.fichier.push(ligne ?? 'null');
      return { desc: `Le fichier depenses.txt reçoit une nouvelle ligne (${w.fichier.length} au total).`, event: 'save' };
    },
    lignes(w) { return { value: [...w.fichier], desc: `Lecture du fichier depenses.txt : ${w.fichier.length} ligne${w.fichier.length > 1 ? 's' : ''}.` }; },
    vider(w) { w.fichier = []; return { desc: 'Le fichier depenses.txt est vidé.' }; },
  },
  partie: {
    mot(w) { return { value: w.mot, desc: 'La partie choisit un mot secret.' }; },
    lettres(w) { return { value: [...w.lettres], desc: `Le joueur propose ${w.lettres.length} lettres.` }; },
    coups(w) { return { value: [...w.coups], desc: `${w.coups.length / 2} coups sont joués.` }; },
  },
  leviers: {
    activer(w, [n]) {
      if (n < 1 || n > 3) {
        return { crash: `Le levier n°${n} n'existe pas : il y a seulement les leviers 1, 2 et 3.` };
      }
      w.lever.value = n;
      return { desc: `Le levier n°${n} est activé.`, event: 'lever' };
    },
  },
};
