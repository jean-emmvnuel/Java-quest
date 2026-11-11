import { useEffect, useState } from 'react';

const KEYS = ['⇥', '{', '}', '(', ')', ';', '"', '=', '.', '+', '-', '<', '>', '[', ']', "'", '!', '&', '|', ',', '*', '/', '%'];

/**
 * Barre de symboles collée au-dessus du clavier du téléphone : les caractères de Java
 * (accolades, parenthèses, point-virgule…) sont difficiles à trouver sur un clavier tactile.
 */
export default function SymbolBar({ visible, onKey }) {
  const [bottom, setBottom] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv || !visible) return undefined;
    const place = () => setBottom(Math.max(0, window.innerHeight - (vv.height + vv.offsetTop)));
    place();
    vv.addEventListener('resize', place);
    vv.addEventListener('scroll', place);
    return () => { vv.removeEventListener('resize', place); vv.removeEventListener('scroll', place); };
  }, [visible]);

  if (!visible) return null;
  return (
    <div className="symbar" style={{ bottom }} role="toolbar" aria-label="Symboles Java">
      {KEYS.map((k) => (
        <button
          key={k}
          type="button"
          className="symkey"
          // pointerdown + preventDefault : le champ de code garde le focus (le clavier reste ouvert)
          onPointerDown={(e) => { e.preventDefault(); onKey(k === '⇥' ? '    ' : k); }}
          aria-label={k === '⇥' ? 'Tabulation' : `Insérer ${k}`}
        >
          {k}
        </button>
      ))}
    </div>
  );
}
