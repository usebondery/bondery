/**
 * Deterministic, deployment-only OAuth client/resource provisioning.
 *
 * Upserts first-party OAuth clients through Prisma (not Better Auth HTTP admin).
 * See scripts/provision-oauth-clients.ts for usage notes.
 */
import { createHash } from "node:crypto";
import { prisma } from "@bondery/db";
import { assertDistinctFirstPartyOAuthClientIds } from "@bondery/helpers/env/oauth-client-ids";
import { generateId } from "@bondery/helpers/ids";
import {
  MCP_OAUTH_SCOPES,
  OAUTH_PROVIDER_SCOPES,
  resolveApiResourceIdentifiers,
  resolveMcpResourceIdentifiers,
} from "../auth/index.js";
import { chromeExtensionRedirectUris } from "./chrome-extension-redirect-uris.js";
import { disableDcrOAuthClients } from "./disable-dcr-oauth-clients.js";

export function hashOAuthClientSecret(secret: string): string {
  return createHash("sha256").update(Buffer.from(secret, "utf8")).digest("base64url");
}

function resolveWebappOrigin(): string {
  const origin = (process.env.BONDERY_PUBLIC_WEBAPP_URL ?? "").replace(/\/+$/, "");
  if (!origin) {
    throw new Error("BONDERY_PUBLIC_WEBAPP_URL is not set");
  }
  return origin;
}

function resolveExtensionRedirectUris(): string[] {
  const extensionId = process.env.BONDERY_INFRA_CHROME_EXTENSION_ID?.trim();
  if (!extensionId) {
    throw new Error("BONDERY_INFRA_CHROME_EXTENSION_ID is not set");
  }
  return chromeExtensionRedirectUris(extensionId);
}

async function upsertResourceLink(clientId: string, resourceId: string): Promise<void> {
  const existing = await prisma.oauthClientResource.findFirst({ where: { clientId, resourceId } });
  if (existing) {
    return;
  }
  await prisma.oauthClientResource.create({
    data: { clientId, id: generateId(), resourceId },
  });
}

function resolveWebappRedirectUris(): string[] {
  const origin = resolveWebappOrigin();
  const uris = new Set<string>([`${origin}/auth/oauth-callback`]);

  try {
    const url = new URL(origin);
    const port = url.port ? `:${url.port}` : "";
    if (url.hostname === "localhost") {
      uris.add(`${url.protocol}//127.0.0.1${port}/auth/oauth-callback`);
    } else if (url.hostname === "127.0.0.1") {
      uris.add(`${url.protocol}//localhost${port}/auth/oauth-callback`);
    }
  } catch {
    // Keep single redirect URI when origin is malformed.
  }

  return [...uris];
}

function resourceIdList(resourceId: string | readonly string[]): string[] {
  return typeof resourceId === "string" ? [resourceId] : [...resourceId];
}

export async function provisionWebappClient(resourceId: string | readonly string[]): Promise<void> {
  const clientId = process.env.BONDERY_PUBLIC_WEBAPP_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.BONDERY_PRIVATE_WEBAPP_OAUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error(
      "BONDERY_PUBLIC_WEBAPP_OAUTH_CLIENT_ID and BONDERY_PRIVATE_WEBAPP_OAUTH_CLIENT_SECRET must both be set",
    );
  }

  const redirectUris = resolveWebappRedirectUris();
  const hashedSecret = hashOAuthClientSecret(clientSecret);

  await prisma.oauthClient.upsert({
    create: {
      clientId,
      clientSecret: hashedSecret,
      enableEndSession: true,
      grantTypes: ["authorization_code", "refresh_token"],
      id: generateId(),
      name: "Bondery Webapp (BFF)",
      public: false,
      redirectUris,
      requirePKCE: true,
      responseTypes: ["code"],
      scopes: [...OAUTH_PROVIDER_SCOPES],
      skipConsent: true,
      tokenEndpointAuthMethod: "client_secret_post",
      type: "web",
    },
    update: {
      clientSecret: hashedSecret,
      disabled: false,
      enableEndSession: true,
      grantTypes: ["authorization_code", "refresh_token"],
      name: "Bondery Webapp (BFF)",
      public: false,
      redirectUris,
      requirePKCE: true,
      responseTypes: ["code"],
      scopes: [...OAUTH_PROVIDER_SCOPES],
      skipConsent: true,
      tokenEndpointAuthMethod: "client_secret_post",
      type: "web",
    },
    where: { clientId },
  });

  const resourceIds = resourceIdList(resourceId);
  for (const id of resourceIds) {
    await upsertResourceLink(clientId, id);
  }
  console.log(
    `Provisioned webapp OAuth client ${clientId} (redirect_uris: ${redirectUris.join(", ")}; resources: ${resourceIds.join(", ")})`,
  );
}

export async function provisionExtensionClient(
  resourceId: string | readonly string[],
): Promise<void> {
  const clientId = process.env.BONDERY_PUBLIC_OAUTH_CLIENT_ID?.trim();
  if (!clientId) {
    throw new Error("BONDERY_PUBLIC_OAUTH_CLIENT_ID is not set");
  }

  const redirectUris = resolveExtensionRedirectUris();

  await prisma.oauthClient.upsert({
    create: {
      clientId,
      clientSecret: null,
      grantTypes: ["authorization_code", "refresh_token"],
      id: generateId(),
      name: "Bondery Chrome Extension",
      public: true,
      redirectUris,
      requirePKCE: true,
      responseTypes: ["code"],
      scopes: [...OAUTH_PROVIDER_SCOPES],
      skipConsent: false,
      tokenEndpointAuthMethod: "none",
      type: "user-agent-based",
    },
    update: {
      disabled: false,
      grantTypes: ["authorization_code", "refresh_token"],
      name: "Bondery Chrome Extension",
      public: true,
      redirectUris,
      requirePKCE: true,
      responseTypes: ["code"],
      scopes: [...OAUTH_PROVIDER_SCOPES],
      tokenEndpointAuthMethod: "none",
      type: "user-agent-based",
    },
    where: { clientId },
  });

  const resourceIds = resourceIdList(resourceId);
  for (const id of resourceIds) {
    await upsertResourceLink(clientId, id);
  }
  console.log(
    `Provisioned extension OAuth client ${clientId} (redirect_uris: ${redirectUris.join(", ")}; resources: ${resourceIds.join(", ")})`,
  );
}

export async function resolveResourceId(): Promise<string> {
  const identifiers = resolveApiResourceIdentifiers();
  const canonical = identifiers[0];
  if (!canonical) {
    throw new Error("BONDERY_PUBLIC_API_URL is not set");
  }

  for (const identifier of identifiers) {
    await prisma.oauthResource.upsert({
      create: {
        allowedScopes: [...OAUTH_PROVIDER_SCOPES],
        id: generateId(),
        identifier,
        name: "Bondery API",
      },
      update: {
        allowedScopes: [...OAUTH_PROVIDER_SCOPES],
        disabled: false,
      },
      where: { identifier },
    });
  }

  return canonical;
}

/**
 * Upsert MCP resource rows (canonical + loopback aliases). First-party
 * clients are never linked here — CIMD clients pick MCP via discovery.
 * Linking REST clients to MCP would leak `mcp:*` onto webapp/extension tokens.
 */
export async function upsertMcpResources(): Promise<string> {
  const identifiers = resolveMcpResourceIdentifiers();
  const canonical = identifiers[0];
  if (!canonical) {
    throw new Error("BONDERY_PUBLIC_API_URL is not set");
  }

  for (const identifier of identifiers) {
    await prisma.oauthResource.upsert({
      create: {
        allowedScopes: [...MCP_OAUTH_SCOPES],
        id: generateId(),
        identifier,
        name: "Bondery MCP",
      },
      update: {
        allowedScopes: [...MCP_OAUTH_SCOPES],
        disabled: false,
      },
      where: { identifier },
    });
  }

  return canonical;
}

export async function provisionOAuthClients(): Promise<void> {
  assertDistinctFirstPartyOAuthClientIds(
    process.env.BONDERY_PUBLIC_OAUTH_CLIENT_ID,
    process.env.BONDERY_PUBLIC_WEBAPP_OAUTH_CLIENT_ID,
  );
  await resolveResourceId();
  await upsertMcpResources();
  const resourceIds = resolveApiResourceIdentifiers();
  await provisionWebappClient(resourceIds);
  await provisionExtensionClient(resourceIds);
  await disableDcrOAuthClients();
}
