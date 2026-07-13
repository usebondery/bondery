/** API sync schema requires Zulu ISO datetimes (`…Z`), not `+00:00` offsets. */
export function normalizeSyncDatetime(value: string | null | undefined): string | undefined {
  if (!value || value.trim().length === 0) {
    return undefined;
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return undefined;
  }

  return new Date(parsed).toISOString();
}
