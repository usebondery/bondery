/**
 * Better Auth factory for the Fastify singleton.
 *
 * `betterAuth({ ... })` must stay an object literal so `auth.api` keeps plugin
 * endpoints. Spreading helpers infers `Auth<BetterAuthOptions>`.
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
import { BETTER_AUTH_BASE_PATH } from "@bondery/helpers/globals/paths";
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
import {
  authTranslations,
  MCP_OAUTH_SCOPES,
  MCP_READ_SCOPE,
  MCP_WRITE_SCOPE,
  OAUTH_PROVIDER_SCOPES,
  resolveApiResourceIdentifiers,
  resolveAuthErrorPageUrl,
  resolveBetterAuthIssuerUrl,
  resolveMcpResourceIdentifier,
  resolveMcpResourceIdentifiers,
  resolveTrustedOAuthClientIds,
  resolveUseSecureCookies,
  resolveWebAuthnRpConfig,
  resolveWebappUrl,
  withPasskeyLastUsedAtField,
} from "./auth-public.js";

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
import { SESSION_FRESH_AGE_SECONDS } from "./session-freshness.js";
import { runUserDeleteAfter, runUserDeleteBefore } from "./teardown-user.js";
import { touchPasskeyLastUsed } from "./touch-passkey-last-used.js";

export function createBonderyAuth() {
  const betterAuthSecrets = resolveBetterAuthSecrets();
  const crossSubdomainCookieDomain = resolveCookieDomain(process.env.BONDERY_PUBLIC_WEBAPP_URL);
  const webAuthnRpConfig = resolveWebAuthnRpConfig();

  return betterAuth({
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
        // MCP assistants use CIMD only (`cimd()`). RFC 7591 DCR is off.
        // Registration allowlists stay MCP-only — never REST `api:access`.
        allowDynamicClientRegistration: false,
        // Consent looks up CIMD `client_name` with a signed `oauth_query`
        // (GET `/oauth2/public-client` still requires a session cookie).
        allowPublicClientPrelogin: true,
        allowUnauthenticatedClientRegistration: false,
        // First-party REST clients only (webapp BFF + Chrome extension).
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
      // Cookie `updateAge` refreshes expiry. It does not reset `createdAt`, so
      // sessions older than `SESSION_FRESH_AGE_SECONDS` still get SESSION_NOT_FRESH
      // until the user reauthenticates.
      freshAge: SESSION_FRESH_AGE_SECONDS,
      // Dual-write Postgres + Redis (see docs/adr/0001-better-auth-redis-secondary-storage.mdx).
      storeSessionInDatabase: true,
      updateAge: 60 * 60 * 24, // refresh cookie once per day of activity
    },
    // Only include IdPs that have both client id and secret at boot.
    // LinkedIn uses Better Auth's OIDC provider (`openid`, `profile`, `email`).
    socialProviders: oauthSocialProviders,
    trustedOrigins: resolveRuntimeTrustedOrigins(),
  });
}

export type BonderyAuth = ReturnType<typeof createBonderyAuth>;
