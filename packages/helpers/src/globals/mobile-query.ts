/** Expo app public route paths (no host). */
export const MOBILE_ROUTES = {
  CONTACTS: "/contacts",
} as const;

/** Contacts tab list filter. Snake_case, same rules as API query params. */
export const MOBILE_GROUP_ID_PARAM = "group_id" as const;

export type MobileGroupIdParam = typeof MOBILE_GROUP_ID_PARAM;

/** Read a single string from Expo `useLocalSearchParams` values. */
export function parseMobileQueryParam(value: string | string[] | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

export function parseMobileGroupIdParam(value: string | string[] | undefined): string | undefined {
  return parseMobileQueryParam(value);
}

/** Path + query for universal links and documentation. */
export function contactsPathWithGroupId(groupId: string | null | undefined): string {
  if (!groupId) {
    return MOBILE_ROUTES.CONTACTS;
  }

  return `${MOBILE_ROUTES.CONTACTS}?${MOBILE_GROUP_ID_PARAM}=${encodeURIComponent(groupId)}`;
}

export type MobileContactsRouteParams = {
  [MOBILE_GROUP_ID_PARAM]?: string;
  refresh?: string;
};
