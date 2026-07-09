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
  /** i18n namespace for document title (must match generateMetadata). */
  titleNamespace: string;
  /** i18n key within titleNamespace. */
  titleKey: string;
};

export const primaryAppNavLinks: AppNavLinkDef[] = [
  {
    href: WEBAPP_ROUTES.HOME,
    labelKey: "Home",
    titleKey: "Title",
    titleNamespace: "HomePage",
  },
  {
    href: WEBAPP_ROUTES.INTERACTIONS,
    labelKey: "Interactions",
    titleKey: "PageTitle",
    titleNamespace: "InteractionsPage",
  },
  {
    href: WEBAPP_ROUTES.PEOPLE,
    labelKey: "People",
    titleKey: "Title",
    titleNamespace: "PeoplePage",
  },
  {
    href: WEBAPP_ROUTES.KEEP_IN_TOUCH,
    labelKey: "KeepInTouch",
    titleKey: "Title",
    titleNamespace: "KeepInTouch",
  },
  {
    href: WEBAPP_ROUTES.GROUPS,
    labelKey: "Groups",
    titleKey: "Title",
    titleNamespace: "GroupsPage",
  },
  {
    href: WEBAPP_ROUTES.MAP,
    labelKey: "Map",
    titleKey: "Title",
    titleNamespace: "MapPage",
  },
  {
    href: WEBAPP_ROUTES.CHAT,
    labelKey: "Chat",
    titleKey: "Chat",
    titleNamespace: "AppNavigation",
  },
];

export const secondaryAppNavLinks: AppNavLinkDef[] = [
  {
    href: WEBAPP_ROUTES.FIX_CONTACTS,
    labelKey: "FixAndMerge",
    titleKey: "Title",
    titleNamespace: "FixContactsPage",
  },
  {
    href: WEBAPP_ROUTES.SETTINGS,
    labelKey: "Settings",
    titleKey: "Title",
    titleNamespace: "SettingsPage",
  },
];

/** Routes with generateMetadata but not in the sidebar. */
export const additionalStaticRouteTitles: AppNavLinkDef[] = [
  {
    href: WEBAPP_ROUTES.STATS,
    labelKey: "Settings",
    titleKey: "Title",
    titleNamespace: "StatsPage",
  },
];

export const allAppNavLinks: AppNavLinkDef[] = [
  ...primaryAppNavLinks,
  ...secondaryAppNavLinks,
  ...additionalStaticRouteTitles,
];
