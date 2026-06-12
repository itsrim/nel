import type { SuggestionProfile } from "../data/mockData";

export const SUGGESTION_PAGE_SIZE = 50;
export const SUGGESTION_ROW_HEIGHT = 76;

/** Clé de tri « plus récent d’abord » (suffixe numérique de l’id, ex. u099 > u006). */
function suggestionRecencyKey(s: SuggestionProfile): number {
  const m = s.id.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

export function sortSuggestionsRecentFirst(
  items: SuggestionProfile[],
): SuggestionProfile[] {
  return [...items].sort((a, b) => {
    const byKey = suggestionRecencyKey(b) - suggestionRecencyKey(a);
    if (byKey !== 0) return byKey;
    return b.id.localeCompare(a.id);
  });
}
