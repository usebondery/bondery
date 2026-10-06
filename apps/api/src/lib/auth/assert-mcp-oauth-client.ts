/**
 * MCP access JWTs are verified with JWKS only. `oauth_access_token.revoked`
 * is not consulted. After the DCR hard-cut, disabled or non-CIMD clients
 * must fail here or unexpired JWTs keep calling tools.
 */

import { prisma } from "@bondery/db";
import { APIError } from "better-call";
import type { JWTPayload } from "jose";
import { CIMD_CLIENT_DISCOVERY_ID } from "./index.js";

function oauthClientIdFromAccessToken(payload: JWTPayload): string | null {
  if (typeof payload.client_id === "string" && payload.client_id) {
    return payload.client_id;
  }
  if (typeof payload.azp === "string" && payload.azp) {
    return payload.azp;
  }
  return null;
}

function unauthorizedInvalidToken(): never {
  throw new APIError("UNAUTHORIZED", { message: "invalid access token" });
}

export async function assertActiveCimdMcpOAuthClient(payload: JWTPayload): Promise<void> {
  const clientId = oauthClientIdFromAccessToken(payload);
  if (!clientId) {
    unauthorizedInvalidToken();
  }

  const client = await prisma.oauthClient.findUnique({
    select: { clientDiscoveryId: true, disabled: true },
    where: { clientId },
  });

  if (!client || client.disabled || client.clientDiscoveryId !== CIMD_CLIENT_DISCOVERY_ID) {
    unauthorizedInvalidToken();
  }
}
