# Nel — Backend chat API

Serveur **Node.js + TypeScript** : **Fastify** (HTTP) + **Socket.IO** (temps réel).  
Auth JWT, messages en mémoire, notifications **Web Push**.

Le frontend React est à la racine du repo : [`../README.md`](../README.md).

---

## Stack

| Package | Rôle |
|---------|------|
| **Fastify 5** | Routes REST |
| **@fastify/cors** | CORS pour le frontend (gh-pages, localhost) |
| **Socket.IO 4** | Chat live |
| **jose** | JWT (login / socket) |
| **web-push** | Notifications hors ligne |

Stockage : **mémoire uniquement** (pas de Redis). Les messages sont perdus au redémarrage du process.

---

## Prérequis

- Node.js 18+

---

## Démarrage

```bash
cd backend
npm install
npm run dev
```

API par défaut : **http://localhost:3000**

Production :

```bash
npm run build
npm start
```

Vérification :

```bash
curl http://localhost:3000/api/health
```

Réponse attendue :

```json
{
  "ok": true,
  "service": "nel-chat-api",
  "storage": "memory",
  "realtime": "socket.io",
  "push": false,
  "timestamp": 1710000000000
}
```

---

## Structure

```
backend/
├── src/
│   ├── server.ts           # Point d’entrée Fastify + Socket.IO
│   ├── routes/
│   │   ├── auth.ts         # login, signup, me
│   │   ├── chat.ts         # REST messages
│   │   └── push.ts         # abonnements Web Push
│   ├── socket/
│   │   └── chatSocket.ts   # Événements temps réel
│   └── lib/
│       ├── authStore.ts    # Utilisateurs + JWT
│       ├── chatStore.ts    # Messages en RAM
│       ├── memberStore.ts  # Membres par conversation (push/sync)
│       ├── pushStore.ts    # Subscriptions push
│       ├── pushService.ts  # Envoi web-push
│       ├── config.ts       # Port, CORS
│       └── types.ts
├── scripts/
│   └── generate-vapid.ts   # Génère les clés VAPID
└── package.json
```

---

## Variables d’environnement

Créer un fichier `.env` à la racine de `backend/` (non versionné) ou les définir sur l’hébergeur.

| Variable | Défaut | Description |
|----------|--------|-------------|
| `PORT` | `3000` | Port d’écoute |
| `JWT_SECRET` | `nel-dev-secret-…` | **À changer en production** |
| `ALLOWED_ORIGINS` | — | Origines CORS supplémentaires, séparées par des virgules |
| `VAPID_PUBLIC_KEY` | — | Web Push (public) |
| `VAPID_PRIVATE_KEY` | — | Web Push (privé) |
| `VAPID_SUBJECT` | `mailto:hello@nel.app` | Contact VAPID |

Origines CORS autorisées par défaut :

- `http://localhost:5173`
- `http://localhost:3000`
- `https://itsrim.github.io`

Générer les clés VAPID :

```bash
npm run vapid
```

Recopier `VITE_VAPID_PUBLIC_KEY` côté frontend (fichier `.env` à la racine du repo).

---

## Authentification

### Comptes démo (pré-créés)

| Email | Mot de passe | ID |
|-------|--------------|-----|
| `demo@nel.com` | `password` | `user_demo_001` |
| `admin@yo.com` | `1234` | `user_admin_001` |

### REST

#### `POST /api/auth/login`

```json
{ "email": "demo@nel.com", "password": "password" }
```

Réponse `200` :

```json
{
  "user": { "id": "user_demo_001", "email": "demo@nel.com", "displayName": "Utilisateur Demo" },
  "token": "<JWT>"
}
```

#### `POST /api/auth/signup`

```json
{ "email": "nouveau@exemple.com", "password": "secret12", "displayName": "Marie" }
```

Réponse `201` : même forme que login.

#### `GET /api/auth/me`

Header : `Authorization: Bearer <JWT>`

Réponse : `{ "user": { … } }`

### Socket.IO

À la connexion, le client doit envoyer :

```js
io(API_URL, { auth: { token: "<JWT>" } });
```

Sans token valide → connexion refusée (`Unauthorized`).

L’**auteur** des messages est toujours dérivé du JWT (pas de spoofing via `authorName` côté client).

---

## API REST — Chat

Toutes les routes chat exigent `Authorization: Bearer <JWT>`.

### `GET /api/chat/:conversationId`

Liste les messages d’un fil.

| Query | Description |
|-------|-------------|
| `since` | Timestamp (ms) — ne renvoie que les messages plus récents |

Exemple :

```http
GET /api/chat/conv_sortie_01?since=1710000000000
Authorization: Bearer <token>
```

Réponse :

```json
{
  "conversationId": "conv_sortie_01",
  "messages": [
    {
      "id": "m_abc",
      "conversationId": "conv_sortie_01",
      "authorId": "user_demo_001",
      "authorName": "Utilisateur Demo",
      "text": "Salut",
      "sentAt": 1710000001000
    }
  ]
}
```

### `POST /api/chat/:conversationId`

Corps :

```json
{
  "text": "Mon message",
  "id": "optionnel",
  "sentAt": 1710000000000
}
```

Réponse `201` : `{ "message": { … } }`

Envoie aussi une **Web Push** aux autres membres de la conversation (si VAPID configuré).

---

## Socket.IO

Connexion : même host que `VITE_CHAT_API_URL`.

### Client → serveur

| Événement | Payload | Description |
|-----------|---------|-------------|
| `user:sync` | `{ conversationIds: string[] }` | Enregistre l’utilisateur dans toutes ses conversations + rejoint les rooms |
| `conversation:join` | `{ conversationId }` | Rejoint une room + reçoit `message:history` |
| `conversation:leave` | `{ conversationId }` | Quitte la room |
| `message:send` | `{ conversationId, text, id?, sentAt? }` | Envoie un message |

### Serveur → client

| Événement | Payload |
|-----------|---------|
| `message:history` | `{ conversationId, messages[] }` |
| `message:new` | `{ message }` |
| `chat:error` | `{ error: string }` |

Room Socket : `conversation:<conversationId>`

---

## Web Push

### `POST /api/push/subscribe`

Header : `Authorization: Bearer <JWT>`

Corps (format standard Push API) :

```json
{
  "endpoint": "https://…",
  "expirationTime": null,
  "keys": { "p256dh": "…", "auth": "…" }
}
```

### `DELETE /api/push/unsubscribe`

Même auth. Corps optionnel : `{ "endpoint": "…" }`

À chaque nouveau message, le serveur notifie les **membres** de la conversation (sauf l’auteur) ayant une subscription enregistrée.

---

## Rétention des messages

**7 jours** (aligné avec le frontend `chatPersistence.ts`). Les messages plus anciens sont ignorés à l’écriture et au filtrage.

---

## Déploiement

Hébergeurs adaptés : **Render**, **Fly.io**, **Railway**, VPS, etc. (process Node longue durée — pas Vercel serverless).

| Étape | Commande / config |
|-------|-------------------|
| Build | `npm install && npm run build` |
| Start | `npm start` |
| Port | Variable `PORT` fournie par l’hébergeur |
| Secrets | `JWT_SECRET`, `VAPID_*`, `ALLOWED_ORIGINS` |

Exemple Render :

- **Root directory** : `backend`
- **Build** : `npm install && npm run build`
- **Start** : `npm start`

Frontend en production :

```env
VITE_CHAT_API_URL=https://ton-api.onrender.com
VITE_VAPID_PUBLIC_KEY=<clé publique>
```

Puis rebuild et deploy du frontend (`yarn build && yarn deploy`).

---

## Configuration frontend

Dans le `.env` à la **racine** du monorepo :

```env
VITE_CHAT_API_URL=http://localhost:3000
VITE_VAPID_PUBLIC_KEY=<clé publique générée par npm run vapid>
```

Fichiers frontend liés :

| Fichier | Rôle |
|---------|------|
| `src/lib/authApi.ts` | Login / signup / token |
| `src/lib/chatSocket.ts` | Connexion Socket.IO |
| `src/lib/chatSync.ts` | Sync globale + unread |
| `src/App.tsx` | Init sync au login |

---

## Scripts npm

| Script | Description |
|--------|-------------|
| `npm run dev` | Dev avec rechargement (`tsx watch`) |
| `npm run build` | Compile → `dist/` |
| `npm start` | Lance `dist/server.js` |
| `npm run typecheck` | Vérification TypeScript |
| `npm run vapid` | Génère paire de clés VAPID |

---

## Limitations connues

| Sujet | Détail |
|-------|--------|
| Persistance | Mémoire RAM — redémarrage = perte des messages serveur |
| Multi-instance | Pas de partage entre plusieurs pods sans store externe |
| Auth | Utilisateurs en mémoire (hors compte démo, créés au signup jusqu’au restart) |
| Membres conversation | Enregistrés via `user:sync` / `join` — nécessaire pour cibler les push |

---

## Dépannage

| Symptôme | Cause probable |
|----------|----------------|
| `401` sur chat | JWT absent ou expiré |
| Socket `Unauthorized` | Token non passé dans `auth.token` |
| `push: false` dans health | Clés VAPID non définies |
| CORS | Ajouter l’origine frontend dans `ALLOWED_ORIGINS` |
| Messages vides après reboot | Normal — stockage mémoire |

---

## Licence

Projet privé Nel.
