/**
 * Ordered route registration table.
 * Order = published API doc order within shared tags (see docs/contributing/api-routes.md).
 * `area` selects the route shell (auth + openApiArea) in lib/platform/route-areas.ts.
 */

import { API_ROUTES } from "@bondery/helpers";
import { registerHealthRoutes } from "../lib/health/routes.js";
import type { AppFastifyInstance, AppRoutePlugin } from "../lib/platform/fastify-types.js";
import {
  adminRoutes,
  integrationRoutes,
  internalRoutes,
  openApiAreaRoutes,
  sessionRoutes,
} from "../lib/platform/route-areas.js";
import { statsRoutes } from "./admin/stats/index.js";
import { chatRoutes } from "./chat/index.js";
import { chatSessionRoutes } from "./chat/sessions.js";
import { contactIntegrationRoutes } from "./contacts/index.js";
import { contactSessionRoutes } from "./contacts/session-routes.js";
import { shareRoutes } from "./contacts/share/index.js";
import { extensionRoutes } from "./extension/index.js";
import { geocodeRoutes } from "./geocode/index.js";
import { groupRoutes } from "./groups/index.js";
import { instagramImportRoutes } from "./import/instagram/index.js";
import { linkedInImportRoutes } from "./import/linkedin/index.js";
import { vcardImportRoutes } from "./import/vcard/index.js";
import { interactionRoutes } from "./interactions/index.js";
import { reminderDigestRoutes } from "./internal/reminder-digest.js";
import { meApiKeysRoutes } from "./me/api-keys/index.js";
import { meFeedbackRoutes } from "./me/feedback/index.js";
import { meRoutes } from "./me/index.js";
import { meInitializeRoutes } from "./me/initialize/index.js";
import { meOnboardingImportFollowupRoutes } from "./me/onboarding/import-followup.js";
import { meOnboardingRoutes } from "./me/onboarding/index.js";
import { meSessionRoutes } from "./me/session/index.js";
import { meSettingsRoutes } from "./me/settings/index.js";
import { subscriptionCheckoutRoutes } from "./subscriptions/checkout.js";
import { subscriptionRoutes } from "./subscriptions/index.js";
import { subscriptionPortalRoutes } from "./subscriptions/portal.js";
import { subscriptionSyncRoutes } from "./subscriptions/sync.js";
import { syncRoutes } from "./sync/index.js";
import { tagRoutes } from "./tags/index.js";
import { polarWebhookRoutes } from "./webhooks/polar.js";

type RouteMountArea = "integration" | "session" | "admin" | "internal" | "webhook" | "composite";

type RouteMount = {
  area: RouteMountArea;
  plugin: AppRoutePlugin;
  prefix: string;
};

const SHELLS: Record<RouteMountArea, (plugin: AppRoutePlugin) => AppRoutePlugin> = {
  admin: adminRoutes,
  /** Plugin composes sub-shells internally (e.g. sync HTTP vs WS ticket auth). */
  composite: (plugin) => plugin,
  integration: integrationRoutes,
  internal: internalRoutes,
  session: sessionRoutes,
  webhook: (plugin) => openApiAreaRoutes("internal", plugin),
};

/** Registration order is part of the public API documentation contract. */
const ROUTE_MOUNTS: RouteMount[] = [
  { area: "integration", plugin: contactIntegrationRoutes, prefix: API_ROUTES.CONTACTS },
  { area: "session", plugin: contactSessionRoutes, prefix: API_ROUTES.CONTACTS },
  {
    area: "integration",
    plugin: linkedInImportRoutes,
    prefix: API_ROUTES.CONTACTS_IMPORT_LINKEDIN,
  },
  {
    area: "integration",
    plugin: instagramImportRoutes,
    prefix: API_ROUTES.CONTACTS_IMPORT_INSTAGRAM,
  },
  { area: "integration", plugin: vcardImportRoutes, prefix: API_ROUTES.CONTACTS_IMPORT_VCARD },
  { area: "integration", plugin: groupRoutes, prefix: API_ROUTES.GROUPS },
  { area: "integration", plugin: tagRoutes, prefix: API_ROUTES.TAGS },
  { area: "integration", plugin: interactionRoutes, prefix: API_ROUTES.INTERACTIONS },
  { area: "integration", plugin: shareRoutes, prefix: API_ROUTES.CONTACTS_SHARE },
  { area: "integration", plugin: geocodeRoutes, prefix: API_ROUTES.GEOCODE },
  { area: "session", plugin: meRoutes, prefix: API_ROUTES.ME },
  { area: "session", plugin: meInitializeRoutes, prefix: API_ROUTES.ME_INITIALIZE },
  { area: "session", plugin: meSessionRoutes, prefix: API_ROUTES.ME_SESSION },
  { area: "session", plugin: meOnboardingRoutes, prefix: API_ROUTES.ME_ONBOARDING_COMPLETE },
  {
    area: "session",
    plugin: meOnboardingImportFollowupRoutes,
    prefix: API_ROUTES.ME_ONBOARDING_IMPORT_FOLLOWUP,
  },
  { area: "session", plugin: meSettingsRoutes, prefix: API_ROUTES.ME_SETTINGS },
  { area: "session", plugin: meFeedbackRoutes, prefix: API_ROUTES.ME_FEEDBACK },
  { area: "session", plugin: meApiKeysRoutes, prefix: API_ROUTES.ME_API_KEYS },
  { area: "composite", plugin: syncRoutes, prefix: API_ROUTES.SYNC },
  { area: "session", plugin: extensionRoutes, prefix: API_ROUTES.EXTENSION },
  { area: "session", plugin: chatRoutes, prefix: API_ROUTES.CHAT },
  { area: "session", plugin: chatSessionRoutes, prefix: API_ROUTES.CHAT_SESSIONS },
  { area: "session", plugin: subscriptionRoutes, prefix: API_ROUTES.SUBSCRIPTIONS },
  {
    area: "session",
    plugin: subscriptionCheckoutRoutes,
    prefix: API_ROUTES.SUBSCRIPTIONS_CHECKOUT,
  },
  { area: "session", plugin: subscriptionPortalRoutes, prefix: API_ROUTES.SUBSCRIPTIONS_PORTAL },
  { area: "session", plugin: subscriptionSyncRoutes, prefix: API_ROUTES.SUBSCRIPTIONS_SYNC },
  { area: "admin", plugin: statsRoutes, prefix: API_ROUTES.ADMIN_STATS },
  { area: "webhook", plugin: polarWebhookRoutes, prefix: API_ROUTES.WEBHOOKS_POLAR },
  {
    area: "internal",
    plugin: reminderDigestRoutes,
    prefix: API_ROUTES.INTERNAL_REMINDER_DIGEST,
  },
];

export async function registerAllRoutes(fastify: AppFastifyInstance): Promise<void> {
  registerHealthRoutes(fastify);

  for (const { area, plugin, prefix } of ROUTE_MOUNTS) {
    await fastify.register(SHELLS[area](plugin), { prefix });
  }
}

/** Exported for route-security CI checks. */
export { ROUTE_MOUNTS };
