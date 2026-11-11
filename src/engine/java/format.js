// Conversion des valeurs en texte, exactement comme Java les affiche.

export function formatDouble(v) {
  if (Number.isNaN(v)) return 'NaN';
  if (v === Infinity) return 'Infinity';
  if (v === -Infinity) return '-Infinity';
  if (Object.is(v, -0)) return '-0.0';
  const abs = Math.abs(v);
  if (abs !== 0 && (abs >= 1e7 || abs < 1e-3)) {
    const [m, exp] = v.toExponential().split('e');
    return `${m.includes('.') ? m : `${m}.0`}E${Number(exp)}`;
  }
  const s = String(v);
  return s.includes('.') ? s : `${s}.0`;
}

/** Texte produit par println / la concaténation. */
export function toJavaString(type, v) {
  if (v === null || v === undefined) return 'null';
  switch (type) {
    case 'double': return formatDouble(v);
    case 'char': return String.fromCharCode(v);
    case 'boolean': return v ? 'true' : 'false';
    default: return String(v);
  }
}

/** Valeur telle qu'on l'écrirait dans du code (pour les explications). */
export function literal(type, v) {
  if (v === undefined) return '?';
  if (type === 'String') return v === null ? 'null' : `"${String(v).replace(/\n/g, '\\n')}"`;
  if (type === 'char') return `'${String.fromCharCode(v)}'`;
  return toJavaString(type, v);
}
