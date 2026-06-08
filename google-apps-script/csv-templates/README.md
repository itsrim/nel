# Modèles CSV — Google Sheets Nel

Un fichier par **onglet** du classeur. Chaque fichier ne contient que la **ligne d’en-têtes** (ligne 1).

## Import dans Google Sheets

1. Créer un nouveau classeur Google Sheets.
2. Pour chaque onglet ci-dessous :
   - Renommer l’onglet avec le **nom exact** (sensible à la casse).
   - **Fichier → Importer** → onglet **Charger** → choisir le `.csv` correspondant.
   - Type de séparateur : **virgule**.
   - Cocher **Remplacer la feuille actuelle** (ou coller la ligne 1 manuellement).
3. Supprimer les onglets par défaut inutilisés (`Feuille 1`, etc.) une fois les 10 onglets créés.

## Correspondance onglet ↔ fichier

| Onglet Google Sheets | Fichier CSV |
|----------------------|-------------|
| `messages` | `messages.csv` |
| `events` | `events.csv` |
| `conversations` | `conversations.csv` |
| `profiles` | `profiles.csv` |
| `suggestions` | `suggestions.csv` |
| `viewer_settings` | `viewer_settings.csv` |
| `profile_visits` | `profile_visits.csv` |
| `notifications` | `notifications.csv` |
| `admin_reports` | `admin_reports.csv` |
| `professionals` | `professionals.csv` |

> `professionals` est **global** (pas de colonne `userId`).

## Ensuite

- Partager le classeur en lecture (lien).
- Noter le `#gid=` de chaque onglet dans `.env` (voir `google-apps-script/README.md`).
- Déployer l’Apps Script pour POST/PUT.
