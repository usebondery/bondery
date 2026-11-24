/**
 * Helpers for text where an empty string means "not provided", the same as
 * `null` or `undefined`. `??` only falls back on `null` and `undefined`, so
 * these name the intent where an empty value must also fall back.
 */

type MaybeText = string | null | undefined;

/** Returns the text, or `null` when it is missing or empty. */
export function blankToNull(value: MaybeText): string | null {
  return value === undefined || value === null || value === "" ? null : value;
}

/** Returns the text, or `undefined` when it is missing or empty. */
export function blankToUndefined(value: MaybeText): string | undefined {
  return value === null || value === "" ? undefined : value;
}

/** Returns the text, or `fallback` when it is missing or empty. */
export function orIfBlank(value: MaybeText, fallback: string): string {
  return value === undefined || value === null || value === "" ? fallback : value;
}

/** Returns the first text that is not missing or empty, or `null` when there is none. */
export function firstNonBlank(...values: MaybeText[]): string | null {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return null;
}
