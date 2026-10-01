/** Serialises defined, non-empty values into a `?key=value` query string. */
export function queryString(query: object = {}): string {
  const values = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') values.set(key, String(value));
  });
  const serialized = values.toString();
  return serialized ? `?${serialized}` : '';
}
