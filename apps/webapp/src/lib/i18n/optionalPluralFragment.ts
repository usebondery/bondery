type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

/**
 * Returns a pluralized translation fragment when count > 0, otherwise an empty string.
 * Use as an interpolation value (e.g. `{skippedDetails}`) inside a parent sentence key.
 */
export function optionalPluralFragment(
  t: TranslateFn,
  key: string,
  count: number,
  extra?: Record<string, unknown>,
): string {
  if (count <= 0) {
    return "";
  }

  return t(key, { count, ...extra });
}
