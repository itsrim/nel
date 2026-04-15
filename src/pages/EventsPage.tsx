import { useState, useMemo, useCallback } from 'react';
import { Calendar, Check, ChevronLeft, ChevronRight, Plus, Search, X } from 'lucide-react';
import { useMessagingStore } from '../store/useMessagingStore';
import { EventCard } from '../components/EventCard';
import type { Event } from '../data/mockData';
import './EventsPage.css';

/* ── Date helpers ── */
function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}
function addWeeks(d: Date, n: number): Date { return addDays(d, n * 7); }
function startOfWeekMonday(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = x.getDay();
  x.setDate(x.getDate() + (dow === 0 ? -6 : 1 - dow));
  return x;
}
function parseDateKeyLocal(dateKey: string): Date {
  const p = dateKey.split('-');
  return new Date(+p[0], +p[1] - 1, +p[2]);
}
function isDateKeyInWeek(dateKey: string, weekStart: Date): boolean {
  const d0 = toDateKey(weekStart);
  const d6 = toDateKey(addDays(weekStart, 6));
  return dateKey >= d0 && dateKey <= d6;
}
function formatWeekMonthTitle(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  if (weekStart.getMonth() === end.getMonth() && weekStart.getFullYear() === end.getFullYear()) {
    const t = weekStart.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  const a = weekStart.toLocaleDateString('fr-FR', { month: 'short' });
  const b = end.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
  return `${a} – ${b}`;
}
function foldSearch(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}
function eventMatchesSearch(e: Event, query: string): boolean {
  const q = foldSearch(query.trim());
  if (!q) return true;
  return foldSearch(`${e.title} ${e.location} ${e.notes ?? ''}`).includes(q);
}

type EventPairRow = { key: string; left: Event; right?: Event };

function chunkEventsIntoPairs(items: Event[]): EventPairRow[] {
  const rows: EventPairRow[] = [];
  for (let i = 0; i < items.length; i += 2) {
    const left = items[i];
    const right = items[i + 1];
    rows.push({ key: right ? `${left.id}-${right.id}` : left.id, left, right });
  }
  return rows;
}

const WEEK_LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const;
const INITIAL_WEEK_MONDAY = new Date(2026, 2, 23); // March 23, 2026

/* ── Calendar week strip ── */
function CalendarWeekStrip({ weekStart, selectedDateKey, onSelectDateKey }: {
  weekStart: Date; selectedDateKey: string; onSelectDateKey: (dk: string) => void;
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
            className={`cal-day-col ${sel ? 'cal-day-col--selected' : ''}`}
            onClick={() => onSelectDateKey(dk)}
          >
            <span className={`cal-letter ${sel ? 'cal-letter--sel' : ''}`}>{letter}</span>
            <span className={`cal-num ${sel ? 'cal-num--sel' : ''}`}>{d.getDate()}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ── Main ── */
export function EventsPage() {
  const { events, toggleEventFavorite } = useMessagingStore();
  const [weekStartMonday, setWeekStartMonday] = useState(() => new Date(INITIAL_WEEK_MONDAY));
  const [selectedDateKey, setSelectedDateKey] = useState(toDateKey(INITIAL_WEEK_MONDAY));
  const [headerMode, setHeaderMode] = useState<'calendar' | 'search'>('calendar');
  const [searchDraft, setSearchDraft] = useState('');
  const [committedSearch, setCommittedSearch] = useState('');

  const monthTitle = useMemo(() => formatWeekMonthTitle(weekStartMonday), [weekStartMonday]);

  const shiftWeek = useCallback((delta: number) => {
    setWeekStartMonday((w) => addWeeks(w, delta));
  }, []);

  const handleSelectDateKey = useCallback((dk: string) => {
    const mon = startOfWeekMonday(parseDateKeyLocal(dk));
    setWeekStartMonday((w) => (toDateKey(w) === toDateKey(mon) ? w : mon));
    setSelectedDateKey(dk);
  }, []);

  const weekEvents = useMemo(
    () => events.filter((e) => isDateKeyInWeek(e.dateKey, weekStartMonday)),
    [events, weekStartMonday],
  );

  const filteredWeekEvents = useMemo(() => {
    if (headerMode !== 'search') return weekEvents;
    return weekEvents.filter((e) => eventMatchesSearch(e, committedSearch));
  }, [weekEvents, headerMode, committedSearch]);

  const topWeekEvents = useMemo(
    () => [...weekEvents].sort((a, b) => (b.visitsCount ?? b.participantCount * 5) - (a.visitsCount ?? a.participantCount * 5)).slice(0, 5),
    [weekEvents],
  );

  const sections = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const e of filteredWeekEvents) {
      if (!map.has(e.sectionDateLabel)) map.set(e.sectionDateLabel, []);
      map.get(e.sectionDateLabel)!.push(e);
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[1][0]?.dateKey ?? '').localeCompare(b[1][0]?.dateKey ?? ''))
      .map(([title, items]) => ({
        title,
        data: chunkEventsIntoPairs([...items].sort((a, b) => a.timeShort.localeCompare(b.timeShort))),
      }));
  }, [filteredWeekEvents]);

  const applySearch = useCallback(() => {
    setCommittedSearch(searchDraft.trim());
  }, [searchDraft]);

  const clearSearch = useCallback(() => {
    setSearchDraft('');
    setCommittedSearch('');
  }, []);

  const colW = typeof window !== 'undefined' ? Math.floor((Math.min(window.innerWidth, 430) - 24 - 6) / 2) : 180;
  const topCardW = Math.min(280, Math.floor(colW * 1.5));

  return (
    <div className="events-page">
      {/* Calendar / Search header */}
      {headerMode === 'calendar' ? (
        <div className="cal-gradient">
          <div className="cal-top-row">
            <button className="cal-chevron cal-chevron--left" onClick={() => shiftWeek(-1)} aria-label="Semaine précédente">
              <ChevronLeft size={22} color="#fff" />
            </button>
            <div className="cal-center-cluster">
              <span className="cal-month">{monthTitle}</span>
              <button className="cal-search-btn" onClick={() => setHeaderMode('search')} aria-label="Rechercher">
                <Search size={22} color="#FFD60A" />
              </button>
            </div>
            <button className="cal-chevron cal-chevron--right" onClick={() => shiftWeek(1)} aria-label="Semaine suivante">
              <ChevronRight size={22} color="#fff" />
            </button>
          </div>
          <CalendarWeekStrip weekStart={weekStartMonday} selectedDateKey={selectedDateKey} onSelectDateKey={handleSelectDateKey} />
        </div>
      ) : (
        <div className="search-header-gradient">
          <div className="search-mode-top">
            <span className="search-mode-title">Recherche</span>
            <button className="search-mode-cal-btn" onClick={() => setHeaderMode('calendar')} aria-label="Calendrier">
              <Calendar size={24} color="#FFD60A" />
            </button>
          </div>
          <div className="events-search-row">
            <div className="events-search-bar">
              <Search size={20} color="rgba(255,255,255,0.6)" />
              <input
                className="events-search-input"
                placeholder="Rechercher une activité…"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applySearch()}
              />
              {(searchDraft.length > 0 || committedSearch.length > 0) && (
                <button className="events-search-clear" onClick={clearSearch} aria-label="Effacer">
                  <X size={18} color="rgba(255,255,255,0.55)" />
                </button>
              )}
              <button className="events-search-submit" onClick={applySearch} aria-label="Valider">
                <Check size={20} color="#7EB8FF" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Events content */}
      <div className="events-content">
        {/* Top 5 (search mode) */}
        {headerMode === 'search' && topWeekEvents.length > 0 && (
          <div className="events-top5">
            <h3 className="events-top5-title">Top 5 de la semaine</h3>
            <div className="events-top5-scroll">
              {topWeekEvents.map((e) => (
                <div key={e.id} style={{ width: topCardW, flexShrink: 0, marginRight: 12 }}>
                  <EventCard item={e} onToggleFavorite={() => toggleEventFavorite(e.id)} width={topCardW} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sections */}
        {sections.length === 0 ? (
          <p className="events-empty">
            {weekEvents.length === 0
              ? 'Aucun événement sur cette semaine.'
              : 'Aucune activité ne correspond à votre recherche.'}
          </p>
        ) : (
          sections.map((section) => (
            <div key={section.title}>
              <div className="events-section-header">
                <span className="events-section-title">{section.title}</span>
              </div>
              {section.data.map((row) => (
                <div key={row.key} className="events-grid-row">
                  <div style={{ width: colW }}>
                    <EventCard item={row.left} onToggleFavorite={() => toggleEventFavorite(row.left.id)} width={colW} />
                  </div>
                  {row.right ? (
                    <div style={{ width: colW }}>
                      <EventCard item={row.right} onToggleFavorite={() => toggleEventFavorite(row.right!.id)} width={colW} />
                    </div>
                  ) : (
                    <div style={{ width: colW }} />
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* FAB */}
      <button className="events-fab" aria-label="Créer un événement">
        <Plus size={30} color="#000" />
      </button>
    </div>
  );
}
