import { useRef } from 'react';

// Dessin du monde (vue de dessus) à partir de l'état enregistré dans la trace.
const CELL = 64;
const PAD = 8;

function Robot({ robot, bumped, energy }) {
  // On cumule l'angle pour que le robot pivote toujours par le chemin le plus court
  const angle = useRef({ dir: robot.dir, deg: robot.dir * 90 });
  if (angle.current.dir !== robot.dir) {
    let delta = (robot.dir - angle.current.dir + 4) % 4;
    if (delta === 3) delta = -1;
    angle.current = { dir: robot.dir, deg: angle.current.deg + delta * 90 };
  }
  const cx = PAD + robot.x * CELL + CELL / 2;
  const cy = PAD + robot.y * CELL + CELL / 2;
  return (
    <g className="robot-pos" style={{ transform: `translate(${cx}px, ${cy}px)` }}>
      <g className={bumped ? 'robot robot-bump' : 'robot'}>
        <ellipse cx="0" cy="22" rx="18" ry="5" className="robot-shadow" />
        <g className="robot-rot" style={{ transform: `rotate(${angle.current.deg}deg)` }}>
          <rect x="-21" y="-21" width="42" height="42" rx="14" className="robot-body" />
          <rect x="-21" y="-21" width="42" height="18" rx="14" className="robot-shine" />
          <rect x="-13" y="-14" width="26" height="28" rx="9" className="robot-face" />
          <circle cx="5" cy="-6" r="3.6" className="robot-eye" />
          <circle cx="5" cy="6" r="3.6" className="robot-eye" />
          <path d="M 23 -6 L 30 0 L 23 6 Z" className="robot-nose" />
        </g>
        {energy !== undefined && (
          <g transform="translate(-16, -34)">
            <rect width="32" height="7" rx="3.5" className="battery-bg" />
            <rect width={Math.max(3, (32 * energy) / 100)} height="7" rx="3.5" className={energy < 20 ? 'battery-low' : 'battery'} />
          </g>
        )}
      </g>
    </g>
  );
}

const At = ({ x, y, className, children }) => (
  <g transform={`translate(${PAD + x * CELL}, ${PAD + y * CELL})`} className={className}>{children}</g>
);

export default function Scene({ world }) {
  const W = world.cols * CELL + PAD * 2;
  const H = world.rows * CELL + PAD * 2;
  const walls = new Set(world.walls);
  const visited = new Set(world.visited);
  const lastOut = (world.screen ?? '').trim().split('\n').pop();
  const { goal, chest, door, terminal, sensor, lever, robot } = world;
  const reached = goal && robot && robot.x === goal.x && robot.y === goal.y;

  const tiles = [];
  for (let y = 0; y < world.rows; y++) {
    for (let x = 0; x < world.cols; x++) {
      const k = `${x},${y}`;
      tiles.push(walls.has(k) ? (
        <At key={k} x={x} y={y} className="crate">
          <rect x="3" y="5" width={CELL - 6} height={CELL - 6} rx="9" className="crate-side" />
          <rect x="3" y="2" width={CELL - 6} height={CELL - 8} rx="9" className="crate-top" />
          <path d={`M 14 12 L ${CELL - 14} ${CELL - 18} M ${CELL - 14} 12 L 14 ${CELL - 18}`} className="crate-plank" />
        </At>
      ) : (
        <At key={k} x={x} y={y}>
          <rect x="2" y="2" width={CELL - 4} height={CELL - 4} rx="10" className={(x + y) % 2 ? 'tile tile-b' : 'tile'} />
          {visited.has(k) && <circle cx={CELL / 2} cy={CELL / 2} r="4" className="trail" />}
        </At>
      ));
    }
  }

  return (
    <svg className="scene" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Le monde du niveau">
      {tiles}

      {goal && (
        <At x={goal.x} y={goal.y} className={reached ? 'goal reached' : 'goal'}>
          <rect x="6" y="6" width={CELL - 12} height={CELL - 12} rx="12" className="goal-pad" />
          <line x1="27" y1="18" x2="27" y2="46" className="goal-pole" />
          <path d="M 27 18 L 44 24 L 27 31 Z" className="goal-flag" />
        </At>
      )}

      {chest && (
        <At x={chest.x} y={chest.y} className={`chest ${chest.open ? 'is-open' : ''} ${chest.wrong ? 'is-wrong' : ''}`}>
          <rect x="7" y="9" width={CELL - 14} height={CELL - 14} rx="10" className="chest-body" />
          <g className="chest-door">
            <rect x="12" y="14" width={CELL - 24} height={CELL - 24} rx="7" className="chest-front" />
            <circle cx={CELL / 2} cy={CELL / 2 + 1} r="8" className="chest-dial" />
            <line x1={CELL / 2} y1={CELL / 2 + 1} x2={CELL / 2 + 4} y2={CELL / 2 - 4} className="chest-needle" />
          </g>
          <circle cx={CELL - 14} cy="15" r="3" className="chest-led" />
          {chest.open && <text x={CELL / 2} y={CELL / 2 + 6} className="chest-coins">$</text>}
        </At>
      )}

      {door && (
        <At x={door.x} y={door.y} className={door.open ? 'door is-open' : 'door'}>
          <rect x="6" y="3" width={CELL - 12} height={CELL - 6} rx="8" className="door-frame" />
          <g className="door-panel">
            <rect x="10" y="7" width={CELL - 20} height={CELL - 14} rx="5" className="door-fill" />
            {[0, 1, 2].map((i) => <line key={i} x1={21 + i * 11} y1="13" x2={21 + i * 11} y2={CELL - 13} className="door-bar" />)}
          </g>
        </At>
      )}

      {terminal && (
        <At x={terminal.x} y={terminal.y} className={lastOut ? 'terminal is-on' : 'terminal'}>
          <rect x="5" y="7" width={CELL - 10} height={CELL - 22} rx="8" className="terminal-body" />
          <rect x="10" y="12" width={CELL - 20} height={CELL - 32} rx="4" className="terminal-screen" />
          <rect x={CELL / 2 - 9} y={CELL - 15} width="18" height="7" rx="3" className="terminal-foot" />
          <text x={CELL / 2} y="29" className="terminal-text">{lastOut ? (lastOut.length > 6 ? `${lastOut.slice(0, 5)}…` : lastOut) : '…'}</text>
        </At>
      )}

      {sensor && (
        <At x={sensor.x} y={sensor.y} className="sensor">
          <circle cx={CELL / 2} cy={CELL / 2} r="25" className="sensor-ring" />
          <circle cx={CELL / 2} cy={CELL / 2} r="19" className={`sensor-face ${sensor.temp < 18 ? 'cold' : sensor.temp > 25 ? 'hot' : 'mild'}`} />
          <text x={CELL / 2} y={CELL / 2 + 6} className="sensor-text">{sensor.temp}°</text>
        </At>
      )}

      {lever && (
        <At x={lever.x} y={lever.y} className="levers">
          <rect x="3" y="8" width={CELL - 6} height={CELL - 14} rx="10" className="levers-panel" />
          {[1, 2, 3].map((n) => (
            <g key={n} transform={`translate(${8 + (n - 1) * 17}, 14)`}>
              <rect width="14" height="26" rx="7" className={lever.value === n ? `lever on-${n}` : 'lever'} />
              <circle cx="7" cy={lever.value === n ? 7 : 19} r="5.5" className="lever-knob" />
              <text x="7" y="38" className="lever-label">{n}</text>
            </g>
          ))}
        </At>
      )}

      {robot && <Robot robot={robot} bumped={world.bumped} energy={world.energyShown ? world.energy : undefined} />}
    </svg>
  );
}
