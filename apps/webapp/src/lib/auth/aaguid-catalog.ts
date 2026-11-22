/** Snapshot of Better Auth `commonAuthenticatorNames`; written by `pnpm run update:aaguid-catalog`. */
import betterAuthAuthenticatorNames from "./aaguid-catalog/better-auth-authenticator-names.json" with {
  type: "json",
};
import { resolveDefaultPasskeyName } from "./passkey-name";

/** Community AAGUID catalog SVG data URIs must use this exact prefix. */
export const AAGUID_SVG_DATA_URI_PREFIX = "data:image/svg+xml;base64,";

/** Apple hides the real AAGUID behind this well-known zero UUID. */
export const APPLE_PRIVACY_AAGUID = "00000000-0000-0000-0000-000000000000";

export type AaguidCatalogEntry = {
  icon_dark?: string;
  icon_light?: string;
  name: string;
};

export type AaguidCatalog = Record<string, AaguidCatalogEntry>;

/** Untrusted catalog row or created-passkey JSON. */
export type AaguidCatalogJsonFields = {
  aaguid?: unknown;
  icon_dark?: unknown;
  icon_light?: unknown;
  id?: unknown;
  name?: unknown;
};

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isAaguidCatalogJsonFields(value: unknown): value is AaguidCatalogJsonFields {
  return isPlainObject(value);
}

/**
 * Refresh abort: an empty object means the vendor retired the snapshot.
 * Leave the last good file on disk.
 */
export function shouldAbortAaguidCatalogRefresh(doc: unknown): boolean {
  if (!isPlainObject(doc)) {
    return true;
  }
  return Object.keys(doc).length === 0;
}

export function sanitizeAaguidIconUri(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith(AAGUID_SVG_DATA_URI_PREFIX)) {
    return null;
  }
  return value;
}

export function sanitizeAaguidCatalogDocument(doc: unknown): AaguidCatalog {
  if (!isPlainObject(doc)) {
    throw new Error("AAGUID catalog must be a JSON object");
  }

  const catalog: AaguidCatalog = {};
  for (const [rawKey, rawEntry] of Object.entries(doc)) {
    if (!isAaguidCatalogJsonFields(rawEntry) || typeof rawEntry.name !== "string") {
      continue;
    }
    const name = rawEntry.name.trim();
    if (name.length === 0) {
      continue;
    }
    const entry: AaguidCatalogEntry = { name };
    const iconDark = sanitizeAaguidIconUri(rawEntry.icon_dark);
    const iconLight = sanitizeAaguidIconUri(rawEntry.icon_light);
    if (iconDark) {
      entry.icon_dark = iconDark;
    }
    if (iconLight) {
      entry.icon_light = iconLight;
    }
    catalog[rawKey.toLowerCase()] = entry;
  }
  return catalog;
}

/**
 * Sanitize Better Auth `commonAuthenticatorNames` before writing the snapshot.
 */
export function sanitizeBetterAuthAuthenticatorNames(doc: unknown): Record<string, string> {
  if (!isPlainObject(doc)) {
    throw new Error("Better Auth authenticator names must be a JSON object");
  }

  const names: Record<string, string> = {};
  for (const [rawKey, rawName] of Object.entries(doc)) {
    if (typeof rawName !== "string") {
      continue;
    }
    const name = rawName.trim();
    const key = rawKey.trim().toLowerCase();
    if (name.length === 0 || key.length === 0 || key === APPLE_PRIVACY_AAGUID) {
      continue;
    }
    names[key] = name;
  }
  return names;
}

/** `null`, `""`, and Apple’s privacy AAGUID are a catalog/BA miss. */
export function normalizeAaguid(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0 || normalized === APPLE_PRIVACY_AAGUID) {
    return null;
  }
  return normalized;
}

export function lookupAaguidCatalogName(catalog: AaguidCatalog, aaguid: unknown): string | null {
  const key = normalizeAaguid(aaguid);
  if (!key) {
    return null;
  }
  const name = catalog[key]?.name?.trim();
  return name && name.length > 0 ? name : null;
}

export function lookupBetterAuthAuthenticatorName(aaguid: unknown): string | null {
  const key = normalizeAaguid(aaguid);
  if (!key) {
    return null;
  }
  const name = Reflect.get(betterAuthAuthenticatorNames, key);
  return typeof name === "string" && name.length > 0 ? name : null;
}

export function lookupAaguidIcons(
  catalog: AaguidCatalog,
  aaguid: unknown,
): { iconDark: string | null; iconLight: string | null } | null {
  const key = normalizeAaguid(aaguid);
  if (!key) {
    return null;
  }
  const entry = catalog[key];
  if (!entry) {
    return null;
  }
  const iconDark = sanitizeAaguidIconUri(entry.icon_dark);
  const iconLight = sanitizeAaguidIconUri(entry.icon_light);
  if (!iconDark && !iconLight) {
    return null;
  }
  return { iconDark, iconLight };
}

export function lookupAaguidIconUri(
  catalog: AaguidCatalog,
  aaguid: unknown,
  colorScheme: "light" | "dark",
): string | null {
  const icons = lookupAaguidIcons(catalog, aaguid);
  if (!icons) {
    return null;
  }
  const preferred = colorScheme === "dark" ? icons.iconDark : icons.iconLight;
  const fallback = colorScheme === "dark" ? icons.iconLight : icons.iconDark;
  return preferred ?? fallback;
}

export function parseCreatedPasskey(data: unknown): { aaguid: string | null; id: string } | null {
  if (!isAaguidCatalogJsonFields(data)) {
    return null;
  }
  const { id } = data;
  if (typeof id !== "string" || id.length === 0) {
    return null;
  }
  const aaguid = typeof data.aaguid === "string" ? data.aaguid : null;
  return { aaguid, id };
}

/**
 * Name after a modal-less add: community catalog → Better Auth map → UA
 * `NameTemplate` / `FallbackName`. Catalog/BA strings are brand names.
 */
export async function resolveStoredPasskeyName(options: {
  aaguid: unknown;
  catalog: AaguidCatalog;
  fallback: string;
  template: (values: { browser: string; os: string }) => string;
}): Promise<string> {
  const catalogName = lookupAaguidCatalogName(options.catalog, options.aaguid);
  if (catalogName) {
    return catalogName;
  }
  const betterAuthName = lookupBetterAuthAuthenticatorName(options.aaguid);
  if (betterAuthName) {
    return betterAuthName;
  }
  return resolveDefaultPasskeyName(options.fallback, options.template);
}

/**
 * Dynamic-import the vendored snapshot so login never bundles it. Call from
 * Settings-only modules.
 */
export async function loadVendoredAaguidCatalog(): Promise<AaguidCatalog> {
  const mod = (await import("./aaguid-catalog/aaguid.json")) as {
    default?: unknown;
  };
  const catalog = mod.default;
  if (!isPlainObject(catalog)) {
    throw new Error("Vendored AAGUID catalog is missing or invalid");
  }
  return catalog as AaguidCatalog;
}
