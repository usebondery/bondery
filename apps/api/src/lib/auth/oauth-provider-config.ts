/**
 * Boot-time snapshot of which social IdPs have both client id and secret.
 * Shared by Better Auth `socialProviders` and public `GET /oauth-providers`.
 * Computed once at module init — changing env requires an API restart.
 */
import type { OAuthProvidersBitmap } from "@bondery/schemas/oauth-providers";
import { emailConfigFromNodeEnv } from "../notifications/transporter.js";
import logger from "../platform/logger.js";

type OAuthSocialProvidersConfig = {
  github?: { clientId: string; clientSecret: string };
  linkedin?: { clientId: string; clientSecret: string };
};

type OAuthProviderSnapshot = {
  incomplete: { github: boolean; linkedin: boolean };
  oauthProviders: OAuthProvidersBitmap;
  socialProviders: OAuthSocialProvidersConfig;
};

function configuredPair(
  clientId: string | undefined,
  clientSecret: string | undefined,
): { clientId: string; clientSecret: string } | undefined {
  if (!isOAuthAppConfigured(clientId, clientSecret)) {
    return undefined;
  }

  return {
    clientId: clientId?.trim() ?? "",
    clientSecret: clientSecret?.trim() ?? "",
  };
}

const snapshot = resolveOAuthProviderSnapshot();

logger.info(
  {
    incomplete: snapshot.incomplete,
    oauthProviders: snapshot.oauthProviders,
  },
  "oauth provider snapshot",
);

export type { OAuthProviderSnapshot, OAuthSocialProvidersConfig };

export function isOAuthAppConfigured(
  clientId: string | undefined,
  clientSecret: string | undefined,
): boolean {
  return Boolean(clientId?.trim() && clientSecret?.trim());
}

/** True when exactly one of id/secret is non-empty after trim. */
export function isOAuthCredentialPairIncomplete(
  clientId: string | undefined,
  clientSecret: string | undefined,
): boolean {
  const hasId = Boolean(clientId?.trim());
  const hasSecret = Boolean(clientSecret?.trim());
  return hasId !== hasSecret;
}

export function resolveOAuthProviderSnapshot(
  env: NodeJS.ProcessEnv = process.env,
): OAuthProviderSnapshot {
  const githubId = env.BONDERY_PRIVATE_AUTH_GITHUB_CLIENT_ID;
  const githubSecret = env.BONDERY_PRIVATE_AUTH_GITHUB_CLIENT_SECRET;
  const linkedinId = env.BONDERY_PRIVATE_AUTH_LINKEDIN_CLIENT_ID;
  const linkedinSecret = env.BONDERY_PRIVATE_AUTH_LINKEDIN_CLIENT_SECRET;

  const githubPair = configuredPair(githubId, githubSecret);
  const linkedinPair = configuredPair(linkedinId, linkedinSecret);

  const socialProviders: OAuthSocialProvidersConfig = {};
  if (githubPair) {
    socialProviders.github = githubPair;
  }
  if (linkedinPair) {
    socialProviders.linkedin = linkedinPair;
  }

  return {
    incomplete: {
      github: isOAuthCredentialPairIncomplete(githubId, githubSecret),
      linkedin: isOAuthCredentialPairIncomplete(linkedinId, linkedinSecret),
    },
    oauthProviders: {
      email: emailConfigFromNodeEnv(env) !== null,
      github: Boolean(githubPair),
      linkedin: Boolean(linkedinPair),
    },
    socialProviders,
  };
}

/** Frozen public bitmap — booleans only, no secrets. */
export const oauthProviders = snapshot.oauthProviders;

/** Better Auth `socialProviders` — omit unconfigured IdPs entirely. */
export const oauthSocialProviders = snapshot.socialProviders;
