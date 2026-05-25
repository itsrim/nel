# Backend chat Nel — Fastify + Socket.IO

Serveur Node.js TypeScript : auth JWT, chat temps réel, Web Push.

## Démarrage

```bash
cd backend
npm install
npm run dev
```

Production :

```bash
npm run build
npm start
```

## Variables d'environnement

| Variable | Description |
|----------|-------------|
| `PORT` | Port (défaut `3000`) |
| `JWT_SECRET` | Secret JWT (obligatoire en prod) |
| `ALLOWED_ORIGINS` | Origines CORS supplémentaires |
| `VAPID_PUBLIC_KEY` | Clé publique Web Push |
| `VAPID_PRIVATE_KEY` | Clé privée Web Push |
| `VAPID_SUBJECT` | ex. `mailto:hello@nel.app` |

Générer les clés VAPID :

```bash
npm run vapid
```

## Fonctionnalités

- **Auth** : `POST /api/auth/login`, `POST /api/auth/signup`, `GET /api/auth/me`
- **Chat REST** : `GET/POST /api/chat/:conversationId` (JWT requis)
- **Socket.IO** : `user:sync`, `conversation:join`, `message:send`, `message:new`
- **Web Push** : `POST /api/push/subscribe` (JWT requis)

Stockage messages : **mémoire** (pas de Redis).

Compte démo : `demo@nel.com` / `password`

## Frontend

```env
VITE_CHAT_API_URL=http://localhost:3000
VITE_VAPID_PUBLIC_KEY=<clé publique>
```

## Déploiement (Render, Fly.io…)

- Build : `npm install && npm run build`
- Start : `npm start`
- Configurer `JWT_SECRET` + clés VAPID
