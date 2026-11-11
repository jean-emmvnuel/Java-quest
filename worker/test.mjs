// Simulation locale du Worker : KV en mémoire et faux Telegram.
// Lancer : node worker/test.mjs
import { handleRequest, fingerprint, buildMessage } from './src/index.js';

let failures = 0;
const check = (cond, msg) => { console.log(`${cond ? '  ✓' : '  ✗'} ${msg}`); if (!cond) failures++; };

const store = new Map();
const env = {
  ALLOWED_ORIGINS: 'http://localhost:5173',
  TIMEZONE: 'Africa/Abidjan',
  TELEGRAM_TOKEN: 'TEST',
  TELEGRAM_CHAT_ID: '42',
  SALT: 'sel-de-test',
  VISITORS: { get: async (k) => store.get(k) ?? null, put: async (k, v) => { store.set(k, v); } },
};
const sent = [];
const fakeFetch = async (url, init) => { sent.push({ url, body: JSON.parse(init.body) }); return { ok: true }; };

const visit = (ip, { origin = 'http://localhost:5173', ua = 'Mozilla/5.0 (Linux; Android 14)', page = '1-1 Allumer le terminal' } = {}) => {
  const req = new Request('https://worker.test/visit', { method: 'POST', headers: { Origin: origin, 'User-Agent': ua, 'CF-Connecting-IP': ip, 'Content-Type': 'application/json' }, body: JSON.stringify({ page }) });
  Object.defineProperty(req, 'cf', { value: { city: 'Abidjan', country: 'CI' } });
  return handleRequest(req, env, fakeFetch).then(async (r) => ({ status: r.status, body: await r.json() }));
};

console.log('Worker de visites');
let r = await visit('41.66.1.1');
check(r.body.counted && sent.length === 1, 'nouvelle IP → un message Telegram');
check(sent[0].body.chat_id === '42' && sent[0].body.text.includes('Abidjan') && sent[0].body.text.includes('1 visiteur différent'), 'le message contient le lieu et le total');
check(!sent[0].body.text.includes('41.66.1.1'), "l'adresse IP n'apparaît jamais dans le message");
check(![...store.keys(), ...store.values()].some((x) => x.includes('41.66.1.1')), "l'adresse IP n'est jamais stockée (seulement une empreinte)");
r = await visit('41.66.1.1');
check(!r.body.counted && sent.length === 1, 'même IP → aucun nouveau message');
r = await visit('102.12.9.9');
check(r.body.counted && sent.length === 2 && sent[1].body.text.includes('2 visiteurs différents'), 'autre IP → nouveau message, total à 2');
r = await visit('8.8.8.8', { origin: 'https://site-pirate.example' });
check(r.status === 403 && sent.length === 2, 'site non autorisé → refusé');
r = await visit('9.9.9.9', { ua: 'Googlebot/2.1' });
check(!r.body.counted && sent.length === 2, 'robot d\'indexation → ignoré');
check((await fingerprint('1.2.3.4', 'a')) !== (await fingerprint('1.2.3.4', 'b')), "l'empreinte dépend du sel secret");
check(!buildMessage({ city: '<b>x</b>', total: 1, when: 'maintenant' }).includes('<b>x</b>'), 'le texte venant du visiteur est échappé');

console.log(failures ? `\n${failures} échec(s)` : '\nTout est vert.');
process.exit(failures ? 1 : 0);
