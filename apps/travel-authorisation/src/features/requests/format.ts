/**
 * The API returns full ISO timestamps; the seeded mock data carries plain
 * `YYYY-MM-DD` dates. Both reach the same screens, so formatting happens here
 * rather than at each call site.
 */
const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatTimestamp(value?: string | null): string {
  if (!value) return 'Not recorded';
  // Seeded mock labels such as "22 Sep, 09:14" are already display text.
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  // A bare date carries no time to show.
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  return (dateOnly ? dateFormatter : dateTimeFormatter).format(parsed);
}
