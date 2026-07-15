import type { SuggestionProfile } from "../data/mockData";

export const SUGGESTION_PAGE_SIZE = 50;
export const SUGGESTION_MASONRY_COLUMNS = 2;

/** Répartit les cartes photo en colonnes (hauteur visuelle équilibrée). */
export function buildMasonryColumns(
  items: SuggestionProfile[],
  columnCount: number,
): SuggestionProfile[][] {
  const cols: SuggestionProfile[][] = Array.from({ length: columnCount }, () => []);
  const heights = Array(columnCount).fill(0);
  for (const item of items) {
    const w = 1 / item.aspectRatio;
    let minI = 0;
    for (let c = 1; c < columnCount; c++) {
      if (heights[c] < heights[minI]) minI = c;
    }
    cols[minI].push(item);
    heights[minI] += w;
  }
  return cols;
}

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
