import type { BadgeVariant } from '@rfdtech/components';

const dateFormatter = new Intl.DateTimeFormat('en-GH', { dateStyle: 'medium' });
const dateTimeFormatter = new Intl.DateTimeFormat('en-GH', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function formatDate(value?: string | number | Date | null): string {
  if (value === undefined || value === null || value === '') return 'Not set';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Not set' : dateFormatter.format(parsed);
}

export function formatDateTime(value?: string | number | Date | null): string {
  if (value === undefined || value === null || value === '') return 'Not set';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Not set' : dateTimeFormatter.format(parsed);
}

export function formatCount(value: number): string {
  return value.toLocaleString('en-GH');
}

/** `LEGAL_REVIEW` -> `legal review`. */
export function labelize(value: string): string {
  return value.toLowerCase().replaceAll('_', ' ');
}

/** `LEGAL_REVIEW` -> `Legal review`. */
export function titleCase(value: string): string {
  const label = labelize(value);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** `Ama Serwaa Boateng` -> `AB`. Used for avatar chips. */
export function initials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return `${first}${last}`.toUpperCase() || '?';
}

/** Percentage of `numerator` over `denominator`, to one decimal place. */
export function rate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Number(((numerator / denominator) * 100).toFixed(1));
}

/** Whole days from today until `value`; negative once the date has passed. */
export function daysUntil(value?: string | number | Date | null): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const startOfDay = (date: Date) =>
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((startOfDay(parsed) - startOfDay(new Date())) / 86_400_000);
}

const ERROR_STATUSES = new Set(['expired', 'overdue', 'terminated', 'failed', 'review required']);
const WARNING_STATUSES = new Set([
  'renewal due',
  'legal review',
  'pending',
  'screening pending',
  'at risk',
  'not started',
]);
const SUCCESS_STATUSES = new Set(['active', 'completed', 'cleared', 'healthy', 'signed']);

/**
 * Tone for a status string whose type isn't known at the call site. Typed
 * statuses should use their own badge (`PartnershipStatusBadge` and friends),
 * which maps every member of the union explicitly.
 */
export function statusVariant(status: string): BadgeVariant {
  const token = labelize(status);
  if (ERROR_STATUSES.has(token)) return 'error';
  if (WARNING_STATUSES.has(token)) return 'warning';
  if (SUCCESS_STATUSES.has(token)) return 'success';
  return 'default';
}
