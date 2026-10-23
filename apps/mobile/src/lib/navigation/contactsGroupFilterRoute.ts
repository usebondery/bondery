import { MOBILE_GROUP_ID_PARAM, MOBILE_ROUTES } from "@bondery/helpers";
import type { Href } from "expo-router";

export { MOBILE_GROUP_ID_PARAM, MOBILE_ROUTES };

export type ContactsTabParams = {
  [MOBILE_GROUP_ID_PARAM]?: string;
  refresh?: string;
};

/** Expo Router href for the Contacts tab with an optional group filter. */
export function contactsHrefWithGroupId(groupId: string | null | undefined): Href {
  if (!groupId) {
    return MOBILE_ROUTES.CONTACTS;
  }

  return {
    params: { [MOBILE_GROUP_ID_PARAM]: groupId },
    pathname: MOBILE_ROUTES.CONTACTS,
  };
}
