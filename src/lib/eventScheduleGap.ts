import type { Event } from "../data/mockData";
import { eventHostedByViewer } from "./eventHost";

/** Écart minimum entre deux sorties organisées par le même compte (hors admin). */
export const EVENT_SCHEDULE_MIN_GAP_MS = 60 * 60 * 1000;

function eventStartMs(ev: Event): number | null {
  const p = ev.dateKey.split("-").map((x) => parseInt(x, 10));
  const y = p[0];
  const mo = p[1];
  const da = p[2];
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(da)) {
    return null;
  }
  const time = ev.timeShort || "12:00";
  const [hh, mm] = time.split(":").map((x) => parseInt(x, 10));
  return new Date(
    y,
    mo - 1,
    da,
    Number.isFinite(hh) ? hh : 12,
    Number.isFinite(mm) ? mm : 0,
    0,
    0,
  ).getTime();
}

/**
 * Vrai si `candidateStart` est à moins d’1 h d’une autre sortie
 * dont le viewer est organisateur (hors `excludeEventId`).
 */
export function hasEventScheduleGapConflict(options: {
  candidateStart: Date;
  events: readonly Event[];
  viewerId?: string | null;
  viewerDisplayName?: string | null;
  excludeEventId?: string | null;
  minGapMs?: number;
}): boolean {
  const {
    candidateStart,
    events,
    viewerId,
    viewerDisplayName,
    excludeEventId,
    minGapMs = EVENT_SCHEDULE_MIN_GAP_MS,
  } = options;
  const candidateMs = candidateStart.getTime();
  if (!Number.isFinite(candidateMs)) return false;

  const viewer = viewerId
    ? { id: viewerId, displayName: viewerDisplayName ?? undefined }
    : null;

  for (const ev of events) {
    if (excludeEventId && ev.id === excludeEventId) continue;
    if (!eventHostedByViewer(ev, viewer)) continue;
    const otherMs = eventStartMs(ev);
    if (otherMs == null) continue;
    if (Math.abs(otherMs - candidateMs) < minGapMs) return true;
  }
  return false;
}
