/**
 * Better Auth instance.
 *
 * Mounted at /auth/* (see routes.ts). Handles:
 *  - GitHub + LinkedIn social sign-in (webapp, mobile)
 *  - Passwordless sign-in email (`magicLink` plugin; hashed Redis tokens)
 *  - Bearer sessions for mobile/API clients (`bearer` plugin)
 *  - JWT/JWKS issuance for services that need a verifiable access token
 *  - Acting as its own OAuth 2.1 / OIDC provider (`mcp()` — oauth-provider
 *    superset; do not also install `oauthProvider()`) for first-party REST
 *    clients and CIMD/DCR MCP clients
 *  - `expo` plugin for mobile deep-link + SecureStore session handling
 *
 * `databaseHooks.user.create.after` seeds `user_settings` + the "myself" `people` row,
 * then sends a welcome email (idempotent via `user_settings.welcome_email_sent_at`).
 * Magic-link signup captures `signup_flow:user_create` from that hook (`signup_method: email`)
 * because it does not create an `Account` row. Social signup still uses `account.create.after`.
 */

import { apiKey } from "@better-auth/api-key";
import { cimd } from "@better-auth/cimd";
import { fetchClientMetadataResource } from "@better-auth/cimd/node";
import { expo } from "@better-auth/expo";
import { i18n } from "@better-auth/i18n";
import { mcp } from "@better-auth/mcp";
import { passkey } from "@better-auth/passkey";
import { prisma } from "@bondery/db";
import { PLATFORM_ADMIN_ROLE, PLATFORM_USER_ROLE } from "@bondery/helpers/auth/platform-admin";
import { resolveCookieDomain } from "@bondery/helpers/auth/resolve-cookie-domain";
import { resolveWebAuthnRp } from "@bondery/helpers/auth/resolve-webauthn-rp";
import { API_ROUTES, BETTER_AUTH_BASE_PATH } from "@bondery/helpers/globals/paths";
import { generateId } from "@bondery/helpers/ids";
import { API_KEY_PREFIX, API_KEY_START_DISPLAY_LENGTH } from "@bondery/schemas";
import { DEFAULT_LOCALE } from "@bondery/schemas/locale/supported-locale";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { betterAuth } from "better-auth/minimal";
import { lastLoginMethod, magicLink } from "better-auth/plugins";
import type { AccessControl } from "better-auth/plugins/access";
import { admin } from "better-auth/plugins/admin";
import { bearer } from "better-auth/plugins/bearer";
import { jwt } from "better-auth/plugins/jwt";
import { resolveRuntimeTrustedOrigins } from "../platform/trusted-origins.js";
import { buildAuthTranslations } from "./build-auth-translations.js";
import { isPlatformAdmin } from "./is-platform-admin.js";
import { withLoopbackUrlAlias } from "./loopback-alias-urls.js";
import { MAGIC_LINK_BA_RATE_LIMIT, MAGIC_LINK_EXPIRES_IN_SECONDS } from "./magic-link-constants.js";
import { resolveNewUserDisplayName } from "./new-user-name.js";
import { oauthSocialProviders } from "./oauth-provider-config.js";
import { passkeyLimit } from "./passkey-limit.js";
import { platformAdminAc, platformAdminRoles } from "./platform-admin-access.js";
import { provisionNewUser } from "./provision-new-user.js";
import { resolveAuthLocale } from "./resolve-auth-locale.js";
import { resolveProvisionLocaleFromContext } from "./resolve-provision-locale.js";
import { resolveBetterAuthSecrets } from "./resolve-secrets.js";
import {
  isMagicLinkSignupContext,
  resolveSignupMethodFromProviderId,
  SIGNUP_METHOD,
} from "./resolve-signup-method.js";
import { createBetterAuthSecondaryStorage } from "./secondary-storage.js";
import { sendMagicLink } from "./send-magic-link.js";
import { runUserDeleteAfter, runUserDeleteBefore } from "./teardown-user.js";
import { touchPasskeyLastUsed } from "./touch-passkey-last-used.js";

export { isPlatformAdmin };

const betterAuthSecrets = resolveBetterAuthSecrets();
const authTranslations = buildAuthTranslations();

function resolveWebappUrl(): string {
  return (process.env.BONDERY_PUBLIC_WEBAPP_URL ?? "").replace(/\/+$/, "");
}

/**
 * Canonical protected-resource identifier for this API, per RFC 8707
 * (`BONDERY_PUBLIC_API_URL`). First-party clients should request this exact
 * `resource` value. `enforcePerClientResources` also requires a client link
 * via `oauthClientResource` (see scripts/provision-oauth-clients.ts).
 */
export function resolveApiResourceIdentifier(): string {
  return (process.env.BONDERY_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
}

/**
 * Canonical identifier plus the localhost ↔ 127.0.0.1 alias used by Chrome
 * identity and Node IPv4 fetches. Production hosts are a single-element list.
 */
export function resolveApiResourceIdentifiers(): string[] {
  return withLoopbackUrlAlias(resolveApiResourceIdentifier());
}

/** JWT `aud` check: string in production, both loopback aliases locally. */
export function resolveApiResourceAudience(): string | string[] {
  const identifiers = resolveApiResourceIdentifiers();
  return identifiers.length === 1 ? (identifiers[0] ?? "") : identifiers;
}

export const API_ACCESS_SCOPE = "api:access";
export const MCP_READ_SCOPE = "mcp:read";
export const MCP_WRITE_SCOPE = "mcp:write";

export const OIDC_SCOPES = ["openid", "profile", "email", "offline_access"] as const;

export const OAUTH_PROVIDER_SCOPES = [...OIDC_SCOPES, API_ACCESS_SCOPE] as const;

export const MCP_OAUTH_SCOPES = [...OIDC_SCOPES, MCP_READ_SCOPE, MCP_WRITE_SCOPE] as const;

/** Better Auth CIMD `clientDiscoveryId` stored on discovered clients. */
export const CIMD_CLIENT_DISCOVERY_ID = "cimd";

/**
 * Canonical MCP protected-resource identifier (`{API}/mcp`).
 * Same origin as REST; path `/mcp`. Loopback aliases keep `/mcp`.
 */
export function resolveMcpResourceIdentifier(): string {
  const api = resolveApiResourceIdentifier();
  return api ? `${api}${API_ROUTES.MCP}` : "";
}

export function resolveMcpResourceIdentifiers(): string[] {
  return withLoopbackUrlAlias(resolveMcpResourceIdentifier());
}

/** JWT `aud` check for MCP: string in production, both loopback aliases locally. */
export function resolveMcpResourceAudience(): string | string[] {
  const identifiers = resolveMcpResourceIdentifiers();
  return identifiers.length === 1 ? (identifiers[0] ?? "") : identifiers;
}

export function resolveTrustedOAuthClientIds(): Set<string> | undefined {
  const clientIds = [
    process.env.BONDERY_PUBLIC_OAUTH_CLIENT_ID?.trim(), // chrome-extension
    process.env.BONDERY_PUBLIC_WEBAPP_OAUTH_CLIENT_ID?.trim(), // webapp BFF
  ].filter((value): value is string => Boolean(value));
  return clientIds.length > 0 ? new Set(clientIds) : undefined;
}

function resolveAuthErrorPageUrl(): string {
  const webappUrl = resolveWebappUrl();
  return webappUrl ? `${webappUrl}/login` : "";
}

/**
 * The Better Auth issuer is the API's own domain — the auth server's identity
 * must not be borrowed from one of its own clients. OAuth callbacks (GitHub/
 * LinkedIn), the JWT `iss` claim, and the session cookie are all derived from
 * this. `loginPage`/`consentPage` below still point at the webapp — that's the
 * browser-facing UI, a separate concern from the issuer identity.
 */
export function resolveBetterAuthIssuerUrl(): string {
  const apiUrl = (process.env.BONDERY_PUBLIC_API_URL ?? "").replace(/\/+$/, "");
  if (apiUrl) {
    return apiUrl;
  }

  return resolveWebappUrl();
}

/** OAuth/OIDC issuer advertised by Better Auth for this non-root base path. */
export function resolveOAuthIssuerIdentifier(): string {
  const baseUrl = resolveBetterAuthIssuerUrl();
  return baseUrl ? `${baseUrl}${BETTER_AUTH_BASE_PATH}` : "";
}

function resolveUseSecureCookies(): boolean {
  return resolveBetterAuthIssuerUrl().startsWith("https://");
}

const crossSubdomainCookieDomain = resolveCookieDomain(process.env.BONDERY_PUBLIC_WEBAPP_URL);

const webAuthnRp = resolveWebAuthnRp({
  rpIdOverride: process.env.BONDERY_PUBLIC_WEBAUTHN_RP_ID,
  webappUrl: process.env.BONDERY_PUBLIC_WEBAPP_URL,
});

/**
 * Always register the plugin so Better Auth infers passkey + OAuth/API-key
 * endpoints. IP webapp hosts cannot be a WebAuthn rpID; fall back to localhost
 * so boot succeeds and ceremonies fail closed on origin mismatch.
 */
const webAuthnRpConfig = webAuthnRp.ok
  ? { origin: webAuthnRp.origin, rpID: webAuthnRp.rpID }
  : { origin: "http://localhost", rpID: "localhost" };

/**
 * Better Auth 1.7.1 `mergeSchema` only remaps existing field names. Assign so
 * adapter `transformOutput` keeps `lastUsedAt` on `listUserPasskeys`.
 */
function withPasskeyLastUsedAtField(
  plugin: ReturnType<typeof passkey>,
): ReturnType<typeof passkey> {
  Object.assign(plugin.schema.passkey.fields, {
    lastUsedAt: { required: false, type: "date" },
  });
  return plugin;
}

export const auth = betterAuth({
  account: {
    // AES-256-GCM for GitHub/LinkedIn tokens in `Account`. Better Auth
    // encrypts on write and decrypts in getAccessToken / account-info /
    // refresh. Existing plaintext rows still work until the next
    // refresh/re-link (decryptOAuthToken passes non-encrypted values through).
    // App code must not read Account.accessToken/refreshToken/idToken via
    // Prisma — use auth.api.getAccessToken if a plaintext provider token is needed.
    encryptOAuthTokens: true,
    // Prisma `Account.providerAccountId` (`account_id`). Better Auth still
    // queries the logical field `accountId`; without this map, GitHub/LinkedIn
    // callback hits PrismaClientValidationError. Account.issuer was removed in
    // Better Auth 1.7.3+; rebuild `@bondery/db` after `prisma generate` so the
    // API's dist Prisma client no longer selects that column.
    fields: {
      accountId: "providerAccountId",
    },
  },

  advanced: {
    useSecureCookies: resolveUseSecureCookies(),
    ...(crossSubdomainCookieDomain && {
      crossSubDomainCookies: {
        domain: crossSubdomainCookieDomain,
        enabled: true,
      },
    }),
    // Preserve Postgres uuid columns already referenced by every app table.
    database: { generateId: () => generateId() },
  },
  basePath: BETTER_AUTH_BASE_PATH,
  baseURL: resolveBetterAuthIssuerUrl(),

  database: prismaAdapter(prisma, { provider: "postgresql" }),

  databaseHooks: {
    account: {
      create: {
        after: async (account) => {
          const accountCount = await prisma.account.count({
            where: { userId: account.userId },
          });
          if (accountCount !== 1) {
            return;
          }

          const user = await prisma.user.findUnique({
            select: { email: true, id: true },
            where: { id: account.userId },
          });
          if (!user) {
            return;
          }

          const signup_method = resolveSignupMethodFromProviderId(account.providerId);

          void import("../../services/analytics/posthog-capture.js")
            .then(({ captureProductEvent }) =>
              captureProductEvent(
                { user: { email: user.email, id: user.id } },
                "signup_flow:user_create",
                { signup_method },
              ),
            )
            .catch(() => {
              // captureProductEvent is best-effort during signup
            });
        },
      },
    },
    user: {
      create: {
        after: async (user, ctx) => {
          const locale = resolveProvisionLocaleFromContext(ctx ?? undefined);
          await provisionNewUser({
            email: user.email,
            locale,
            name: user.name,
            userId: user.id,
          });

          void import("../../services/notifications/welcome.js")
            .then(({ sendWelcomeEmailIfNeeded }) =>
              sendWelcomeEmailIfNeeded({
                email: user.email,
                language: locale,
                userId: user.id,
                userName: user.name,
              }),
            )
            .catch(() => {
              // sendWelcomeEmailIfNeeded logs failures internally
            });

          if (isMagicLinkSignupContext(ctx)) {
            void import("../../services/analytics/posthog-capture.js")
              .then(({ captureProductEvent }) =>
                captureProductEvent(
                  { user: { email: user.email, id: user.id } },
                  "signup_flow:user_create",
                  { signup_method: SIGNUP_METHOD.email },
                ),
              )
              .catch(() => {
                // captureProductEvent is best-effort during signup
              });
          }
        },
        before: async (user) => {
          const name = resolveNewUserDisplayName({
            email: user.email,
            name: user.name,
          });
          if (!name || name === user.name) {
            return;
          }

          return { data: { name } };
        },
      },
      delete: {
        after: async (user) => {
          await runUserDeleteAfter({
            email: user.email,
            id: user.id,
            name: user.name,
          });
        },
        before: async (user) => {
          await runUserDeleteBefore({
            email: user.email,
            id: user.id,
            name: user.name,
          });
        },
      },
    },
  },
  onAPIError: {
    errorURL: resolveAuthErrorPageUrl() || undefined,
  },

  plugins: [
    bearer(),
    jwt(),
    expo(),
    admin({
      ac: platformAdminAc as AccessControl,
      adminRoles: [PLATFORM_ADMIN_ROLE],
      defaultRole: PLATFORM_USER_ROLE,
      roles: platformAdminRoles,
    }),
    i18n({
      defaultLocale: DEFAULT_LOCALE,
      detection: ["callback"],
      getLocale: resolveAuthLocale,
      translations: authTranslations,
    }),
    mcp({
      // Cursor's MCP client still requires RFC 7591 DCR. Claude Desktop and
      // other CIMD clients keep working via `cimd()`. Registration is limited
      // to MCP resources and mcp:* scopes — never REST `api:access`.
      allowDynamicClientRegistration: true,
      // Consent looks up DCR/CIMD `client_name` with a signed `oauth_query`
      // (GET `/oauth2/public-client` still requires a session cookie).
      allowPublicClientPrelogin: true,
      allowUnauthenticatedClientRegistration: true,
      cachedTrustedClients: resolveTrustedOAuthClientIds(),
      clientRegistrationAllowedResources: resolveMcpResourceIdentifiers(),
      clientRegistrationAllowedScopes: [...MCP_OAUTH_SCOPES],
      clientRegistrationDefaultResources: resolveMcpResourceIdentifiers(),
      clientRegistrationDefaultScopes: [...MCP_OAUTH_SCOPES],
      consentPage: `${resolveWebappUrl()}/oauth/consent`,
      enforcePerClientResources: true,
      // Deliberately NOT `/login`: that page's server-side gate checks the
      // webapp's own independent OAuth-BFF session (see
      // resolveServerSession()) and redirects straight past the login UI
      // when it's valid. This page is reached by /oauth2/authorize only
      // when the API's own native session is missing, which the webapp
      // session says nothing about — reusing `/login` here caused a
      // redirect loop whenever a caller had a valid webapp session but no
      // native AS session. `/oauth/login` is a dedicated AS-only login
      // gate that always starts fresh social sign-in.
      loginPage: `${resolveWebappUrl()}/oauth/login`,
      // Default register is 5/min. Cursor retries DCR on every Connect; those
      // 429s are `{ message }` not RFC 7591 `{ error }`, so the client surfaces
      // a Zod parse failure instead of backing off.
      rateLimit: {
        register: { max: 30, window: 60 },
      },
      // mcp() defaults this to 30s (oauth-provider default is 0). Keep
      // first-party refresh strict: a rotated refresh token is not reusable.
      refreshTokenReuseInterval: 0,
      // Canonical MCP resource. mcp() also appends this identifier to
      // `resources` if missing. REST identifiers stay in `resources` with
      // REST-only allowedScopes; first-party provisioner links only REST.
      resource: resolveMcpResourceIdentifier(),
      resources: [
        ...resolveApiResourceIdentifiers().map((identifier) => ({
          allowedScopes: [...OAUTH_PROVIDER_SCOPES],
          identifier,
          name: "Bondery API",
        })),
        ...resolveMcpResourceIdentifiers().map((identifier) => ({
          allowedScopes: [...MCP_OAUTH_SCOPES],
          identifier,
          name: "Bondery MCP",
        })),
      ],
      // RFC 8414 advertises the union. Per-resource allowedScopes still
      // gate tokens. RFC 9728 PRM from mcp() lists plugin-level scopes
      // minus OIDC (so `api:access` may appear next to mcp:* — that is
      // discovery metadata, not a token leak).
      scopes: [...OAUTH_PROVIDER_SCOPES, MCP_READ_SCOPE, MCP_WRITE_SCOPE],
    }),
    cimd({
      fetchClientMetadataResource,
      metadataProfile: "mcp-2026-07-28",
    }),
    apiKey({
      defaultPrefix: API_KEY_PREFIX,
      enableSessionForAPIKeys: false,
      maximumNameLength: 100,
      permissions: {
        defaultPermissions: { api: ["read"] },
      },
      rateLimit: { enabled: false },
      references: "user",
      requireName: true,
      startingCharactersConfig: {
        charactersLength: API_KEY_START_DISPLAY_LENGTH,
        shouldStore: true,
      },
    }),
    withPasskeyLastUsedAtField(
      passkey({
        authentication: {
          afterVerification: async ({ clientData }) => {
            await touchPasskeyLastUsed(clientData);
          },
        },
        origin: webAuthnRpConfig.origin,
        registration: {
          requireSession: true,
        },
        rpID: webAuthnRpConfig.rpID,
        rpName: "Bondery",
      }),
    ),
    passkeyLimit(),
    magicLink({
      disableSignUp: false,
      expiresIn: MAGIC_LINK_EXPIRES_IN_SECONDS,
      rateLimit: MAGIC_LINK_BA_RATE_LIMIT,
      sendMagicLink,
      storeToken: "hashed",
    }),
    lastLoginMethod({
      // Better Auth 1.7.1 already maps `/magic-link/verify` → `"magic-link"`.
      storeInDatabase: false,
    }),
  ],
  rateLimit: {
    enabled: true,
    storage: "secondary-storage",
    // Inject tests share one client IP (Better Auth cannot read Fastify's
    // remoteAddress), so the default per-path bucket 429s `test:auth` when
    // files run in parallel against real Redis. Production keeps defaults.
    ...(process.env.NODE_ENV === "test" ? { max: 10_000, window: 10 } : {}),
  },
  secondaryStorage: createBetterAuthSecondaryStorage(),
  secrets: betterAuthSecrets,

  session: {
    // 30-day session; refreshed by client plugins (web cookie, expoClient, bearer).
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    // Dual-write Postgres + Redis (see docs/adr/0001-better-auth-redis-secondary-storage.mdx).
    storeSessionInDatabase: true,
    updateAge: 60 * 60 * 24, // refresh cookie once per day of activity
  },

  // Only include IdPs that have both client id and secret at boot.
  // LinkedIn uses Better Auth's OIDC provider (`openid`, `profile`, `email`).
  socialProviders: oauthSocialProviders,
  trustedOrigins: resolveRuntimeTrustedOrigins(),
});

export type Auth = typeof auth;
