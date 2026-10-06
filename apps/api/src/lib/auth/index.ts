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
 *    clients and CIMD MCP clients
 *  - `expo` plugin for mobile deep-link + SecureStore session handling
 *
 * `databaseHooks.user.create.after` seeds `user_settings` + the "myself" `people` row,
 * then sends a welcome email (idempotent via `user_settings.welcome_email_sent_at`).
 * Magic-link signup captures `signup_flow:user_create` from that hook (`signup_method: email`)
 * because it does not create an `Account` row. Social signup still uses `account.create.after`.
 */

import { createBonderyAuth } from "./create-bondery-auth.js";

export {
  API_ACCESS_SCOPE,
  CIMD_CLIENT_DISCOVERY_ID,
  MCP_OAUTH_SCOPES,
  MCP_READ_SCOPE,
  MCP_WRITE_SCOPE,
  OAUTH_PROVIDER_SCOPES,
  OIDC_SCOPES,
  resolveApiResourceAudience,
  resolveApiResourceIdentifier,
  resolveApiResourceIdentifiers,
  resolveBetterAuthIssuerUrl,
  resolveMcpResourceAudience,
  resolveMcpResourceIdentifier,
  resolveMcpResourceIdentifiers,
  resolveOAuthIssuerIdentifier,
  resolveTrustedOAuthClientIds,
} from "./auth-public.js";
export { isPlatformAdmin } from "./is-platform-admin.js";

export const auth = createBonderyAuth();

export type Auth = typeof auth;
