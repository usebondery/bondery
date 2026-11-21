import { validate as uuidValidate, version as uuidVersion, v7 as uuidv7 } from "uuid";

/** RFC 9562 v7 — time-sortable, used for all new Bondery entity IDs. */
export function generateId(): string {
  return uuidv7();
}

export function isValidUuid(value: string | null | undefined): value is string {
  return typeof value === "string" && uuidValidate(value);
}

const UUID_V7_VERSION = 7;

export function isUuidV7(value: string): boolean {
  return isValidUuid(value) && uuidVersion(value) === UUID_V7_VERSION;
}
