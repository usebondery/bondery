import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";

/** Sidebar label key (AppNavigation namespace). */
export type AppNavLabelKey =
  | "Home"
  | "Interactions"
  | "People"
  | "KeepInTouch"
  | "Groups"
  | "Map"
  | "Chat"
  | "FixAndMerge"
  | "Settings";

export type AppNavLinkDef = {
  href: string;
  labelKey: AppNavLabelKey;
};

export const primaryAppNavLinks: AppNavLinkDef[] = [
  {
    href: WEBAPP_ROUTES.HOME,
    labelKey: "Home",
  },
  {
    href: WEBAPP_ROUTES.INTERACTIONS,
    labelKey: "Interactions",
  },
  {
    href: WEBAPP_ROUTES.PEOPLE,
    labelKey: "People",
  },
  {
    href: WEBAPP_ROUTES.KEEP_IN_TOUCH,
    labelKey: "KeepInTouch",
  },
  {
    href: WEBAPP_ROUTES.GROUPS,
    labelKey: "Groups",
  },
  {
    href: WEBAPP_ROUTES.MAP,
    labelKey: "Map",
  },
  {
    href: WEBAPP_ROUTES.CHAT,
    labelKey: "Chat",
  },
];

export const secondaryAppNavLinks: AppNavLinkDef[] = [
  {
    href: WEBAPP_ROUTES.FIX_CONTACTS,
    labelKey: "FixAndMerge",
  },
  {
    href: WEBAPP_ROUTES.SETTINGS,
    labelKey: "Settings",
  },
];

/** Routes with generateMetadata but not in the sidebar. */
export const additionalStaticRouteTitles: AppNavLinkDef[] = [
  {
    href: WEBAPP_ROUTES.STATS,
    labelKey: "Settings",
  },
];

export const allAppNavLinks: AppNavLinkDef[] = [
  ...primaryAppNavLinks,
  ...secondaryAppNavLinks,
  ...additionalStaticRouteTitles,
];
