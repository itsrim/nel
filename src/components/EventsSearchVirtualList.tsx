import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Event } from "../data/mockData";
import { EventCard } from "./EventCard";
import {
  EVENT_SEARCH_PAGE_SIZE,
  buildEventSearchSections,
  buildEventSearchVirtualRows,
  estimateEventSearchRowHeight,
} from "../lib/eventSearchListing";
import "./EventsSearchVirtualList.css";

type EventsSearchVirtualListProps = {
  events: Event[];
  scrollRef: React.RefObject<HTMLElement | null>;
  eventCardW: number;
  onOpenEvent: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  emptyMessage: string;
  loadingMoreLabel: string;
  listResetKey: string;
};

export function EventsSearchVirtualList({
  events,
  scrollRef,
  eventCardW,
  onOpenEvent,
  onToggleFavorite,
  emptyMessage,
  loadingMoreLabel,
  listResetKey,
}: EventsSearchVirtualListProps) {
  const [loadedCount, setLoadedCount] = useState(EVENT_SEARCH_PAGE_SIZE);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoadedCount(EVENT_SEARCH_PAGE_SIZE);
  }, [listResetKey]);

  const pagedEvents = useMemo(
    () => events.slice(0, loadedCount),
    [events, loadedCount],
  );

  const rows = useMemo(() => {
    const sections = buildEventSearchSections(pagedEvents);
    return buildEventSearchVirtualRows(sections);
  }, [pagedEvents]);

  const hasMore = loadedCount < events.length;

  useEffect(() => {
    const root = scrollRef.current;
    const sentinel = loadMoreSentinelRef.current;
    if (!root || !sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setLoadedCount((n) =>
            Math.min(n + EVENT_SEARCH_PAGE_SIZE, events.length),
          );
        }
      },
      { root, rootMargin: "480px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [scrollRef, hasMore, events.length, rows.length]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) =>
      estimateEventSearchRowHeight(rows[index], eventCardW),
    overscan: 4,
  });

  if (events.length === 0) {
    return <p className="events-empty">{emptyMessage}</p>;
  }

  const tailHeight = hasMore ? 72 : 0;
  const totalHeight = virtualizer.getTotalSize() + tailHeight;

  return (
    <div
      className="events-search-virtual"
      style={{ height: totalHeight }}
    >
      {virtualizer.getVirtualItems().map((virtualRow) => {
        const row = rows[virtualRow.index];
        return (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            className="events-search-virtual-row"
            style={{ transform: `translateY(${virtualRow.start}px)` }}
          >
            {row.kind === "header" ? (
              <div className="events-section-header">
                <span className="events-section-title">{row.title}</span>
              </div>
            ) : (
              <div className="events-section-cards">
                {row.events.map((e) => (
                  <div key={e.id} className="events-card-cell">
                    <EventCard
                      item={e}
                      onToggleFavorite={() => onToggleFavorite(e.id)}
                      width={eventCardW}
                      onClick={() => onOpenEvent(e.id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {hasMore && (
        <div
          ref={loadMoreSentinelRef}
          className="events-search-load-sentinel"
          style={{ transform: `translateY(${virtualizer.getTotalSize()}px)` }}
          aria-hidden
        />
      )}

      {hasMore && (
        <p
          className="events-search-loading-more"
          style={{ transform: `translateY(${virtualizer.getTotalSize() + 8}px)` }}
        >
          {loadingMoreLabel}
        </p>
      )}
    </div>
  );
}
