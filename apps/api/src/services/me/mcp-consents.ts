import { prisma } from "@bondery/db";
import type { DomainContext } from "../../domains/_shared/context.js";
import { resolveTrustedOAuthClientIds } from "../../lib/auth/index.js";
import { notFound } from "../../lib/platform/errors/http-errors.js";

function firstPartyClientIds(): Set<string> {
  return resolveTrustedOAuthClientIds() ?? new Set();
}

export async function listMcpConsents(userId: string) {
  const excluded = [...firstPartyClientIds()];
  const rows = await prisma.oauthConsent.findMany({
    include: {
      client: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    where: {
      userId,
      ...(excluded.length > 0 ? { clientId: { notIn: excluded } } : {}),
    },
  });

  const consents = rows.map((row) => ({
    clientId: row.clientId,
    clientName: row.client.name?.trim() || row.clientId,
    createdAt: (row.createdAt ?? new Date(0)).toISOString(),
    id: row.id,
    scopes: row.scopes,
  }));

  return { consents, totalCount: consents.length };
}

export async function revokeMcpConsent(ctx: DomainContext, consentId: string): Promise<void> {
  const excluded = [...firstPartyClientIds()];
  const existing = await prisma.oauthConsent.findFirst({
    where: {
      id: consentId,
      userId: ctx.user.id,
      ...(excluded.length > 0 ? { clientId: { notIn: excluded } } : {}),
    },
  });

  if (!existing) {
    throw notFound("Not found", "not_found");
  }

  // JWTs stay valid until expiry (verification is JWKS-only). Revoking
  // stored refresh/access rows stops new tokens from this client.
  const revokedAt = new Date();
  await prisma.$transaction([
    prisma.oauthConsent.delete({ where: { id: existing.id } }),
    prisma.oauthRefreshToken.updateMany({
      data: { revoked: revokedAt },
      where: { clientId: existing.clientId, userId: ctx.user.id },
    }),
    prisma.oauthAccessToken.updateMany({
      data: { revoked: revokedAt },
      where: { clientId: existing.clientId, userId: ctx.user.id },
    }),
  ]);
}
