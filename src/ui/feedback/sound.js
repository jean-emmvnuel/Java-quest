// Petits sons de jeu, synthétisés avec la Web Audio API (aucun fichier à télécharger,
// donc disponibles hors connexion). Ils ne jouent qu'après une action de l'utilisateur.

let ctx = null;
let enabled = true;
try { enabled = localStorage.getItem('javaquest.sound') !== 'off'; } catch { /* ignoré */ }

export const isSoundOn = () => enabled;
export function setSound(on) {
  enabled = on;
  try { localStorage.setItem('javaquest.sound', on ? 'on' : 'off'); } catch { /* ignoré */ }
}

function audio() {
  if (!enabled) return null;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq, start, dur, { type = 'sine', gain = 0.12 } = {}) {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + start;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** Réussite : petit arpège joyeux. */
export function playSuccess() {
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.09, 0.35, { type: 'triangle', gain: 0.14 }));
}

/** Une étoile qui apparaît. */
export function playStar(i = 0) {
  tone(880 * 2 ** (i / 6), 0, 0.18, { type: 'sine', gain: 0.1 });
}

/** Appui sur un bouton important. */
export function playTap() {
  tone(420, 0, 0.06, { type: 'triangle', gain: 0.06 });
}
