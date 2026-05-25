# Google Sheets comme base de données CSV

Chaque **onglet** du classeur = une **table** (messages, etc.).

## 1. Créer le Google Sheet

Onglet **`messages`** avec cette ligne d’en-tête (ligne 1) :

| conversationId | id | authorId | authorName | text | sentAt |
|----------------|-----|----------|------------|------|--------|

Partager le sheet en **« Toute personne disposant du lien → Lecteur »** (minimum pour l’export CSV).

## 2. Encoder l’URL du classeur

Dans la console du navigateur (ou un script) :

```js
const url = "https://docs.google.com/spreadsheets/d/TON_ID/edit?usp=sharing";
const encoded = url.split("").map((c) => String.fromCharCode(c.charCodeAt(0) + 1)).join("");
console.log(encoded);
```

Coller le résultat dans `.env` :

```env
VITE_GOOGLE_SHEETS_URL_ENCODED=<résultat>
VITE_SHEET_GID_MESSAGES=0
```

Le **GID** est dans l’URL quand tu cliques sur l’onglet `messages` : `#gid=123456789`.

## 3. Apps Script pour POST / PUT

1. Ouvre **Extensions → Apps Script**
2. Colle `google-apps-script/sheets-api.gs`
3. Remplace `SPREADSHEET_ID` par l’id du classeur
4. **Déployer → Nouvelle version → Application Web**
   - Exécuter : Moi
   - Accès : **Tout le monde**
5. Copie l’URL de déploiement :

```env
VITE_GOOGLE_SHEETS_API_URL=https://script.google.com/macros/s/.../exec
```

## 4. API frontend (`src/lib/googleSheetsDb.ts`)

| Méthode | Rôle |
|---------|------|
| `sheetGet('messages')` | GET — export CSV de l’onglet |
| `sheetPost('messages', row)` | POST — une ligne |
| `sheetBatchPost('messages', rows)` | POST — plusieurs lignes |
| `sheetPut('messages', id, patch)` | PUT — mise à jour par `id` |

Exemple :

```ts
import { sheetGet, sheetPost, sheetPut } from "./lib/googleSheetsDb";

const rows = await sheetGet("messages");

await sheetPost("messages", {
  conversationId: "conv_1",
  id: "m_abc",
  authorId: "user_1",
  authorName: "Jean",
  text: "Salut",
  sentAt: String(Date.now()),
});

await sheetPut("messages", "m_abc", { text: "Message modifié" });
```

## 5. Chat Nel

`chatPersistence.ts` utilise déjà cette couche :

- **Lecture** : Google Sheet → cache `localStorage`
- **Écriture** : `localStorage` immédiat + sync Sheets en arrière-plan

Sans `VITE_GOOGLE_SHEETS_URL_ENCODED` → uniquement `localStorage` + optionnellement `/nel/messages.csv`.

## Ajouter une table

1. Nouvel onglet dans le Sheet (ex. `events`)
2. Entrée dans `SHEET_TABLES` dans `googleSheetsDb.ts`
3. Variable `VITE_SHEET_GID_EVENTS` si besoin
