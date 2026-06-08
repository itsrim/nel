# Google Sheets comme base de données CSV

Chaque **onglet** du classeur = une **table**. Les **POST** ajoutent une ligne ; les **PUT** mettent à jour une ligne existante par `id`.

## 1. Créer le Google Sheet

Créer un classeur avec **10 onglets** et la **ligne 1 = en-têtes** (copier-coller une ligne par onglet).

### `messages`
```
conversationId,id,authorId,authorName,text,sentAt,userId
```

### `events`
```
userId,id,conversationId,title,location,dateKey,timeShort,dateLabel,sectionDateLabel,imageUri,priceLabel,price,participantCount,participantMax,isFavorite,isBeta,status,notes,visitsCount,category,hostName,hostAvatar,participantAvatarsJson,hideAddress,isPrivate,manualApproval,hostedByViewer,creatorId,waitlistEntriesJson,invitedProfilIdsJson,publicUrl,validatedPresentProfilIdsJson,karmaOrganizerRewarded,karmaOrganizerDenied,organizerRatingsJson,karmaJoinPaidProfilIdsJson,karmaOrganizePaid,deleted
```

### `conversations`
```
userId,id,title,type,lastMessagePreview,avatarGradient0,avatarGradient1,unreadCount,updatedAt,lastOpenedAt,isFavorite,memberCount,muteSounds,blockNotifications,membersJson,deleted
```

### `profiles` (amis — inclut `imageUrl`)
```
userId,id,profilId,name,age,city,imageUrl,eventsInCommon,mainChatConversationId,pseudo,bio,memberSince,verified,isPro,proAddress,karma,websiteUrl,socialUrl,phone,statsJson,badgesJson,mutualFriend,deleted
```

### `suggestions`
```
userId,id,pseudo,age,imageUrl,aspectRatio,deleted
```

### `viewer_settings` (profil connecté — avatar, email vérifié, préférences)
```
userId,id,email,emailVerified,avatarUrl,displayName,isPro,isPremium,premiumExpiresAt,proExpiresAt,premiumPaymentValidated,premiumMonths,premiumLastPaymentAt,premiumLastTransactionId,proPaymentValidated,proMonths,proLastPaymentAt,proLastTransactionId,city,websiteUrl,socialUrl,phone,proAddress,proLat,proLng,karma,badgesJson,friendRequestSentJson,friendRequestRejectedJson,favoriteConversationIdsJson,moderationHiddenEventIdsJson,moderationHiddenProfilIdsJson,deleted
```

### `profile_visits`
```
userId,id,name,age,avatarUrl,lastVisitAt,visitMultiplier,friendRequest,deleted
```

### `notifications`
```
userId,id,createdAt,kind,eventId,eventTitle,inviteeName,inviteeProfilId,conversationId,senderName,messagePreview,deleted
```

### `admin_reports`
```
userId,id,createdAt,kind,subjectId,subjectLabel,explanation,read,deleted
```

### `professionals` (annuaire global — sans `userId`)
```
id,firstName,lastName,category,categoryLabel,city,address,description,imageUrl,mapX,mapY,lat,lng,verified,websiteUrl,socialUrl,phone,deleted
```

Partager le sheet en **« Toute personne disposant du lien → Lecteur »**.

## 2. Encoder l’URL du classeur

```js
const url = "https://docs.google.com/spreadsheets/d/TON_ID/edit?usp=sharing";
const encoded = url.split("").map((c) => String.fromCharCode(c.charCodeAt(0) + 1)).join("");
console.log(encoded);
```

Coller dans `.env` :

```env
VITE_GOOGLE_SHEETS_URL_ENCODED=<résultat>
```

## 3. GID de chaque onglet

Cliquer sur chaque onglet → l’URL contient `#gid=123456789`. Renseigner dans `.env` :

```env
VITE_SHEET_GID_MESSAGES=0
VITE_SHEET_GID_EVENTS=...
VITE_SHEET_GID_CONVERSATIONS=...
VITE_SHEET_GID_PROFILES=...
VITE_SHEET_GID_SUGGESTIONS=...
VITE_SHEET_GID_VIEWER_SETTINGS=...
VITE_SHEET_GID_PROFILE_VISITS=...
VITE_SHEET_GID_NOTIFICATIONS=...
VITE_SHEET_GID_ADMIN_REPORTS=...
VITE_SHEET_GID_PROFESSIONALS=...
```

## 4. Apps Script pour POST / PUT

1. **Extensions → Apps Script**
2. Coller `google-apps-script/sheets-api.gs`
3. Remplacer `SPREADSHEET_ID`
4. **Déployer → Application Web** (Exécuter : Moi, Accès : Tout le monde)
5. Copier l’URL :

```env
VITE_GOOGLE_SHEETS_API_URL=https://script.google.com/macros/s/.../exec
```

## 5. Comportement Nel

| Action app | Sheets |
|------------|--------|
| Création sortie / ami / conversation | **POST** (nouvelle ligne) |
| Modification (titre, `imageUri`, avatar, etc.) | **PUT** (mise à jour par `id`) |
| Suppression sortie / conversation / signalement | **PUT** `deleted=true` |

- **Lecture** au login : Google Sheet → fusion avec l’état local / mock
- **Écriture** : cache `localStorage` immédiat + sync Sheets en arrière-plan
- **Images** : fichiers sur ImageKit ; le Sheet stocke l’**URL** (`imageUri`, `imageUrl`, `avatarUrl`)

Sans variables Sheets → mock + `localStorage` uniquement.

## 6. API frontend

```ts
import { sheetGet, sheetPost, sheetPut, sheetBatchPost } from "./lib/googleSheetsDb";
import { upsertSheetRow, syncEventToSheets } from "./lib/appSheetPersistence";

// Lecture
const events = await sheetGet("events");

// Upsert (POST ou PUT automatique)
await upsertSheetRow("events", event.id, eventToRow(event, userId));
```

Tables : `SHEET_TABLES` dans `src/lib/googleSheetsDb.ts`.
