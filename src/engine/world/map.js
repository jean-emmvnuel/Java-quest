// Le monde dans lequel le code de l'élève agit : une grille vue de dessus
// avec un robot, un coffre-fort, une porte, un thermostat, un terminal…
//
// Légende des cartes :
//   #  mur          .  sol           R  robot        G  sortie (zone d'arrivée)
//   C  coffre-fort  D  porte         T  terminal     S  thermostat     L  panneau de leviers

export const DIRS = [
  { dx: 1, dy: 0, name: 'l\'est', arrow: '→' },
  { dx: 0, dy: 1, name: 'le sud', arrow: '↓' },
  { dx: -1, dy: 0, name: 'l\'ouest', arrow: '←' },
  { dx: 0, dy: -1, name: 'le nord', arrow: '↑' },
];

export function createWorld(def) {
  const rows = def.map.length;
  const cols = Math.max(...def.map.map((r) => r.length));
  const w = {
    cols, rows, walls: [], robot: null, goal: null, chest: null, door: null, terminal: null, sensor: null, lever: null,
    badge: def.badge ?? false, energy: def.energy ?? 100, bumped: null, alarm: false, visited: [],
    notes: def.notes ?? [], prix: def.prix ?? [], poids: def.poids ?? [],
  };
  def.map.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      switch (ch) {
        case '#': w.walls.push(`${x},${y}`); break;
        case 'R': w.robot = { x, y, dir: def.dir ?? 0 }; break;
        case 'G': w.goal = { x, y }; break;
        case 'C': w.chest = { x, y, code: def.chestCode ?? 0, open: false, wrong: null }; break;
        case 'D': w.door = { x, y, open: def.doorOpen ?? false }; break;
        case 'T': w.terminal = { x, y }; break;
        case 'S': w.sensor = { x, y, temp: def.temp ?? 20 }; break;
        case 'L': w.lever = { x, y, value: 0 }; break;
        default: break;
      }
    });
  });
  if (w.robot) w.visited.push(`${w.robot.x},${w.robot.y}`);
  return w;
}

export const isBlocked = (w, x, y) => {
  if (x < 0 || y < 0 || x >= w.cols || y >= w.rows) return 'le bord de la zone';
  if (w.walls.includes(`${x},${y}`)) return 'un mur';
  if (w.door && w.door.x === x && w.door.y === y && !w.door.open) return 'la porte fermée';
  if (w.chest && w.chest.x === x && w.chest.y === y) return 'le coffre-fort';
  if (w.terminal && w.terminal.x === x && w.terminal.y === y) return 'le terminal';
  if (w.sensor && w.sensor.x === x && w.sensor.y === y) return 'le thermostat';
  if (w.lever && w.lever.x === x && w.lever.y === y) return 'le panneau de leviers';
  return null;
};

export const atGoal = (w) => !!w.robot && !!w.goal && w.robot.x === w.goal.x && w.robot.y === w.goal.y;
