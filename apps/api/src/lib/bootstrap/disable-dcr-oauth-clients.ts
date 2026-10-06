/**
 * Hard-cut RFC 7591 DCR clients after CIMD-only MCP OAuth.
 *
 * A SQL migration cannot see env first-party client ids. Call this from
 * `provisionOAuthClients()` so boot and `release-migrate` share one path.
 * Keep rows (tokens FK to `oauth_client`). Disable, revoke tokens, delete consents.
 */
import { prisma } from "@bondery/db";
import { CIMD_CLIENT_DISCOVERY_ID, resolveTrustedOAuthClientIds } from "../auth/index.js";

export type DisableDcrOAuthClientsResult = {
  clientIds: string[];
};

/**
 * DCR = not CIMD (`clientDiscoveryId === "cimd"`) and not a first-party REST
 * client id. Prisma `not: "cimd"` does not match SQL NULL, so include nulls.
 */
function dcrOAuthClientWhere(trustedClientIds: string[]) {
  return {
    AND: [
      {
        OR: [{ clientDiscoveryId: null }, { clientDiscoveryId: { not: CIMD_CLIENT_DISCOVERY_ID } }],
      },
      { clientId: { notIn: trustedClientIds } },
    ],
  };
}

export async function disableDcrOAuthClients(): Promise<DisableDcrOAuthClientsResult> {
  const trusted = resolveTrustedOAuthClientIds();
  if (!trusted || trusted.size < 2) {
    throw new Error(
      "Cannot disable DCR OAuth clients unless BONDERY_PUBLIC_OAUTH_CLIENT_ID and BONDERY_PUBLIC_WEBAPP_OAUTH_CLIENT_ID are both set",
    );
  }

  const trustedClientIds = [...trusted];
  const dcrClients = await prisma.oauthClient.findMany({
    select: { clientId: true },
    where: dcrOAuthClientWhere(trustedClientIds),
  });
  const clientIds = dcrClients.map((row) => row.clientId);
  if (clientIds.length === 0) {
    return { clientIds };
  }

  const revokedAt = new Date();
  await prisma.$transaction([
    prisma.oauthClient.updateMany({
      data: { disabled: true },
      where: { clientId: { in: clientIds } },
    }),
    prisma.oauthAccessToken.updateMany({
      data: { revoked: revokedAt },
      where: { clientId: { in: clientIds }, revoked: null },
    }),
    prisma.oauthRefreshToken.updateMany({
      data: { revoked: revokedAt },
      where: { clientId: { in: clientIds }, revoked: null },
    }),
    prisma.oauthConsent.deleteMany({
      where: { clientId: { in: clientIds } },
    }),
  ]);

  console.log(`Disabled ${clientIds.length} DCR OAuth client(s)`);
  return { clientIds };
}
