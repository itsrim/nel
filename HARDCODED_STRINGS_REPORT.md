# Hardcoded Text Strings Report - Translation Migration

This document lists all hardcoded text strings in component files (TSX) that are NOT using the `useTranslation()` hook and should be added to the translation system.

---

## Summary

- **Total Files with Hardcoded Strings:** 11
- **Total Hardcoded Strings Found:** 50+
- **Languages Affected:** French (FR), English (EN)

---

## By File

### 1. [src/components/BottomNavigation.tsx](src/components/BottomNavigation.tsx)

| Line | Type  | Exact String | Context               |
| ---- | ----- | ------------ | --------------------- |
| 12   | label | `'Chat'`     | Navigation item label |
| 13   | label | `'Events'`   | Navigation item label |
| 14   | label | `'Profile'`  | Navigation item label |

---

### 2. [src/components/QuestionnaireModal.tsx](src/components/QuestionnaireModal.tsx)

| Line | Type        | Exact String                                                                                                                                                                        | Context                                            |
| ---- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 25   | array item  | `'Travail'`, `'Argent'`, `'Aide'`, `'Santé'`, `'Fatigue'`, `'Douleur'`, `'Bonheur'`, `'Famille'`, `'Amour'`, `'Sport'`, `'Amis'`, `'Stress'`, `'Calme'`, `'Nature'`, `'Créativité'` | BADGES array - Topic options                       |
| 86   | kicker text | `'Comment ça va ?'`                                                                                                                                                                 | Header text                                        |
| 87   | step badge  | `'ÉTAPE {step} SUR 3'`                                                                                                                                                              | Step indicator (template with dynamic step number) |
| 91   | title       | `'Quelle est votre humeur ?'`                                                                                                                                                       | Step 1 title                                       |
| 92   | title       | `"Qu'est-ce qui occupe votre esprit ?"`                                                                                                                                             | Step 2 title                                       |
| 93   | title       | `'Une petite note pour vous-même ?'`                                                                                                                                                | Step 3 title                                       |
| 96   | subtitle    | `'Choisissez l\'emoji qui vous ressemble le plus aujourd\'hui.'`                                                                                                                    | Step 1 subtitle                                    |
| 97   | subtitle    | `'Sélectionnez un thème qui a marqué votre journée.'`                                                                                                                               | Step 2 subtitle                                    |
| 98   | subtitle    | `'C\'est privé, juste pour votre historique.'`                                                                                                                                      | Step 3 subtitle                                    |
| 134  | placeholder | `'Écrivez quelque chose ici...'`                                                                                                                                                    | Textarea placeholder                               |
| 143  | button text | `'Continuer'`                                                                                                                                                                       | Continue button (with Check icon)                  |
| 149  | button text | `'Passer'`                                                                                                                                                                          | Skip button                                        |

---

### 3. [src/pages/ProfilePage.tsx](src/pages/ProfilePage.tsx)

| Line | Type             | Exact String                                                                     | Context                                                                |
| ---- | ---------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 223  | aria-label       | `'Settings'`                                                                     | Settings button aria label (hardcoded, should be translatable)         |
| 254  | placeholder      | `'Nom'`                                                                          | Name input placeholder                                                 |
| 260  | placeholder      | `'Âge'`                                                                          | Age input placeholder                                                  |
| 281  | placeholder      | `'Bio...'`                                                                       | Bio input placeholder                                                  |
| 363  | aria-label       | `` `${unreadAdminReportsCount} non lus` ``                                       | Unread count aria label (template with dynamic count)                  |
| 396  | aria-label       | `` `Ouvrir la sortie ${e.title}` ``                                              | Event open aria label (template with dynamic title)                    |
| 412  | conditional text | `'Vous organisez'` / `'You organize'`                                            | Ternary: organization status tag (FR/EN split, should use translation) |
| 451  | aria-label       | `` `${language === 'fr' ? 'Voir le profil de' : 'View profile of'} ${f.name}` `` | Profile view aria label (ternary with conditional FR/EN)               |

---

### 4. [src/pages/HomePage.tsx](src/pages/HomePage.tsx)

| Line | Type                       | Exact String                 | Context                           |
| ---- | -------------------------- | ---------------------------- | --------------------------------- |
| 78   | placeholder                | `'Rechercher une activité…'` | Search bar placeholder            |
| 109  | section title (if showing) | `'Top 5 Activités'`          | Top events section title (in JSX) |
| 128  | section title              | `'Agenda des activités'`     | Main agenda section title         |

---

### 5. [src/pages/EventsPage.tsx](src/pages/EventsPage.tsx)

| Line | Type          | Exact String                                           | Context                           |
| ---- | ------------- | ------------------------------------------------------ | --------------------------------- |
| 250  | aria-label    | `'Semaine précédente'`                                 | Previous week button aria label   |
| 255  | aria-label    | `'Rechercher'`                                         | Search button aria label          |
| 259  | aria-label    | `'Semaine suivante'`                                   | Next week button aria label       |
| 276  | aria-label    | `'Calendrier'`                                         | Calendar button aria label        |
| 288  | placeholder   | `'Rechercher une activité…'`                           | Search input placeholder          |
| 296  | aria-label    | `'Effacer'`                                            | Clear search button aria label    |
| 300  | aria-label    | `'Valider'`                                            | Validate search button aria label |
| 310  | aria-label    | `'Retour à la recherche texte'`                        | Back to text search aria label    |
| 326  | aria-label    | `'Filtrer par date (à partir de cette date)'`          | Date filter aria label            |
| 331  | placeholder   | `'Lieu'`                                               | Location input placeholder        |
| 334  | aria-label    | `'Filtrer par lieu'`                                   | Location filter aria label        |
| 340  | aria-label    | `'Filtrer par thème (même liste que les couvertures)'` | Theme filter aria label           |
| 355  | aria-label    | `'Filtres : date, lieu, tag'`                          | Filters button aria label         |
| 368  | section title | `'Top 5 de la semaine'`                                | Weekly top events section         |
| 388  | empty state   | `'Aucun événement sur cette semaine.'`                 | No events message                 |
| 418  | aria-label    | `'Créer un événement'`                                 | Create event button aria label    |

---

### 6. [src/pages/CreateEventPage.tsx](src/pages/CreateEventPage.tsx)

| Line | Type              | Exact String                                                                                                     | Context                                       |
| ---- | ----------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 346  | confirmation text | `'Annuler définitivement cette sortie ? Elle disparaîtra de la liste et le groupe de discussion sera supprimé.'` | Delete event confirmation dialog              |
| 360  | aria-label        | `'Fermer'`                                                                                                       | Close button aria label                       |
| 365  | label (header)    | `'Modifier la sortie'` / `'Nouvelle sortie'`                                                                     | Edit mode title / Create mode title (ternary) |
| 369  | aria-label        | `'Enregistrer'` / `'Créer'`                                                                                      | Save/Create button aria label (ternary)       |
| 370  | button text       | `'Enregistrer'` / `'Créer'`                                                                                      | Save/Create button text (ternary)             |
| 385  | aria-label        | `'Couvertures suggérées par thème'`                                                                              | Theme cover suggestions aria label            |
| 395  | aria-label        | `` `Couverture ${theme.tag}` ``                                                                                  | Individual theme cover aria label (template)  |
| 409  | aria-label        | `'Ajouter une photo de couverture'`                                                                              | Add cover photo aria label                    |
| 444  | placeholder       | `'Titre de l\'événement'`                                                                                        | Event title placeholder                       |
| 484  | placeholder       | `'Ex: Parc Monceau'`                                                                                             | Location example placeholder                  |
| 501  | aria-label        | `'Augmenter le maximum'`                                                                                         | Increase max participants aria label          |
| 509  | aria-label        | `'Diminuer le maximum'`                                                                                          | Decrease max participants aria label          |
| 524  | placeholder       | `'Ajoutez des détails, le déroulé, le matériel à prévoir...'`                                                    | Description textarea placeholder              |
| 565  | aria-label        | `'Sortie privée'`                                                                                                | Private event toggle aria label               |
| 613  | button text       | `'Annuler la sortie'`                                                                                            | Delete event button text                      |
| 621  | button text       | `'Fermer'` / `'Annuler'`                                                                                         | Close/Cancel button text (ternary)            |
| 628  | aria-label        | `'Enregistrer les modifications'` / `"Créer l'événement"`                                                        | Save/Create aria label (ternary)              |
| 629  | button text       | `'✨ Enregistrer'` / `"✨ Créer l'événement"`                                                                    | Save/Create button text with emoji (ternary)  |

---

### 7. [src/pages/EventDetailPage.tsx](src/pages/EventDetailPage.tsx)

| Line    | Type         | Exact String                                                                                                                                                                | Context                                        |
| ------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 184     | aria-label   | `'Retour'`                                                                                                                                                                  | Back button aria label                         |
| 189     | aria-label   | `'Partager'`                                                                                                                                                                | Share button aria label                        |
| 196     | aria-label   | `'Retirer des favoris'` / `'Ajouter aux favoris'`                                                                                                                           | Favorite toggle aria label (ternary)           |
| 204     | aria-label   | `'Signaler cette sortie'`                                                                                                                                                   | Report event aria label                        |
| 247     | aria-label   | `` `${event.participantCount} inscrits sur ${event.participantMax}, ${waitlist.length} en liste d'attente` ``                                                               | Participants count aria label (template)       |
| 269     | aria-label   | `'Voir mon profil'`                                                                                                                                                         | View my profile aria label                     |
| 290     | aria-label   | `` `Voir le profil de ${slot.name}` ``                                                                                                                                      | View profile aria label (template)             |
| 309     | aria-label   | `'Inviter des amis à cette sortie'`                                                                                                                                         | Invite friends aria label                      |
| 360     | aria-label   | `` `Voir le profil de ${w.name}` ``                                                                                                                                         | Waitlist profile view aria label (template)    |
| 396     | aria-label   | `'Ouvrir la discussion'`                                                                                                                                                    | Open chat aria label                           |
| 425     | aria-label   | `'Fermer'`                                                                                                                                                                  | Close button aria label                        |
| 438     | aria-label   | `'Fermer'`                                                                                                                                                                  | Close button aria label (duplicate)            |
| 218-236 | various text | `'À propos de l\'activité'`, `'Participants'`, `'Liste d\'attente'`, `'Inviter des amis'`, `'Venez nombreux...'`, `'En attente de validation'`, `'Capacité complète'`, etc. | Multiple hardcoded section titles and messages |

---

### 8. [src/pages/ChatRoomPage.tsx](src/pages/ChatRoomPage.tsx)

| Line | Type        | Exact String            | Context                   |
| ---- | ----------- | ----------------------- | ------------------------- |
| 177  | placeholder | `'Écrivez un message…'` | Message input placeholder |

---

### 9. [src/pages/OtherProfilePage.tsx](src/pages/OtherProfilePage.tsx)

| Line | Type       | Exact String                        | Context                            |
| ---- | ---------- | ----------------------------------- | ---------------------------------- |
| 133  | aria-label | `'Retour'`                          | Back button aria label             |
| 140  | aria-label | `'Signaler ce profil'`              | Report profile aria label          |
| 253  | aria-label | `` `Ouvrir la sortie ${e.title}` `` | Open event aria label (template)   |
| 309  | aria-label | `` `Voir le profil de ${f.name}` `` | View profile aria label (template) |
| 329  | aria-label | `` `Ouvrir la sortie ${e.title}` `` | Open event aria label (template)   |

---

### 10. [src/components/ReportModal.tsx](src/components/ReportModal.tsx)

| Line | Type        | Exact String                                                     | Context                                 |
| ---- | ----------- | ---------------------------------------------------------------- | --------------------------------------- |
| 83   | placeholder | `'Exemple : contenu offensant, arnaque, incitation à la haine…'` | Report explanation textarea placeholder |
| 85   | button text | `'Annuler'`                                                      | Cancel button                           |
| 88   | button text | `'Envoyer'`                                                      | Send button                             |

---

### 11. [src/pages/ChatSettingsPage.tsx](src/pages/ChatSettingsPage.tsx)

| Line | Type       | Exact String                                              | Context                                         |
| ---- | ---------- | --------------------------------------------------------- | ----------------------------------------------- |
| 168  | aria-label | `'Voir mon profil'` / `` `Voir le profil de ${m.name}` `` | Profile view aria labels (conditional/template) |

---

## Key Patterns Identified

### 1. **Aria Labels** (Most Common)

- Navigation buttons: `'Settings'`, `'Retour'`, `'Fermer'`, `'Rechercher'`
- Dynamic labels with templates: `` `Ouvrir la sortie ${e.title}` ``
- Conditional labels with language ternaries

### 2. **Placeholders**

- Form inputs: `'Nom'`, `'Âge'`, `'Bio...'`, `'Lieu'`, `'Titre de l\'événement'`
- Search: `'Rechercher une activité…'`
- Messages: `'Écrivez un message…'`, `'Écrivez quelque chose ici...'`

### 3. **Button Text**

- Action buttons: `'Continuer'`, `'Passer'`, `'Envoyer'`, `'Annuler'`, `'Enregistrer'`, `'Créer'`
- State-dependent text: `'Modifier la sortie'` / `'Nouvelle sortie'`

### 4. **Section Titles**

- `'Agenda des activités'`, `'Top 5 Activités'`, `'Top 5 de la semaine'`
- `'À propos de l\'activité'`, `'Participants'`, `'Liste d\'attente'`

### 5. **Form Labels & Messages**

- Headers: `'Comment ça va ?'`, `'Quelle est votre humeur ?'`
- Arrays: BADGES in QuestionnaireModal
- Empty states: `'Aucun événement sur cette semaine.'`

### 6. **Conditional/Ternary Text**

- Language-split strings: `language === 'fr' ? 'Vous organisez' : 'You organize'`
- Mode-dependent: `isEditMode ? 'Modifier' : 'Créer'`
- State-dependent: `event.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'`

---

## Recommended Actions

### Phase 1: Add to translations.ts

1. Extract all unique strings
2. Add FR translations for new strings
3. Create EN translations (currently many FR-only)
4. Group by feature/component for maintainability

### Phase 2: Update Components

1. Import `useTranslation` hook where needed
2. Replace hardcoded strings with `t('key')`
3. For templates/dynamic text: Create translation keys with placeholders
4. For conditional text: Decide between:
   - Single translation key with conditional logic inside component
   - Separate translation keys for each condition

### Phase 3: Special Cases to Handle

- **Emoji & Special Characters**: Decide if to include in translations
- **Dynamic Templates**: May need special translation function for variables
- **Arrays** (like BADGES): Consider if each item needs translation or bulk array

---

## Example Migration

**Before:**

```tsx
<button aria-label="Retour" onClick={closeDetail}>
  <ChevronLeft size={28} color="#fff" />
</button>
```

**After:**

```tsx
const { t } = useTranslation();
<button aria-label={t("back")} onClick={closeDetail}>
  <ChevronLeft size={28} color="#fff" />
</button>;
```

And add to translations.ts:

```typescript
back: 'Retour',  // FR
// and in EN
back: 'Back',
```

---

## Statistics

| Category       | Count   |
| -------------- | ------- |
| Aria Labels    | 25+     |
| Placeholders   | 10+     |
| Button Text    | 12+     |
| Section Titles | 5+      |
| Messages/Text  | 8+      |
| **Total**      | **60+** |
