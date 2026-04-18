import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useNavigationStore } from "../store/useNavigationStore";
import { useMessagingStore } from "../store/useMessagingStore";
import { useTranslation } from "../i18n/useTranslation";
import { EventCard } from "../components/EventCard";
import type { Event } from "../data/mockData";
import { EVENT_THEME_TAG_OPTIONS } from "../constants/defaultEventCoverThemes";
import {
  formatEventSectionTitle,
  parseDateKeyLocal,
} from "../lib/eventDateKey";
import { eventIsVisibleInDiscovery } from "../lib/eventVisibility";
import "./EventsPage.css";

/* ── Date helpers ── */
function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}
function addWeeks(d: Date, n: number): Date {
  return addDays(d, n * 7);
}
function startOfWeekMonday(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = x.getDay();
  x.setDate(x.getDate() + (dow === 0 ? -6 : 1 - dow));
  return x;
}
function isDateKeyInWeek(dateKey: string, weekStart: Date): boolean {
  const d0 = toDateKey(weekStart);
  const d6 = toDateKey(addDays(weekStart, 6));
  return dateKey >= d0 && dateKey <= d6;
}
function formatWeekMonthTitle(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  if (
    weekStart.getMonth() === end.getMonth() &&
    weekStart.getFullYear() === end.getFullYear()
  ) {
    const t = weekStart.toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    });
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  const a = weekStart.toLocaleDateString("fr-FR", { month: "short" });
  const b = end.toLocaleDateString("fr-FR", {
    month: "short",
    year: "numeric",
  });
  return `${a} – ${b}`;
}
function foldSearch(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}
function eventMatchesSearch(e: Event, query: string): boolean {
  const q = foldSearch(query.trim());
  if (!q) return true;
  return foldSearch(`${e.title} ${e.location} ${e.notes ?? ""}`).includes(q);
}

/** Clé du jour local (min sur `<input type="date">`, comparaisons). */
function todayDateKey(): string {
  return toDateKey(new Date());
}

/** Filtre « à partir du » : `e.dateKey >= fromKey` ; vide = pas de filtre date. */
function eventMatchesFilterDate(e: Event, fromDateKey: string): boolean {
  const d = fromDateKey.trim();
  if (!d) return true;
  return e.dateKey >= d;
}

function eventMatchesFilterLocation(e: Event, q: string): boolean {
  const t = foldSearch(q.trim());
  if (!t) return true;
  return foldSearch(e.location).includes(t);
}

function eventMatchesFilterTag(e: Event, raw: string): boolean {
  let t = raw.trim();
  if (t.startsWith("#")) t = t.slice(1);
  const f = foldSearch(t);
  if (!f) return true;
  const hay = foldSearch(`${e.category} ${e.title} ${e.notes ?? ""}`);
  return hay.includes(f);
}

const EVENTS_LAYOUT_NARROW_PX = 640;
const EVENTS_CARD_GAP = 12;
const EVENTS_CARD_PAD = 24;
const EVENTS_MIN_CARD_W = 168;

const WEEK_LETTERS = ["L", "M", "M", "J", "V", "S", "D"] as const;

/* ── Calendar week strip ── */
function CalendarWeekStrip({
  weekStart,
  selectedDateKey,
  onSelectDateKey,
}: {
  weekStart: Date;
  selectedDateKey: string;
  onSelectDateKey: (dk: string) => void;
}) {
  return (
    <div className="cal-week-row">
      {WEEK_LETTERS.map((letter, i) => {
        const d = addDays(weekStart, i);
        const dk = toDateKey(d);
        const sel = dk === selectedDateKey;
        return (
          <button
            key={dk}
            className={`cal-day-col ${sel ? "cal-day-col--selected" : ""}`}
            onClick={() => onSelectDateKey(dk)}
          >
            <span className={`cal-letter ${sel ? "cal-letter--sel" : ""}`}>
              {letter}
            </span>
            <span className={`cal-num ${sel ? "cal-num--sel" : ""}`}>
              {d.getDate()}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ── Main ── */
export function EventsPage() {
  const openDetail = useNavigationStore((s) => s.openDetail);
  const headerMode = useNavigationStore((s) => s.eventsHeaderMode);
  const setEventsHeaderMode = useNavigationStore((s) => s.setEventsHeaderMode);
  const {
    events,
    toggleEventFavorite,
    nelDemoIsAdmin,
    moderationHiddenEventIds,
    viewerProfileDisplayName,
  } = useMessagingStore();
  const { t } = useTranslation();
  const [viewportW, setViewportW] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : EVENTS_LAYOUT_NARROW_PX,
  );

  useEffect(() => {
    const onResize = () => setViewportW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /** Semaine courante : les nouvelles sorties (date du jour) restent visibles après création. */
  const [weekStartMonday, setWeekStartMonday] = useState(() =>
    startOfWeekMonday(new Date()),
  );
  const [selectedDateKey, setSelectedDateKey] = useState(() =>
    toDateKey(new Date()),
  );
  const [searchDraft, setSearchDraft] = useState("");
  const [committedSearch, setCommittedSearch] = useState("");
  const [searchFilterPanelOpen, setSearchFilterPanelOpen] = useState(false);
  const [filterDate, setFilterDate] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterTag, setFilterTag] = useState("");

  const monthTitle = useMemo(
    () => formatWeekMonthTitle(weekStartMonday),
    [weekStartMonday],
  );

  const shiftWeek = useCallback((delta: number) => {
    setWeekStartMonday((w) => addWeeks(w, delta));
  }, []);

  const handleSelectDateKey = useCallback((dk: string) => {
    const mon = startOfWeekMonday(parseDateKeyLocal(dk));
    setWeekStartMonday((w) => (toDateKey(w) === toDateKey(mon) ? w : mon));
    setSelectedDateKey(dk);
  }, []);

  const weekEvents = useMemo(
    () =>
      events.filter(
        (e) =>
          isDateKeyInWeek(e.dateKey, weekStartMonday) &&
          eventIsVisibleInDiscovery(
            e,
            nelDemoIsAdmin,
            moderationHiddenEventIds,
            viewerProfileDisplayName,
          ),
      ),
    [
      events,
      weekStartMonday,
      nelDemoIsAdmin,
      moderationHiddenEventIds,
      viewerProfileDisplayName,
    ],
  );

  const filteredWeekEvents = useMemo(() => {
    if (headerMode !== "search") return weekEvents;
    return weekEvents.filter(
      (e) =>
        eventMatchesSearch(e, committedSearch) &&
        eventMatchesFilterDate(e, filterDate) &&
        eventMatchesFilterLocation(e, filterLocation) &&
        eventMatchesFilterTag(e, filterTag),
    );
  }, [
    weekEvents,
    headerMode,
    committedSearch,
    filterDate,
    filterLocation,
    filterTag,
  ]);

  const topWeekEvents = useMemo(
    () =>
      [...weekEvents]
        .sort(
          (a, b) =>
            (b.visitsCount ?? b.participantCount * 5) -
            (a.visitsCount ?? a.participantCount * 5),
        )
        .slice(0, 5),
    [weekEvents],
  );

  const sections = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const e of filteredWeekEvents) {
      if (!map.has(e.dateKey)) map.set(e.dateKey, []);
      map.get(e.dateKey)!.push(e);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dateKey, items]) => ({
        dateKey,
        title: formatEventSectionTitle(dateKey),
        items: [...items].sort((a, b) =>
          a.timeShort.localeCompare(b.timeShort),
        ),
      }));
  }, [filteredWeekEvents]);

  const isNarrowLayout = viewportW < EVENTS_LAYOUT_NARROW_PX;

  /**
   * Mobile (<640px) : grille 2 colonnes fixes (padding 12 + gap 12 + padding 12).
   * Desktop : même grille 2 colonnes, cartes (et images) beaucoup plus larges.
   */
  const { eventCardW, topCardW } = useMemo(() => {
    const w = viewportW;
    const avail = w - EVENTS_CARD_PAD;
    if (w < EVENTS_LAYOUT_NARROW_PX) {
      const cardW = Math.max(120, Math.floor((w - 36) / 2));
      return {
        eventCardW: cardW,
        topCardW: Math.min(280, Math.floor(cardW * 1.5)),
      };
    }
    const desktopCols = 2;
    const cardW = Math.floor(
      (avail - (desktopCols - 1) * EVENTS_CARD_GAP) / desktopCols,
    );
    const eventCardW = Math.max(EVENTS_MIN_CARD_W, cardW);
    const topCardW = Math.min(
      420,
      Math.max(260, Math.floor(eventCardW * 1.12)),
    );
    return { eventCardW, topCardW };
  }, [viewportW]);

  const applySearch = useCallback(() => {
    setCommittedSearch(searchDraft.trim());
  }, [searchDraft]);

  const clearSearch = useCallback(() => {
    setSearchDraft("");
    setCommittedSearch("");
    setFilterDate("");
    setFilterLocation("");
    setFilterTag("");
    setSearchFilterPanelOpen(false);
  }, []);

  const filterChipsActive = Boolean(
    filterDate || filterLocation.trim() || filterTag.trim(),
  );

  useEffect(() => {
    if (headerMode !== "calendar") return;
    setSearchDraft("");
    setCommittedSearch("");
    setFilterDate("");
    setFilterLocation("");
    setFilterTag("");
    setSearchFilterPanelOpen(false);
  }, [headerMode]);

  useEffect(() => {
    if (nelDemoIsAdmin) return;
    const t = todayDateKey();
    setFilterDate((fd) => (fd && fd < t ? t : fd));
  }, [nelDemoIsAdmin]);

  return (
    <div
      className={`events-page${isNarrowLayout ? " events-page--narrow" : " events-page--wide-grid"}`}
    >
      {/* Calendar / Search header */}
      {headerMode === "calendar" ? (
        <div className="cal-gradient">
          <div className="cal-top-row">
            <button
              className="cal-chevron cal-chevron--left"
              onClick={() => shiftWeek(-1)}
              aria-label={t("previousWeek")}
            >
              <ChevronLeft size={22} color="#fff" />
            </button>
            <div className="cal-center-cluster">
              <span className="cal-month">{monthTitle}</span>
              <button
                className="cal-search-btn"
                onClick={() => setEventsHeaderMode("search")}
                aria-label={t("searchAriaLabel")}
              >
                <Search size={22} color="#FFD60A" />
              </button>
            </div>
            <button
              className="cal-chevron cal-chevron--right"
              onClick={() => shiftWeek(1)}
              aria-label={t("nextWeek")}
            >
              <ChevronRight size={22} color="#fff" />
            </button>
          </div>
          <CalendarWeekStrip
            weekStart={weekStartMonday}
            selectedDateKey={selectedDateKey}
            onSelectDateKey={handleSelectDateKey}
          />
        </div>
      ) : (
        <div className="search-header-gradient">
          <div className="search-mode-top">
            <span className="search-mode-title">{t("searchEvents")}</span>
            <button
              type="button"
              className="search-mode-cal-btn"
              onClick={() => {
                setSearchFilterPanelOpen(false);
                setEventsHeaderMode("calendar");
              }}
              aria-label={t("calendarAriaLabel")}
            >
              <Calendar size={24} color="#FFD60A" />
            </button>
          </div>
          <div className="events-search-row">
            <div
              className={`events-search-toolbar${searchFilterPanelOpen ? " events-search-toolbar--filters" : ""}`}
            >
              {!searchFilterPanelOpen ? (
                <div className="events-search-bar events-search-bar--grow">
                  <Search size={20} color="rgba(255,255,255,0.6)" />
                  <input
                    className="events-search-input"
                    placeholder={t("searchActivity")}
                    value={searchDraft}
                    onChange={(e) => setSearchDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && applySearch()}
                  />
                  {(searchDraft.length > 0 ||
                    committedSearch.length > 0 ||
                    filterChipsActive) && (
                    <button
                      type="button"
                      className="events-search-clear"
                      onClick={clearSearch}
                      aria-label={t("clearSearch")}
                    >
                      <X size={18} color="rgba(255,255,255,0.55)" />
                    </button>
                  )}
                  <button
                    type="button"
                    className="events-search-submit"
                    onClick={applySearch}
                    aria-label={t("validateSearch")}
                  >
                    <Check size={20} color="#7EB8FF" />
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    className="events-search-loupe-only"
                    onClick={() => setSearchFilterPanelOpen(false)}
                    aria-label="Retour à la recherche texte"
                  >
                    <Search size={22} color="#FFD60A" />
                  </button>
                  <input
                    type="date"
                    className="events-filter-field events-filter-field--date"
                    value={filterDate}
                    min={nelDemoIsAdmin ? undefined : todayDateKey()}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v && !nelDemoIsAdmin && v < todayDateKey()) {
                        setFilterDate(todayDateKey());
                        return;
                      }
                      setFilterDate(v);
                    }}
                    aria-label="Filtrer par date (à partir de cette date)"
                  />
                  <input
                    type="text"
                    className="events-filter-field events-filter-field--grow"
                    placeholder="Lieu"
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                    aria-label="Filtrer par lieu"
                  />
                  <select
                    className="events-filter-field events-filter-field--grow events-filter-select"
                    value={filterTag}
                    onChange={(e) => setFilterTag(e.target.value)}
                    aria-label="Filtrer par thème (même liste que les couvertures)"
                  >
                    <option value="">Thème / tag…</option>
                    {EVENT_THEME_TAG_OPTIONS.map((tag) => (
                      <option key={tag} value={tag}>
                        #{tag}
                      </option>
                    ))}
                  </select>
                </>
              )}
              <button
                type="button"
                className={`events-filter-toggle${searchFilterPanelOpen || filterChipsActive ? " events-filter-toggle--active" : ""}`}
                onClick={() => setSearchFilterPanelOpen((o) => !o)}
                aria-expanded={searchFilterPanelOpen}
                aria-label={t("filtersAriaLabel")}
              >
                <ListFilter
                  size={22}
                  color={
                    searchFilterPanelOpen || filterChipsActive
                      ? "#FFD60A"
                      : "#fff"
                  }
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Events content */}
      <div className="events-content">
        {/* Top 5 (search mode) */}
        {headerMode === "search" && topWeekEvents.length > 0 && (
          <div className="events-top5">
            <h3 className="events-top5-title">{t("topWeeklyEvents")}</h3>
            <div className="events-top5-scroll">
              {topWeekEvents.map((e) => (
                <div
                  key={e.id}
                  style={{ width: topCardW, flexShrink: 0, marginRight: 12 }}
                >
                  <EventCard
                    item={e}
                    onToggleFavorite={() => toggleEventFavorite(e.id)}
                    width={topCardW}
                    onClick={() => openDetail("event", e.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sections */}
        {sections.length === 0 ? (
          <p className="events-empty">
            {weekEvents.length === 0
              ? t("noEventsThisWeek")
              : "Aucune activité ne correspond à votre recherche."}
          </p>
        ) : (
          sections.map((section) => (
            <div key={section.dateKey}>
              <div className="events-section-header">
                <span className="events-section-title">{section.title}</span>
              </div>
              <div className="events-section-cards">
                {section.items.map((e) => (
                  <div key={e.id} className="events-card-cell">
                    <EventCard
                      item={e}
                      onToggleFavorite={() => toggleEventFavorite(e.id)}
                      width={eventCardW}
                      onClick={() => openDetail("event", e.id)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* FAB — même flux que meetabit : /event/create */}
      <button
        type="button"
        className="events-fab"
        aria-label="Créer un événement"
        onClick={() => openDetail("event_create", "new")}
      >
        <Plus size={30} color="#000" />
      </button>
    </div>
  );
}
