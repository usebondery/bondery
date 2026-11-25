import type { LooseTranslateFn, NamespaceKey, TranslateFn } from "@bondery/translations";

/**
 * Returns a pluralized translation fragment when count > 0, otherwise an empty string.
 * Use as an interpolation value (e.g. `{skippedDetails}`) inside a parent sentence key.
 */
export function optionalPluralFragment<
  Namespace extends NamespaceKey,
  Prefix extends string | undefined,
>(
  t: TranslateFn<Namespace, Prefix>,
  key: Parameters<TranslateFn<Namespace, Prefix>>[0],
  count: number,
  extra?: Record<string, unknown>,
): string {
  if (count <= 0) {
    return "";
  }

  return (t as LooseTranslateFn)(String(key), { count, ...extra });
}
