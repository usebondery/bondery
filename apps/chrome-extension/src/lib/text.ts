/** Returns the value, or `undefined` when it is nullish or an empty string. */
export function nonEmpty(value: string | null | undefined): string | undefined {
  return value === undefined || value === null || value === "" ? undefined : value;
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
