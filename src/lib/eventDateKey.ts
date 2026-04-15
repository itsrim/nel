/** Parse une clé `YYYY-MM-DD` en date locale (midi pour éviter les décalages fuseau). */
export function parseDateKeyLocal(dateKey: string): Date {
  const p = dateKey.split('-');
  return new Date(+p[0], +p[1] - 1, +p[2]);
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
