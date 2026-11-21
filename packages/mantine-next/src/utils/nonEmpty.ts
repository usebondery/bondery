/**
 * Returns the string when it has content, otherwise `undefined`.
 * An empty string counts as absent, so `nonEmpty(value) ?? fallback` falls back on `""` too.
 */
export function nonEmpty<T extends string>(value: T | null | undefined): T | undefined {
  return value === null || value === undefined || value === "" ? undefined : value;
}
