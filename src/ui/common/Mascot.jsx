// Bit, le guide de Java Quest : le point-virgule du logo, devenu personnage.
// Même silhouette que le symbole (tête ronde + corps en virgule), avec des yeux et une bouche
// qui changent selon l'humeur : happy (accueil), think (réflexion), oops (souci), party (réussite).

const BLUE = '#4F8CFF';
const INK = '#1F2A44';

function Eyes({ mood }) {
  if (mood === 'party') {
    // yeux fermés de joie : ^ ^
    return (
      <g stroke={INK} strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22.5 20.5 l3.5 -3.5 l3.5 3.5" />
        <path d="M34.5 20.5 l3.5 -3.5 l3.5 3.5" />
      </g>
    );
  }
  // les pupilles regardent vers l'avant (comme dans le logo), ou en l'air quand Bit réfléchit
  const look = { happy: [1.4, 0.4], think: [1.2, -1.8], oops: [0, 0.6] }[mood] ?? [1, 0];
  const r = mood === 'oops' ? 5.4 : 4.8;
  return (
    <g>
      <circle cx="26" cy="19" r={r} fill="#fff" />
      <circle cx="38" cy="19" r={r} fill="#fff" />
      <circle cx={26 + look[0]} cy={19 + look[1]} r="2.4" fill={INK} />
      <circle cx={38 + look[0]} cy={19 + look[1]} r="2.4" fill={INK} />
      <circle cx={26.8 + look[0]} cy={18 + look[1]} r="0.8" fill="#fff" />
      <circle cx={38.8 + look[0]} cy={18 + look[1]} r="0.8" fill="#fff" />
    </g>
  );
}

function Mouth({ mood }) {
  switch (mood) {
    case 'party':
      return <path d="M26 26 Q32 34 38 26 Z" fill="#fff" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />;
    case 'think':
      return <path d="M29 28.5 L35 27.5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />;
    case 'oops':
      return <ellipse cx="32" cy="28.5" rx="2.4" ry="2.8" fill="#fff" />;
    default:
      return <path d="M27.5 26.5 Q32 31 36.5 26.5" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" />;
  }
}

export default function Mascot({ mood = 'happy', size = 64 }) {
  return (
    <svg className={`mascot mascot-${mood}`} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <g className="mascot-body">
        {/* corps : la virgule */}
        <circle cx="32" cy="46" r="9.5" fill={BLUE} />
        <path d="M41.5 46c0 9.3-5.9 14.7-15.2 17.1l-1.9-4.5c5.9-2.1 9-5.7 9.5-11.2z" fill={BLUE} />
      </g>
      <g className="mascot-head">
        {/* tête : le point */}
        <circle cx="32" cy="20" r="15" fill={BLUE} />
        <circle cx="21.5" cy="25.5" r="2.4" fill="#ff9db0" opacity="0.75" />
        <circle cx="42.5" cy="25.5" r="2.4" fill="#ff9db0" opacity="0.75" />
        <Eyes mood={mood} />
        <Mouth mood={mood} />
      </g>
      {mood === 'party' && (
        <g fill="#FFC233" className="mascot-sparkles">
          <path d="M8 10l1.5 3.5 3.5 1.5-3.5 1.5L8 20l-1.5-3.5L3 15l3.5-1.5z" />
          <path d="M55 6l1.2 2.8 2.8 1.2-2.8 1.2L55 14l-1.2-2.8L51 10l2.8-1.2z" />
          <circle cx="56" cy="30" r="2" />
        </g>
      )}
      {mood === 'think' && (
        <g fill="#c6d0e2">
          <circle cx="51" cy="10" r="2.2" />
          <circle cx="56" cy="5" r="1.5" />
        </g>
      )}
    </svg>
  );
}
