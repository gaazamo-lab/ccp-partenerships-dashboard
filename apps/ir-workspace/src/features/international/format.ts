/** Date helpers that keep an engagement's own time zone in view (SRS §6). */

export function formatInZone(value: string | null | undefined, timeZone: string): string {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';
  try {
    return new Intl.DateTimeFormat('en-GH', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: timeZone || undefined,
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-GH', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }
}

export function formatRange(startAt: string, endAt: string, timeZone: string): string {
  if (!startAt) return 'Dates not set';
  const zone = timeZone ? ` (${timeZone.replace('_', ' ')})` : '';
  return `${formatInZone(startAt, timeZone)} – ${formatInZone(endAt, timeZone)}${zone}`;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** ISO → `YYYY-MM-DDTHH:mm` in the browser's local time, for datetime-local inputs. */
export function toLocalInput(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** datetime-local value → ISO, or empty when blank. */
export function fromLocalInput(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

/** A calendar-day key in local time, e.g. `2026-10-05`. */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatMoney(value: number | null, currency: string | null): string {
  if (value === null || !currency) return 'Value unknown';
  try {
    return new Intl.NumberFormat('en-GH', { style: 'currency', currency }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString('en-GH')}`;
  }
}
