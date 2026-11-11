// Java Quest — compteur de visiteurs (Cloudflare Worker)
//
// Le jeu (sans backend) envoie un simple signal POST /visit, au plus une fois par jour et par appareil.
// Ce Worker :
//   1. lit l'adresse IP du visiteur (fournie par Cloudflare) ;
//   2. la transforme en empreinte irréversible (SHA-256 + sel secret) : l'IP n'est jamais stockée ni envoyée ;
//   3. si cette empreinte est nouvelle, l'enregistre dans KV et t'envoie un message Telegram
//      avec la ville, le pays, l'heure et le nombre total de visiteurs différents.
//
// Secrets (wrangler secret put …) : TELEGRAM_TOKEN, TELEGRAM_CHAT_ID, SALT
// Variables (wrangler.toml) : ALLOWED_ORIGINS, TIMEZONE
// Stockage : KV « VISITORS »

const ONE_YEAR = 60 * 60 * 24 * 365;
const BOT_UA = /bot|crawl|spider|slurp|preview|headless|lighthouse|monitor/i;

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const ok = allowed.includes(origin);
  return {
    ok,
    headers: {
      'Access-Control-Allow-Origin': ok ? origin : 'null',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    },
  };
}

const json = (body, status, headers) => new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });

export async function fingerprint(ip, salt) {
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

export function buildMessage({ city, region, country, total, when, page, device }) {
  const place = [city, region, country].filter(Boolean).join(', ') || 'lieu inconnu';
  return [
    '👋 <b>Nouveau visiteur sur Java Quest</b>',
    `📍 ${escapeHtml(place)}`,
    `🕒 ${escapeHtml(when)}`,
    device ? `💻 ${escapeHtml(device)}` : null,
    page ? `📄 ${escapeHtml(page)}` : null,
    `👥 ${total} visiteur${total > 1 ? 's' : ''} différent${total > 1 ? 's' : ''} au total`,
  ].filter(Boolean).join('\n');
}

function deviceOf(ua) {
  if (/iPhone|iPad/i.test(ua)) return 'iPhone / iPad';
  if (/Android/i.test(ua)) return 'Android';
  if (/Windows/i.test(ua)) return 'Ordinateur Windows';
  if (/Macintosh/i.test(ua)) return 'Mac';
  if (/Linux/i.test(ua)) return 'Ordinateur Linux';
  return null;
}

async function sendTelegram(env, text, fetchImpl = fetch) {
  const res = await fetchImpl(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  });
  return res.ok;
}

export async function handleRequest(request, env, fetchImpl = fetch) {
  const { ok: originOk, headers } = corsHeaders(request, env);
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (url.pathname !== '/visit' || request.method !== 'POST') return json({ error: 'not found' }, 404, headers);
  if (!originOk) return json({ error: 'origin not allowed' }, 403, headers);

  const ua = request.headers.get('User-Agent') || '';
  if (BOT_UA.test(ua)) return json({ counted: false, reason: 'bot' }, 200, headers);

  const ip = request.headers.get('CF-Connecting-IP');
  if (!ip) return json({ counted: false, reason: 'no ip' }, 200, headers);

  let page = null;
  try {
    const body = await request.json();
    if (typeof body?.page === 'string') page = body.page.slice(0, 80);
  } catch { /* corps vide ou invalide : ce n'est pas grave */ }

  const key = `v:${await fingerprint(ip, env.SALT || '')}`;
  if (await env.VISITORS.get(key)) return json({ counted: false, reason: 'known' }, 200, headers);

  const total = Number((await env.VISITORS.get('total')) || 0) + 1;
  const cf = request.cf || {};
  const when = new Date().toLocaleString('fr-FR', { timeZone: env.TIMEZONE || 'Europe/Paris', dateStyle: 'medium', timeStyle: 'short' });

  await env.VISITORS.put(key, '1', { expirationTtl: ONE_YEAR });
  await env.VISITORS.put('total', String(total));

  const text = buildMessage({ city: cf.city, region: cf.region, country: cf.country, total, when, page, device: deviceOf(ua) });
  const sent = await sendTelegram(env, text, fetchImpl);
  return json({ counted: true, notified: sent }, 200, headers);
}

export default {
  fetch: (request, env) => handleRequest(request, env),
};
