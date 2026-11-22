import {
  API_KEY_BA_RESOURCE,
  API_KEY_PREFIX,
  type ApiKeyBaAction,
  type ApiKeyPermission,
} from "@bondery/schemas";

type BaApiKeyPermissions = Record<string, ApiKeyBaAction[]>;

function parseBaPermissions(permissions: unknown): BaApiKeyPermissions | null {
  if (!permissions) {
    return null;
  }

  let parsed: unknown = permissions;
  if (typeof permissions === "string") {
    try {
      parsed = JSON.parse(permissions);
    } catch {
      return null;
    }
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }

  return parsed as BaApiKeyPermissions;
}

export type { BaApiKeyPermissions };

/** Map product scope to Better Auth permissions JSON. */
export function baPermissionsFromProduct(permission: ApiKeyPermission): BaApiKeyPermissions {
  return permission === "full"
    ? { [API_KEY_BA_RESOURCE]: ["full"] }
    : { [API_KEY_BA_RESOURCE]: ["read"] };
}

/** Map stored Better Auth permissions back to product read/full scope. */
export function productPermissionFromBa(permissions: unknown): ApiKeyPermission {
  const actions = parseBaPermissions(permissions)?.[API_KEY_BA_RESOURCE] ?? [];
  return actions.includes("full") ? "full" : "read";
}

/** Format stored `start` for list UI (e.g. `bondery_key_abc…`). */
export function formatApiKeyPrefixDisplay(start: string | null | undefined): string {
  if (start) {
    return `${start}…`;
  }

  return `${API_KEY_PREFIX}…`;
}
