import { validate as uuidValidate, v7 as uuidv7 } from "uuid";

/** RFC 9562 v7 — time-sortable; requires `react-native-get-random-values` polyfill at app entry. */
export function generateUuid(): string {
  return uuidv7();
}

export function isValidUuid(value: string | null | undefined): value is string {
  return typeof value === "string" && uuidValidate(value);
}
