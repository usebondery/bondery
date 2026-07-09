/**
 * Builds compound i18next plural keys for independent count dimensions.
 * Example: compoundPluralKey("AddedSummary", [1, 3]) → "AddedSummary_one_other"
 */
export function compoundPluralKey(baseKey: string, counts: readonly number[]): string {
  const suffix = counts.map((count) => (count === 1 ? "_one" : "_other")).join("");
  return `${baseKey}${suffix}`;
}
