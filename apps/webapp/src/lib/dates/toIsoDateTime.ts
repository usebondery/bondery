/**
 * Converts a date-picker value to an ISO 8601 datetime string required by API
 * `nullableDateTimeSchema` fields (e.g. lastInteraction).
 */
export function datePickerValueToIsoDateTime(value: Date | string | null): string | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate()).toISOString();
  }

  const datePart = value.split("T")[0];
  const [year, month, day] = datePart.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day).toISOString();
}
