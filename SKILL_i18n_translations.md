# Skill: Complete i18n Missing Translations

## Purpose

Systematically migrate hardcoded strings in React components to a centralized translation system, ensuring the app supports multiple languages (FR/EN) consistently.

## Prerequisites

- Translation system already implemented: `useTranslation()` hook in [src/i18n/useTranslation.ts](src/i18n/useTranslation.ts)
- Translation data structure: [src/i18n/translations.ts](src/i18n/translations.ts) with nested `fr` and `en` objects
- [HARDCODED_STRINGS_REPORT.md](HARDCODED_STRINGS_REPORT.md) documents all identified hardcoded strings by file

## Workflow

### Phase 1: Identify & Plan

1. **Source**: Review [HARDCODED_STRINGS_REPORT.md](HARDCODED_STRINGS_REPORT.md) or search codebase for hardcoded strings
2. **Context**: Note the line number, string content, and context (aria-label, placeholder, button text, etc.)
3. **Group**: Organize by component file for efficient batching

### Phase 2: Add Translations

For each hardcoded string:

1. **Decide Translation Key Name**
   - Use camelCase, descriptive names
   - Pattern: `componentContext` (e.g., `settingsAriaLabel`, `searchPlaceholder`, `continueButton`)
   - Group related strings with prefixes when applicable (e.g., `step1`, `step2`, `step3`)

2. **Handle Dynamic Content** (template strings with variables)
   - **Option A**: Split into parts for reconstruction
     - Store template parts separately
     - Reconstruct in component using template literals
     - Example: `unreadCount: "unread"` + `` `${count} ${t('unreadCount')}` ``
   - **Option B**: Use template with placeholder variables
     - Store full template with variable names in curly braces
     - Use string replacement in component
     - Simpler for simple cases

3. **Add to translations.ts**
   - Add key to both `fr` and `en` objects in same location
   - Maintain alphabetical order within sections
   - Use organized comments to group related translations

### Phase 3: Update Components

1. **Import Hook** (if not already imported)

   ```tsx
   import { useTranslation } from "../i18n/useTranslation";
   ```

2. **Destructure in Component**

   ```tsx
   const { t } = useTranslation();
   ```

3. **Replace Hardcoded String**
   - Remove the hardcoded string literal
   - Replace with `t('keyName')`
   - For dynamic content: use template literal reconstruction if needed

4. **Handle Conditionals** (avoid language-based ternaries)
   - ❌ Don't do: `` `${language === 'fr' ? 'Voir' : 'View'}` ``
   - ✅ Do: Create separate translation keys and use simple ternary on keys

### Phase 4: Verify

1. **Type Safety**: Ensure TypeScript recognizes translation key
2. **Both Languages**: Test in FR and EN modes
3. **Aria Labels**: Verify accessibility attributes are translated
4. **Templates**: Confirm dynamic content renders correctly

## Translation Key Naming Conventions

### By Context

| Context        | Pattern                     | Example                                        |
| -------------- | --------------------------- | ---------------------------------------------- |
| Button labels  | `action + Button` or direct | `continueButton`, `save`                       |
| Placeholders   | `field + Placeholder`       | `searchPlaceholder`, `messageInputPlaceholder` |
| Aria labels    | `element + AriaLabel`       | `settingsAriaLabel`, `filterAriaLabel`         |
| Section titles | `section + Title` or direct | `aboutTitle`, `chatSettings`                   |
| Error messages | `error + Name`              | `participantsError`                            |
| Templates      | `element + Template`        | Handle with parts or placeholder approach      |

### By Component

Group translations with comments:

```ts
// BottomNavigation
chat: "Chat",
events: "Events",

// EventsPage
previousWeek: "Previous week",
nextWeek: "Next week",
```

## Common Patterns

### Pattern 1: Simple String Replacement

```tsx
// Before
<button>{'Continuer'}</button>

// After in translations.ts
continue: "Continuer",  // fr
continue: "Continue",   // en

// After in component
<button>{t('continue')}</button>
```

### Pattern 2: Dynamic Count/Name (Template Reconstruction)

```tsx
// Before
<span>{`${count} non lus`}</span>;

// After in translations.ts
unreadCount: ("unread",
  (
    // After in component
    <span>{`${count} ${t("unreadCount")}`}</span>
  ));
```

### Pattern 3: Conditional Ternary

```tsx
// Before
{language === 'fr' ? 'Voir le profil de' : 'View profile of'}

// After in translations.ts
viewProfileOf: "View profile of",

// After in component
{t('viewProfileOf')}
```

### Pattern 4: Dynamic with Name in Template

```tsx
// Before (for future if needed)
// {`${t('viewProfileOf')} ${userName}`}

// In translations.ts
viewProfileOf: "View profile of";

// In component - if you need full sentence:
// Store context or build in JSX
```

## Quick Checklist for Each String

- [ ] Translation key created in both `fr` and `en`
- [ ] Key added to appropriate section with comment grouping
- [ ] Component imports `useTranslation`
- [ ] Hardcoded string replaced with `t('keyName')`
- [ ] Dynamic content handled correctly (if applicable)
- [ ] TypeScript types updated if using `TranslationKey`
- [ ] Tested in both languages

## Decision Tree: Complex Cases

**Q: String contains variables that change dynamically**
→ Use parts pattern, store each part separately, reconstruct in JSX

**Q: String is an aria-label with dynamic content**
→ Same as above; aria-labels must be translated too

**Q: String is used in multiple components**
→ Create one translation key and reuse across components

**Q: String is a topic/badge (Travail, Argent, etc.)**
→ Group under a section: `work: "Work"`, `money: "Money"`

## Files to Update

- [src/i18n/translations.ts](src/i18n/translations.ts) — Add translation keys
- Component files (multiple) — Replace hardcoded strings
- [HARDCODED_STRINGS_REPORT.md](HARDCODED_STRINGS_REPORT.md) — Mark as resolved

## Execution Tips

- **Batch by component** to avoid context switching
- **Test early** — verify one component fully before moving to the next
- **Use Find & Replace** carefully if multiple identical strings exist
- **Keep translations organized** — maintain alphabetical order within sections
- **Document complex reconstructions** with inline comments in JSX

## Related Skills

- **create-skill/component-refactoring** — For extracting translatable strings into separate utility functions
- **typescript-types** — For maintaining `TranslationKey` type safety
