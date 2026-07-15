import type { Event } from "../data/mockData";
import { formatEventSectionTitle } from "./eventDateKey";
import { eventIsVisibleInDiscovery } from "./eventVisibility";

export const EVENT_SEARCH_PAGE_SIZE = 50;

function foldSearch(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function eventMatchesSearchQuery(e: Event, query: string): boolean {
  const q = foldSearch(query.trim());
  if (!q) return true;
  return foldSearch(`${e.title} ${e.location} ${e.notes ?? ""}`).includes(q);
}

export function eventMatchesFilterDateFrom(e: Event, fromDateKey: string): boolean {
  const d = fromDateKey.trim();
  if (!d) return true;
  return e.dateKey >= d;
}

export function eventMatchesFilterLocationQuery(e: Event, q: string): boolean {
  const t = foldSearch(q.trim());
  if (!t) return true;
  return foldSearch(e.location).includes(t);
}

export function eventMatchesFilterTagQuery(e: Event, raw: string): boolean {
  let t = raw.trim();
  if (t.startsWith("#")) t = t.slice(1);
  const f = foldSearch(t);
  if (!f) return true;
  const hay = foldSearch(`${e.category} ${e.title} ${e.notes ?? ""}`);
  return hay.includes(f);
}

export function compareEventsChronological(a: Event, b: Event): number {
  const byDate = a.dateKey.localeCompare(b.dateKey);
  if (byDate !== 0) return byDate;
  return a.timeShort.localeCompare(b.timeShort);
}

export type EventSearchFilters = {
  fromDateKey: string;
  searchQuery: string;
  locationQuery: string;
  tagQuery: string;
};

export function filterUpcomingSearchEvents(
  events: Event[],
  filters: EventSearchFilters,
  ctx: {
    isAdmin: boolean;
    moderationHiddenEventIds: readonly string[];
    viewerProfileDisplayName?: string;
  },
): Event[] {
  const fromKey = filters.fromDateKey.trim();

  return events
    .filter(
      (e) =>
        eventIsVisibleInDiscovery(
          e,
          ctx.isAdmin,
          ctx.moderationHiddenEventIds,
          ctx.viewerProfileDisplayName,
        ) &&
        (!fromKey || e.dateKey >= fromKey) &&
        eventMatchesSearchQuery(e, filters.searchQuery) &&
        eventMatchesFilterDateFrom(e, filters.fromDateKey) &&
        eventMatchesFilterLocationQuery(e, filters.locationQuery) &&
        eventMatchesFilterTagQuery(e, filters.tagQuery),
    )
    .sort(compareEventsChronological);
}

export function pickTopUpcomingEvents(events: Event[], limit: number): Event[] {
  return [...events]
    .sort(
      (a, b) =>
        (b.visitsCount ?? b.participantCount * 5) -
        (a.visitsCount ?? a.participantCount * 5),
    )
    .slice(0, limit);
}

export type EventSearchSection = {
  dateKey: string;
  title: string;
  items: Event[];
};

export function buildEventSearchSections(events: Event[]): EventSearchSection[] {
  const map = new Map<string, Event[]>();
  for (const e of events) {
    if (!map.has(e.dateKey)) map.set(e.dateKey, []);
    map.get(e.dateKey)!.push(e);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([dateKey, items]) => ({
      dateKey,
      title: formatEventSectionTitle(dateKey),
      items: [...items].sort(compareEventsChronological),
    }));
}

export type EventSearchVirtualRow =
  | { kind: "header"; dateKey: string; title: string }
  | { kind: "cards"; events: Event[] };

export function buildEventSearchVirtualRows(
  sections: EventSearchSection[],
): EventSearchVirtualRow[] {
  const rows: EventSearchVirtualRow[] = [];
  for (const section of sections) {
    rows.push({ kind: "header", dateKey: section.dateKey, title: section.title });
    for (let i = 0; i < section.items.length; i += 2) {
      rows.push({ kind: "cards", events: section.items.slice(i, i + 2) });
    }
  }
  return rows;
}

export function estimateEventSearchRowHeight(
  row: EventSearchVirtualRow,
  cardWidth: number,
): number {
  if (row.kind === "header") return 44;
  const imageH = Math.round(cardWidth / 2.05);
  return imageH + 96 + 12;
}
