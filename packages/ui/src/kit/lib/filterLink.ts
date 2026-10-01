/**
 * The prefix `useTableState` puts on every filter param. A `DataTable` with
 * `paramPrefix="partnerships"` reads its `status` filter from
 * `?partnerships.f_status=ACTIVE`.
 */
const FILTER_PARAM_PREFIX = 'f_';

/**
 * A link to a list page with `DataTable` filters already applied.
 *
 * KPI tiles and dashboard shortcuts use this so a headline number leads
 * straight to the rows behind it. Building the query string by hand works
 * until someone renames a filter key, at which point the link silently stops
 * filtering and quietly shows the whole list instead.
 */
export function filterLink(
  path: string,
  paramPrefix: string,
  filters: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (!value) continue;
    params.set(`${paramPrefix}.${FILTER_PARAM_PREFIX}${key}`, value);
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}
