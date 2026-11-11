// Signal de visite anonyme, envoyé au Worker « compteur de visiteurs » (voir worker/README.md).
// - Rien n'est envoyé si VITE_VISIT_URL n'est pas configurée, hors connexion,
//   ou si le navigateur demande à ne pas être suivi (Do Not Track).
// - Au plus un signal par jour et par appareil.
// - Le jeu n'envoie que le nom du niveau ouvert : l'adresse IP est lue et aussitôt
//   transformée en empreinte par le Worker, qui ne la stocke ni ne la transmet.

const ENDPOINT = import.meta.env.VITE_VISIT_URL;
const KEY = 'javaquest.visit';

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

export function reportVisit(page) {
  if (!ENDPOINT || typeof navigator === 'undefined') return;
  if (!navigator.onLine) return;
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return;
  try {
    if (localStorage.getItem(KEY) === today()) return;
    localStorage.setItem(KEY, today());
  } catch { /* stockage indisponible : on envoie quand même une fois */ }
  fetch(`${ENDPOINT.replace(/\/$/, '')}/visit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page }),
    keepalive: true,
  }).catch(() => { /* le jeu ne dépend jamais de ce signal */ });
}
