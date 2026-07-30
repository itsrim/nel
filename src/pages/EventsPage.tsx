import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  Loader2,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useNavigationStore } from "../store/useNavigationStore";
import { useMessagingStore } from "../store/useMessagingStore";
import { useTranslation } from "../i18n/useTranslation";
import { EventCard } from "../components/EventCard";
import { EventsSearchVirtualList } from "../components/EventsSearchVirtualList";
import { HScrollRail } from "../components/HScrollRail";
import type { Event } from "../data/mockData";
import {
  EVENT_THEME_TAG_OPTIONS,
  eventThemeChipStyle,
} from "../constants/defaultEventCoverThemes";
import {
  formatEventSectionTitle,
  parseDateKeyLocal,
} from "../lib/eventDateKey";
import { eventIsVisibleInDiscovery } from "../lib/eventVisibility";
import {
  filterUpcomingSearchEvents,
  pickTopUpcomingEvents,
} from "../lib/eventSearchListing";
import {
  defaultEventsLocationFilter,
  EVENT_NEARBY_RADIUS_KM,
  filterAndSortEventsByDistance,
  resolveLocationCoords,
  type LatLng,
} from "../lib/eventLocationDistance";
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

/** Clé du jour local (min sur `<input type="date">`, comparaisons). */
function todayDateKey(): string {
  return toDateKey(new Date());
}

const EVENTS_LAYOUT_NARROW_PX = 640;
const EVENTS_CARD_GAP = 12;
const EVENTS_CARD_PAD = 24;
const EVENTS_MIN_CARD_W = 168;
const LS_EVENTS_FILTER_LOCATION = "nel_events_filter_location";

function readStoredEventsLocationFilter(): string | null {
  try {
    return localStorage.getItem(LS_EVENTS_FILTER_LOCATION);
  } catch {
    return null;
  }
}

function writeStoredEventsLocationFilter(value: string): void {
  try {
    localStorage.setItem(LS_EVENTS_FILTER_LOCATION, value);
  } catch {
    /* ignore quota */
  }
}

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
    isAdmin,
    moderationHiddenEventIds,
    viewerProfileDisplayName,
    viewerProfileCity,
    eventsLoading,
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
  const profileLocationDefault = defaultEventsLocationFilter(viewerProfileCity);
  const [locationTouched, setLocationTouched] = useState(
    () => readStoredEventsLocationFilter() !== null,
  );
  const [filterLocation, setFilterLocation] = useState(() => {
    const stored = readStoredEventsLocationFilter();
    if (stored !== null) return stored;
    return defaultEventsLocationFilter(
      useMessagingStore.getState().viewerProfileCity,
    );
  });
  const [filterTag, setFilterTag] = useState("");
  const [locationAnchor, setLocationAnchor] = useState<LatLng | null>(null);
  const [coordsByEventId, setCoordsByEventId] = useState<
    Record<string, LatLng | null>
  >({});
  const [geoReady, setGeoReady] = useState(false);
  const eventsContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    writeStoredEventsLocationFilter(filterLocation);
  }, [filterLocation]);

  useEffect(() => {
    if (locationTouched) return;
    setFilterLocation(profileLocationDefault);
  }, [profileLocationDefault, locationTouched]);

  useEffect(() => {
    let cancelled = false;
    const label = filterLocation.trim();
    if (!label) {
      setLocationAnchor(null);
      setGeoReady(true);
      return;
    }
    setGeoReady(false);
    void resolveLocationCoords(label).then((coords) => {
      if (cancelled) return;
      setLocationAnchor(coords);
      setGeoReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [filterLocation]);

  useEffect(() => {
    if (headerMode !== "search") return;
    let cancelled = false;
    const locations = [
      ...new Set(
        events.map((e) => e.location.trim()).filter((loc) => loc.length > 0),
      ),
    ];
    void (async () => {
      const next: Record<string, LatLng | null> = {};
      const byLocation = new Map<string, LatLng | null>();
      for (const loc of locations) {
        byLocation.set(loc, await resolveLocationCoords(loc));
      }
      if (cancelled) return;
      for (const e of events) {
        const loc = e.location.trim();
        next[e.id] = loc ? (byLocation.get(loc) ?? null) : null;
      }
      setCoordsByEventId(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [events, headerMode]);

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
            isAdmin,
            moderationHiddenEventIds,
            viewerProfileDisplayName,
          ),
      ),
    [
      events,
      weekStartMonday,
      isAdmin,
      moderationHiddenEventIds,
      viewerProfileDisplayName,
    ],
  );

  const searchFromDateKey = useMemo(() => {
    const today = todayDateKey();
    const picked = filterDate.trim();
    if (!picked) return today;
    if (!isAdmin && picked < today) return today;
    return picked;
  }, [filterDate, isAdmin]);

  const allSearchEvents = useMemo(() => {
    if (headerMode !== "search") return [];
    const base = filterUpcomingSearchEvents(
      events,
      {
        fromDateKey: searchFromDateKey,
        searchQuery: committedSearch,
        // Le filtre lieu est géo (rayon 50 km), pas un includes texte.
        locationQuery: "",
        tagQuery: filterTag,
      },
      {
        isAdmin,
        moderationHiddenEventIds,
        viewerProfileDisplayName,
      },
    );
    // Champ lieu vide → toutes les sorties (sans rayon).
    if (!filterLocation.trim()) return base;
    if (!geoReady || !locationAnchor) return [];
    return filterAndSortEventsByDistance(
      base,
      locationAnchor,
      coordsByEventId,
      EVENT_NEARBY_RADIUS_KM,
    ).map((row) => row.event);
  }, [
    headerMode,
    events,
    searchFromDateKey,
    committedSearch,
    filterTag,
    filterLocation,
    isAdmin,
    moderationHiddenEventIds,
    viewerProfileDisplayName,
    geoReady,
    locationAnchor,
    coordsByEventId,
  ]);

  const topSearchEvents = useMemo(
    () => pickTopUpcomingEvents(allSearchEvents, 5),
    [allSearchEvents],
  );

  const sections = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const e of weekEvents) {
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
  }, [weekEvents]);

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
    setLocationTouched(false);
    setFilterLocation(defaultEventsLocationFilter(viewerProfileCity));
    setFilterTag("");
    setSearchFilterPanelOpen(false);
  }, [viewerProfileCity]);

  const searchListResetKey = useMemo(
    () =>
      `${searchFromDateKey}|${committedSearch}|${filterLocation}|${filterTag}|${locationAnchor?.lat ?? ""}|${locationAnchor?.lng ?? ""}`,
    [
      searchFromDateKey,
      committedSearch,
      filterLocation,
      filterTag,
      locationAnchor?.lat,
      locationAnchor?.lng,
    ],
  );

  const filterChipsActive = Boolean(filterDate || filterLocation.trim());

  useEffect(() => {
    if (headerMode !== "calendar") return;
    setSearchDraft("");
    setCommittedSearch("");
    setFilterDate("");
    setFilterTag("");
    setSearchFilterPanelOpen(false);
  }, [headerMode]);

  useEffect(() => {
    if (isAdmin) return;
    const t = todayDateKey();
    setFilterDate((fd) => (fd && fd < t ? t : fd));
  }, [isAdmin]);

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
              <ChevronLeft size={22} color="#7a3428" />
            </button>
            <span className="cal-month">{monthTitle}</span>
            <div className="cal-top-row-right">
              <button
                type="button"
                className="events-header-icon-btn"
                onClick={() => setEventsHeaderMode("search")}
                aria-label={t("searchAriaLabel")}
              >
                <Search size={24} color="#000" />
              </button>
              <button
                className="cal-chevron cal-chevron--right"
                onClick={() => shiftWeek(1)}
                aria-label={t("nextWeek")}
              >
                <ChevronRight size={22} color="#7a3428" />
              </button>
            </div>
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
              className="events-header-icon-btn"
              onClick={() => {
                setSearchFilterPanelOpen(false);
                setEventsHeaderMode("calendar");
              }}
              aria-label={t("calendarAriaLabel")}
            >
              <Calendar size={24} color="#000" />
            </button>
          </div>
          <div className="events-search-row">
            <div
              className={`events-search-toolbar${searchFilterPanelOpen ? " events-search-toolbar--filters" : ""}`}
            >
              {!searchFilterPanelOpen ? (
                <div className="events-search-bar events-search-bar--grow">
                  <Search size={20} color="#000" />
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
                    <Search size={22} color="#7a3428" />
                  </button>
                  <input
                    type="date"
                    className="events-filter-field events-filter-field--date"
                    value={filterDate}
                    min={isAdmin ? undefined : todayDateKey()}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v && !isAdmin && v < todayDateKey()) {
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
                    onChange={(e) => {
                      setLocationTouched(true);
                      setFilterLocation(e.target.value);
                    }}
                    aria-label="Filtrer par lieu"
                  />
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
                      ? "#7a3428"
                      : "#000"
                  }
                />
              </button>
            </div>
          </div>
          <HScrollRail
            className="events-theme-filters-rail"
            scrollClassName="events-theme-filters"
            fadeTone="peach"
            role="listbox"
            aria-label={t("themeFilterAriaLabel")}
          >
            <button
              type="button"
              role="option"
              aria-selected={!filterTag.trim()}
              className={`events-theme-chip events-theme-chip--all${!filterTag.trim() ? " events-theme-chip--active" : ""}`}
              onClick={() => setFilterTag("")}
            >
              {t("proFilterAll")}
            </button>
            {EVENT_THEME_TAG_OPTIONS.map((tag) => {
              const active = filterTag === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`events-theme-chip${active ? " events-theme-chip--active" : ""}`}
                  style={eventThemeChipStyle(tag, active)}
                  onClick={() => setFilterTag((prev) => (prev === tag ? "" : tag))}
                >
                  #{tag}
                </button>
              );
            })}
          </HScrollRail>
        </div>
      )}

      {/* Events content */}
      <div className="events-content" ref={eventsContentRef}>
        {eventsLoading && !((headerMode === "search" && allSearchEvents.length === 0) || (headerMode !== "search" && sections.length === 0)) && (
          <div className="events-refresh-bar">
            <Loader2 size={16} className="events-spinner" />
            <span>{t("loading")}</span>
          </div>
        )}

        {/* Top 5 (search mode) */}
        {headerMode === "search" && topSearchEvents.length > 0 && (
          <div className="events-top5">
            <h3 className="events-top5-title">{t("topWeeklyEvents")}</h3>
            <div className="events-top5-scroll">
              {topSearchEvents.map((e) => (
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

        {eventsLoading && (
          (headerMode === "search" && allSearchEvents.length === 0) ||
          (headerMode !== "search" && sections.length === 0)
        ) ? (
          <div className="events-loading-container">
            <Loader2 size={36} className="events-spinner" />
            <p className="events-loading-text">{t("loading")}</p>
          </div>
        ) : headerMode === "search" ? (
          <EventsSearchVirtualList
            events={allSearchEvents}
            scrollRef={eventsContentRef}
            eventCardW={eventCardW}
            onOpenEvent={(id) => openDetail("event", id)}
            onToggleFavorite={toggleEventFavorite}
            emptyMessage={
              filterLocation.trim()
                ? geoReady
                  ? t("noNearbyEvents")
                  : t("loading")
                : t("noSearchResults")
            }
            loadingMoreLabel={t("eventsSearchLoadingMore")}
            listResetKey={searchListResetKey}
            flatSectionTitle={
              filterLocation.trim()
                ? t("eventsNearbySection").replace(
                    "{km}",
                    String(EVENT_NEARBY_RADIUS_KM),
                  )
                : undefined
            }
          />
        ) : sections.length === 0 ? (
          <p className="events-empty">{t("noEventsThisWeek")}</p>
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
