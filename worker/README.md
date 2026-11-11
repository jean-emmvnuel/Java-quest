# Compteur de visiteurs + notifications Telegram

Java Quest n'a pas de serveur. Pour savoir qui visite le site, un tout petit programme en ligne
(un **Cloudflare Worker**, gratuit) reçoit un signal du jeu et t'envoie un message Telegram
quand un **nouveau** visiteur arrive (une adresse IP jamais vue).

```
Jeu (navigateur) ──POST /visit──▶ Worker Cloudflare ──▶ Bot Telegram ──▶ ton téléphone
```

Exemple de message :

> 👋 **Nouveau visiteur sur Java Quest**
> 📍 Abidjan, CI
> 🕒 11 nov. 2026, 12:32
> 💻 Android
> 📄 1-1 Allumer le terminal
> 👥 27 visiteurs différents au total

## Respect de la vie privée (le public est jeune)

- L'adresse IP est transformée en **empreinte irréversible** (SHA-256 + sel secret) : elle n'est
  **jamais stockée ni envoyée** sur Telegram. Seuls la ville et le pays (fournis par Cloudflare) le sont.
- Une empreinte est oubliée au bout d'un an.
- Le jeu n'envoie que le nom du niveau ouvert, au plus **une fois par jour et par appareil**,
  et rien du tout si le navigateur demande à ne pas être suivi (Do Not Track) ou s'il est hors connexion.
- Une mention est affichée en bas de la carte des missions.

## Mise en place (une seule fois, ~15 minutes)

### 1. Créer le bot Telegram

1. Dans Telegram, ouvre une conversation avec **@BotFather** et envoie `/newbot`.
2. Choisis un nom (ex. « Java Quest Visites ») puis un identifiant finissant par `bot`.
3. BotFather te donne une **clé** (token) du type `123456789:AA…`. **Garde-la secrète** : ne la mets
   jamais dans le code du jeu, ni sur GitHub.
4. Ouvre la conversation avec ton nouveau bot et envoie-lui un message (par exemple « bonjour »).
5. Dans ton navigateur, ouvre `https://api.telegram.org/bot<TA_CLÉ>/getUpdates` : repère
   `"chat":{"id": 123456789` — ce nombre est ton **identifiant de conversation** (chat id).

### 2. Préparer Cloudflare

1. Crée un compte gratuit sur <https://dash.cloudflare.com>.
2. Dans le dossier du projet :

```bash
cd worker
```

```bash
npx wrangler login
```

```bash
npx wrangler kv namespace create VISITORS
```

3. Copie l'`id` affiché dans `worker/wrangler.toml` (à la place de `REMPLACE_PAR_TON_ID_KV`).
4. Dans `wrangler.toml`, ajoute l'adresse de ton site à `ALLOWED_ORIGINS` quand il sera en ligne
   (ex. `https://java-quest.pages.dev`). Ajuste `TIMEZONE` si besoin.

### 3. Enregistrer les secrets

Chaque commande te demande la valeur (elle n'apparaît nulle part dans le code) :

```bash
npx wrangler secret put TELEGRAM_TOKEN
```

```bash
npx wrangler secret put TELEGRAM_CHAT_ID
```

```bash
npx wrangler secret put SALT
```

Pour `SALT`, tape une longue phrase au hasard (elle sert à brouiller les adresses IP).

### 4. Mettre en ligne le Worker

```bash
npx wrangler deploy
```

La commande affiche l'adresse du Worker, du type `https://java-quest-visites.TON-COMPTE.workers.dev`.

### 5. Brancher le jeu

À la racine du projet, crée le fichier `.env.local` (il n'est pas envoyé sur GitHub) :

```
VITE_VISIT_URL=https://java-quest-visites.TON-COMPTE.workers.dev
```

Puis reconstruis le site (`npm run build`) et publie-le. Sans `VITE_VISIT_URL`, le jeu n'envoie rien.

## Tester

- Simulation locale, sans compte ni réseau : `node worker/test.mjs`
- En vrai : ouvre ton site depuis un téléphone en 4G (autre adresse IP) → tu reçois un message.
  Depuis le même appareil, il n'y a plus de message (visiteur déjà connu).

## Coût

Le plan gratuit de Cloudflare suffit largement (100 000 requêtes par jour, KV inclus).
