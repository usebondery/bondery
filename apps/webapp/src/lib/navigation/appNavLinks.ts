import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import type { Route } from "next";
import { routeAssert } from "./route/assert";

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
  href: Route;
  labelKey: AppNavLabelKey;
};

export const primaryAppNavLinks: AppNavLinkDef[] = [
  {
    href: routeAssert(WEBAPP_ROUTES.HOME),
    labelKey: "Home",
  },
  {
    href: routeAssert(WEBAPP_ROUTES.INTERACTIONS),
    labelKey: "Interactions",
  },
  {
    href: routeAssert(WEBAPP_ROUTES.PEOPLE),
    labelKey: "People",
  },
  {
    href: routeAssert(WEBAPP_ROUTES.KEEP_IN_TOUCH),
    labelKey: "KeepInTouch",
  },
  {
    href: routeAssert(WEBAPP_ROUTES.GROUPS),
    labelKey: "Groups",
  },
  {
    href: routeAssert(WEBAPP_ROUTES.MAP),
    labelKey: "Map",
  },
];

/** Chat lives in the sidebar Chat panel / collapsed icon, not the Browse list. */
export const chatAppNavLink: AppNavLinkDef = {
  href: routeAssert(WEBAPP_ROUTES.CHAT),
  labelKey: "Chat",
};

export const secondaryAppNavLinks: AppNavLinkDef[] = [
  {
    href: routeAssert(WEBAPP_ROUTES.FIX_CONTACTS),
    labelKey: "FixAndMerge",
  },
  {
    href: routeAssert(WEBAPP_ROUTES.SETTINGS),
    labelKey: "Settings",
  },
];

/** Routes with generateMetadata but not in the sidebar. */
export const additionalStaticRouteTitles: AppNavLinkDef[] = [];

export const allAppNavLinks: AppNavLinkDef[] = [
  ...primaryAppNavLinks,
  chatAppNavLink,
  ...secondaryAppNavLinks,
  ...additionalStaticRouteTitles,
];
