import { prisma } from "@bondery/db";
import { API_KEY_LIMITS } from "@bondery/schemas";
import { type DomainContext, DomainError } from "../../domains/_shared/context.js";
import {
  baPermissionsFromProduct,
  formatApiKeyPrefixDisplay,
  productPermissionFromBa,
} from "../../lib/auth/api-key-permissions.js";
import { auth } from "../../lib/auth/index.js";
import { internal } from "../../lib/platform/errors/http-errors.js";

/**
 * Better Auth config id of the REST keys. CardDAV device keys live in the same table under
 * `carddav`, so every query here names this id and never sees or changes a device key.
 */
const REST_API_KEY_CONFIG_ID = "default";

function mapApiKeyRow(row: {
  id: string;
  name: string | null;
  start: string | null;
  prefix: string | null;
  permissions: string | null;
  lastRequest: Date | null;
  createdAt: Date;
}) {
  return {
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    keyPrefix: formatApiKeyPrefixDisplay(row.start),
    label: row.name ?? "",
    lastUsedAt: row.lastRequest?.toISOString() ?? null,
    permission: productPermissionFromBa(row.permissions),
  };
}

export async function listApiKeys(userId: string) {
  const rows = await prisma.apikey.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      createdAt: true,
      id: true,
      lastRequest: true,
      name: true,
      permissions: true,
      prefix: true,
      start: true,
    },
    where: { configId: REST_API_KEY_CONFIG_ID, referenceId: userId },
  });

  const apiKeys = rows.map(mapApiKeyRow);
  return {
    apiKeys,
    totalCount: apiKeys.length,
  };
}

export async function createApiKey(
  ctx: DomainContext,
  input: { label: string; permission: "read" | "full" },
) {
  const { user } = ctx;

  const count = await prisma.apikey.count({
    where: { configId: REST_API_KEY_CONFIG_ID, referenceId: user.id },
  });

  if (count >= API_KEY_LIMITS.maxPerUser) {
    throw new DomainError(
      `Maximum of ${API_KEY_LIMITS.maxPerUser} API keys per account`,
      409,
      "api_key_limit_exceeded",
    );
  }

  let created: Awaited<ReturnType<typeof auth.api.createApiKey>>;
  try {
    created = await auth.api.createApiKey({
      body: {
        configId: REST_API_KEY_CONFIG_ID,
        name: input.label.trim(),
        permissions: baPermissionsFromProduct(input.permission),
        userId: user.id,
      },
    });
  } catch (error) {
    throw internal("api_key_failed", error);
  }

  if (!created?.id || !created.key) {
    throw internal("api_key_failed", "Better Auth did not return a key");
  }

  return {
    ...mapApiKeyRow({
      createdAt: new Date(created.createdAt),
      id: created.id,
      lastRequest: created.lastRequest ? new Date(created.lastRequest) : null,
      name: created.name ?? input.label.trim(),
      permissions: created.permissions ? JSON.stringify(created.permissions) : null,
      prefix: created.prefix ?? null,
      start: created.start ?? null,
    }),
    permission: input.permission,
    secret: created.key,
  };
}

export async function updateApiKeyLabel(ctx: DomainContext, apiKeyId: string, label: string) {
  const { user } = ctx;

  const existing = await prisma.apikey.findFirst({
    select: { id: true },
    where: { configId: REST_API_KEY_CONFIG_ID, id: apiKeyId, referenceId: user.id },
  });

  if (!existing) {
    throw new DomainError("API key not found", 404, "api_key_not_found");
  }

  let updated: Awaited<ReturnType<typeof auth.api.updateApiKey>>;
  try {
    updated = await auth.api.updateApiKey({
      body: {
        configId: REST_API_KEY_CONFIG_ID,
        keyId: apiKeyId,
        name: label.trim(),
        userId: user.id,
      },
    });
  } catch (error) {
    throw internal("api_key_failed", error);
  }

  if (!updated?.id) {
    throw internal("api_key_failed", "Better Auth did not return the updated key");
  }

  return mapApiKeyRow({
    createdAt: new Date(updated.createdAt),
    id: updated.id,
    lastRequest: updated.lastRequest ? new Date(updated.lastRequest) : null,
    name: updated.name ?? label.trim(),
    permissions: updated.permissions ? JSON.stringify(updated.permissions) : null,
    prefix: updated.prefix ?? null,
    start: updated.start ?? null,
  });
}

export async function deleteApiKey(ctx: DomainContext, apiKeyId: string): Promise<void> {
  const { user } = ctx;

  const deleted = await prisma.apikey.deleteMany({
    where: { configId: REST_API_KEY_CONFIG_ID, id: apiKeyId, referenceId: user.id },
  });

  if (deleted.count === 0) {
    throw new DomainError("API key not found", 404, "api_key_not_found");
  }
}
