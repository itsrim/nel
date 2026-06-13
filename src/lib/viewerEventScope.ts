import type { Event } from "../data/mockData";
import { eventHostedByViewer, type ViewerContext } from "./eventHost";

/** Sortie créée / organisée par le profil connecté. */
export function eventOrganizedByViewer(
  event: Event,
  viewer?: ViewerContext | null,
): boolean {
  return eventHostedByViewer(event, viewer);
}

export function enrichEventsForViewer(
  events: Event[],
  viewer?: ViewerContext | null,
): Event[] {
  if (!viewer?.id) return events;
  return events.map((event) => {
    const organized = eventHostedByViewer(event, viewer);
    return organized === event.hostedByViewer ? event : { ...event, hostedByViewer: organized };
  });
}
