/**
 * Returns the string when it has content, otherwise `undefined`.
 * An empty string counts as absent, so `nonEmpty(value) ?? fallback` falls back on `""` too.
 */
export function nonEmpty<T extends string>(value: T | null | undefined): T | undefined {
  return value === null || value === undefined || value === "" ? undefined : value;
}

/** Returns the first value that is neither nullish nor an empty string. */
export function firstNonEmpty(...values: (string | null | undefined)[]): string | undefined {
  for (const value of values) {
    const found = nonEmpty(value);
    if (found !== undefined) {
      return found;
    }
  }
  return undefined;
}
