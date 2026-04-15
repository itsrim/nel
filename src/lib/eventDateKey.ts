/** Parse une clé `YYYY-MM-DD` en date locale (midi pour éviter les décalages fuseau). */
export function parseDateKeyLocal(dateKey: string): Date {
  const p = dateKey.split('-');
  return new Date(+p[0], +p[1] - 1, +p[2]);
}

/** Vrai si le jour de l’événement (calendrier local) est strictement avant aujourd’hui. */
export function isEventDateBeforeToday(dateKey: string): boolean {
  const d = parseDateKeyLocal(dateKey);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eventStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return eventStart < todayStart;
}

/** Libellé de section agenda unifié (un jour = une ligne, quel que soit `sectionDateLabel` en base). */
export function formatEventSectionTitle(dateKey: string): string {
  const d = parseDateKeyLocal(dateKey);
  const raw = d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}
