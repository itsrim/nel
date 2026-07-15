# Hlg — Frontend

Application web **React + TypeScript + Vite** pour Hlg : messagerie, sorties, profils, PWA.  
Production : [https://happyletsgo.fr](https://happyletsgo.fr)

Le serveur chat temps réel est dans le dossier [`backend/`](backend/README.md).

---

## Stack

| Technologie | Usage |
|-------------|--------|
| **React 18** | Interface |
| **TypeScript** | Typage |
| **Vite** | Build & dev server |
| **Zustand** | État global (auth, chat, navigation, thème, i18n) |
| **Socket.IO client** | Chat temps réel (si backend configuré) |
| **Papa Parse** | CSV / Google Sheets |
| **vite-plugin-pwa** | PWA + service worker |
| **lucide-react** | Icônes |

---

## Prérequis

- Node.js 18+
- `yarn` ou `npm`

---

## Démarrage rapide

```bash
# À la racine du repo (frontend)
yarn install
cp env.example .env
# Éditer .env si besoin (chat API, Sheets, ImageKit…)
yarn dev
```

Ouvre [http://localhost:5173/](http://localhost:5173/).

### Avec le backend chat en local

Terminal 1 — API :

```bash
cd backend
npm install
npm run dev
```

Terminal 2 — frontend :

```env
# .env
VITE_CHAT_API_URL=http://localhost:3000
```

Puis `yarn dev`. Connexion démo : `demo@nel.com` / `password`.

---

## Scripts

| Commande | Description |
|----------|-------------|
| `yarn dev` | Serveur de développement Vite |
| `yarn build` | Build production → `dist/` |
| `yarn preview` | Prévisualiser le build |
| `yarn lint` | ESLint |
| `yarn deploy` | Build + déploiement `gh-pages` |

---

## Structure du projet

```
src/
├── App.tsx                 # Shell, auth, sync chat global
├── main.tsx
├── sw.js                   # Service worker (PWA + Web Push)
├── pages/                  # Écrans (Chat, Events, Profile, Login…)
├── components/             # UI réutilisable
├── store/                  # Zustand
│   ├── useAuthStore.ts
│   ├── useMessagingStore.ts
│   ├── useNavigationStore.ts
│   └── …
├── lib/
│   ├── chatConfig.ts       # URL API chat
│   ├── chatSocket.ts       # Socket.IO + envoi messages
│   ├── chatSync.ts         # Sync globale, badges non lus
│   ├── chatPersistence.ts  # Historique (local + Sheets)
│   ├── googleSheetsDb.ts   # GET/POST/PUT sur onglets Sheet
│   ├── authApi.ts          # Login/signup JWT vers backend
│   └── pushNotifications.ts
├── data/mockData.ts        # Données démo
└── i18n/                   # FR / EN

google-apps-script/csv-templates/  # Schémas CSV (source unique)
public/csv/                      # Copie auto (npm run sync-csv) — fallback HTTP

google-apps-script/         # Script pour POST/PUT Sheets
backend/                    # API Node (voir backend/README.md)
```

---

## Fonctionnalités principales

### Navigation

- Onglets : **Chat**, **Événements**, **Profil**
- Pile de détails : fil de discussion, fiche sortie, profil, paramètres chat

### Authentification

- **Sans** `VITE_CHAT_API_URL` : auth locale (démo en mémoire + `localStorage`)
- **Avec** backend : `POST /api/auth/login` et `signup`, JWT stocké (`nel_auth_token`)

Compte démo (backend + local) : `demo@nel.com` / `password`  
Compte admin test : `admin@yo.com` / `1234`

### Chat

| Mode | Comportement |
|------|----------------|
| Pas d’API | Messages en `localStorage` (CSV) uniquement |
| API configurée | Socket.IO temps réel + persistance serveur (mémoire) |

- DM et groupes : même `conversationId`
- Badges **non lus** sur la liste si message reçu hors fil ouvert
- Notifications in-app (onglet Profil → Notifications)
- **Web Push** si `VITE_VAPID_PUBLIC_KEY` + permission navigateur

Fichiers clés : `chatSync.ts`, `chatSocket.ts`, `useMessagingStore.ts`

### Persistance Google Sheets

Chaque **onglet** du classeur = une table CSV logique.

| Opération | Mécanisme |
|-----------|-----------|
| **GET** | Export CSV public Google Sheets |
| **POST / PUT** | Apps Script (voir [`google-apps-script/README.md`](google-apps-script/README.md)) |

Le chat utilise l’onglet **`messages`**. Détail : `src/lib/googleSheetsDb.ts` et `chatPersistence.ts`.

### PWA

- Installable, cache Workbox
- Notifications push via `sw.js` (événement `push`)

### Autres

- i18n FR / EN (`useLanguageStore`)
- Upload images ImageKit (`VITE_IMAGEKIT_PRIVATE_KEY`)
- Thème sombre

---

## Variables d’environnement

Copier `env.example` → `.env` (non versionné).

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `VITE_CHAT_API_URL` | Non | URL du backend Fastify (ex. `http://localhost:3000`) |
| `VITE_VAPID_PUBLIC_KEY` | Non | Clé publique Web Push (générée côté backend : `npm run vapid`) |
| `VITE_GOOGLE_SHEETS_URL_ENCODED` | Non | URL Google Sheet encodée (+1 par caractère) |
| `VITE_GOOGLE_SHEETS_API_URL` | Non | URL Apps Script pour écriture Sheets |
| `VITE_SHEET_GID_MESSAGES` | Non | GID de l’onglet `messages` (défaut `0`) |
| `VITE_DEFAULT_CSV_PATH` | Non | CSV local de secours (défaut `/csv/messages.csv`) |
| `VITE_IMAGEKIT_PRIVATE_KEY` | Non | Signature uploads ImageKit |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Non | OAuth Google (si utilisé) |

Encoder l’URL Google Sheet :

```js
const url = "https://docs.google.com/spreadsheets/d/TON_ID/edit?usp=sharing";
const encoded = [...url].map((c) => String.fromCharCode(c.charCodeAt(0) + 1)).join("");
console.log(encoded);
```

---

## API Google Sheets (frontend)

```ts
import { sheetGet, sheetPost, sheetPut, sheetBatchPost } from "./lib/googleSheetsDb";

// GET — lecture onglet "messages"
const rows = await sheetGet("messages");

// POST — nouvelle ligne
await sheetPost("messages", {
  conversationId: "conv_1",
  id: "m_abc",
  authorId: "user_1",
  authorName: "Jean",
  text: "Salut",
  sentAt: String(Date.now()),
});

// PUT — mise à jour par id
await sheetPut("messages", "m_abc", { text: "Message modifié" });
```

Tables disponibles : définies dans `SHEET_TABLES` (`googleSheetsDb.ts`) — `messages`, `events`, `conversations`, `profiles`, `suggestions`, `viewer_settings`, `profile_visits`, `notifications`, `admin_reports`. Schéma complet : [`google-apps-script/README.md`](google-apps-script/README.md).

---

## Intégration backend chat

1. Déployer ou lancer le backend ([`backend/README.md`](backend/README.md))
2. Définir `VITE_CHAT_API_URL` (sans slash final)
3. Se connecter → le frontend envoie le JWT au socket (`auth.token`)
4. `App.tsx` appelle `initGlobalChatSync()` sur toutes les conversations

Sans variable → mode **offline / démo** (pas de socket, pas de JWT serveur).

---

## Déploiement (happyletsgo.fr)

```bash
yarn build
# Déployer le contenu de dist/ sur le serveur (racine du domaine)
```

- Base path : `/` (`vite.config.ts`) — site à la racine de `https://happyletsgo.fr`
- Configurer le serveur pour renvoyer `index.html` sur les routes SPA (fallback)
- Backend : héberger sur Render, Fly.io, Railway, etc. ; `VITE_CHAT_API_URL` au build + `APP_PUBLIC_URL=https://happyletsgo.fr` côté API

```bash
# Ancien déploiement GitHub Pages (optionnel)
yarn deploy
```

---

## Build & chemins

- `base: '/'` — assets et routes à la racine du domaine
- En prod : `https://happyletsgo.fr`
- Liens sorties partagées : `https://happyletsgo.fr/event/{id}`

---

## Liens documentation

| Document | Contenu |
|----------|---------|
| [`backend/README.md`](backend/README.md) | API REST, Socket.IO, auth, push |
| [`google-apps-script/README.md`](google-apps-script/README.md) | POST/PUT Google Sheets |

---

## Dépannage

| Problème | Piste |
|----------|--------|
| Chat ne se synchronise pas | `VITE_CHAT_API_URL` défini ? Backend lancé ? Token après login ? |
| Erreur socket Unauthorized | Reconnecte-toi (`demo@nel.com` / `password`) |
| Sheets GET échoue | Sheet public en lecture ? Bon `gid` ? CORS parfois bloqué → fallback `messages.csv` |
| POST Sheets échoue | Apps Script déployé ? `VITE_GOOGLE_SHEETS_API_URL` correct ? |
| Push absente | HTTPS requis, `VITE_VAPID_PUBLIC_KEY`, permission notifications |

---

## Licence

Projet privé Hlg.
