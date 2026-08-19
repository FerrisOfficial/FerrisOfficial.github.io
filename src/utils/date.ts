const MONTH_YEAR = new Intl.DateTimeFormat('en-GB', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const YEAR = new Intl.DateTimeFormat('en-GB', { year: 'numeric', timeZone: 'UTC' });

export function formatMonthYear(date: Date): string {
  return MONTH_YEAR.format(date);
}

export function formatYear(date: Date): string {
  return YEAR.format(date);
}

/**
 * Renders the date shown on an entry.
 *
 *   ongoing            → "Oct 2025 - Present"
 *   start + end        → "Oct 2025 - Apr 2026"
 *   start + end, same month → "Oct 2025"
 *   start only         → "Mar 2022"   (a point-in-time event, e.g. an award)
 */
export function formatRange(start: Date, end?: Date, ongoing = false): string {
  const from = formatMonthYear(start);
  if (ongoing) return `${from} - Present`;
  if (!end) return from;

  const to = formatMonthYear(end);
  return from === to ? from : `${from} - ${to}`;
}

/** Machine-readable value for the <time> element. */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
