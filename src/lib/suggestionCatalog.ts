import type { MockProfessional } from "../data/mockProfessionals";
import type { Friend, ProfileVisit, SuggestionProfile } from "../data/mockData";
import { shouldExcludeFromPublicCatalog } from "./accountRoles";

function usageScore(
  profilId: string,
  profileVisits: ProfileVisit[],
  eventsInCommon: number,
): number {
  const visit = profileVisits.find((v) => v.id === profilId);
  const visitBoost = visit ? visit.lastVisitAt : 0;
  const multiplier = visit?.visitMultiplier ?? 1;
  return visitBoost + eventsInCommon * 1_000_000 + multiplier * 10_000;
}

/** Annuaire suggestions (pros inclus) — tri par activité / usage récent. */
export function buildSuggestionCatalog(
  friends: Friend[],
  profileVisits: ProfileVisit[],
  professionals: MockProfessional[],
): SuggestionProfile[] {
  const map = new Map<string, SuggestionProfile & { score: number }>();

  for (const f of friends) {
    const id = f.profilId.trim();
    if (!id || shouldExcludeFromPublicCatalog(id)) continue;
    map.set(id, {
      id,
      pseudo: f.pseudo?.trim() || f.name.trim().split(/\s+/)[0] || id,
      age: f.age ?? 26,
      imageUrl: f.imageUrl,
      aspectRatio: 0.72,
      score: usageScore(id, profileVisits, f.eventsInCommon),
    });
  }

  for (const pro of professionals) {
    const id = pro.id.trim();
    if (!id || map.has(id)) continue;
    map.set(id, {
      id,
      pseudo: `${pro.firstName} ${pro.lastName.charAt(0)}.`.trim(),
      age: 30,
      imageUrl: pro.imageUrl,
      aspectRatio: 0.68,
      score: usageScore(id, profileVisits, 0) + 500,
    });
  }

  return [...map.values()]
    .sort((a, b) => b.score - a.score || a.pseudo.localeCompare(b.pseudo, "fr"))
    .map(({ score: _score, ...profile }) => profile)
    .filter((p) => !shouldExcludeFromPublicCatalog(p.id));
}
