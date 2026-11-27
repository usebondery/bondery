/**
 * Shared pieces of the CardDAV device lifecycle: the per-user lock, the Better Auth key calls,
 * and the response mapper.
 *
 * Better Auth writes outside a Prisma transaction, so a caller that creates a key and then
 * fails must delete the key again with `deleteDeviceKey`.
 */

import type { Prisma } from "@bondery/db";
import { prisma } from "@bondery/db";
import type { CarddavDevice } from "@bondery/schemas";
import { auth } from "../../lib/auth/index.js";
import { forgetDavKeys } from "../../lib/platform/auth/dav-auth.js";
import { internal } from "../../lib/platform/errors/http-errors.js";

/** Better Auth config id of the device keys. REST keys use `default`. */
const CARDDAV_KEY_CONFIG_ID = "carddav";

/** Transaction budget in ms. It covers one Better Auth key hash and a few small queries. */
const DEVICE_TRANSACTION_TIMEOUT_MS = 15_000;

type DeviceRow = {
  apiKey: { start: string | null };
  clientFamily: string | null;
  createdAt: Date;
  id: string;
  lastSeenAt: Date | null;
  lastSyncedAt: Date | null;
  name: string;
  pausedAt: Date | null;
};

/** Prisma select that `mapDevice` needs. */
const DEVICE_SELECT = {
  apiKey: { select: { start: true } },
  clientFamily: true,
  createdAt: true,
  id: true,
  lastSeenAt: true,
  lastSyncedAt: true,
  name: true,
  pausedAt: true,
} as const satisfies Prisma.CarddavDeviceSelect;

function isoOrNull(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function mapDevice(row: DeviceRow): CarddavDevice {
  return {
    clientFamily: row.clientFamily,
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    keyStart: row.apiKey.start ?? "",
    lastSeenAt: isoOrNull(row.lastSeenAt),
    lastSyncedAt: isoOrNull(row.lastSyncedAt),
    name: row.name,
    pausedAt: isoOrNull(row.pausedAt),
  };
}

/**
 * Serializes device changes for one user until the transaction ends. The cap check, the
 * rotation and the delete all run under it, so two parallel requests cannot both pass the cap
 * or both rotate the same device.
 */
async function lockUserDevices(tx: Prisma.TransactionClient, userId: string): Promise<void> {
  const lockName = `carddav_devices:${userId}`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockName}, 0))`;
}

/** Mints a `carddav` key for the user. The secret is in the result and never stored in clear. */
async function createDeviceKey(
  userId: string,
  name: string,
): Promise<{ id: string; password: string }> {
  let created: Awaited<ReturnType<typeof auth.api.createApiKey>>;
  try {
    created = await auth.api.createApiKey({
      body: { configId: CARDDAV_KEY_CONFIG_ID, name, userId },
    });
  } catch (error) {
    throw internal("api_key_failed", error);
  }

  if (!(created?.id && created.key)) {
    throw internal("api_key_failed", "Better Auth did not return a key");
  }
  return { id: created.id, password: created.key };
}

/**
 * Deletes a key that no device row points at, after a failed insert or update. A failure of the
 * cleanup itself is logged and does not hide the original error. The key stays unreachable:
 * the DAV shell requires a device row for every key.
 */
async function deleteDeviceKey(
  apiKeyId: string,
  userId: string,
  log: { error: (bindings: object, message: string) => void } | undefined,
): Promise<void> {
  try {
    await prisma.apikey.deleteMany({
      where: { configId: CARDDAV_KEY_CONFIG_ID, id: apiKeyId, referenceId: userId },
    });
  } catch (error) {
    log?.error({ apiKeyId, err: error }, "carddav: could not delete an orphan device key");
  }
}

/** Deletes the verify-cache entries of keys that no longer open an address book. */
async function forgetKeys(
  apiKeyIds: string[],
  log: { warn: (bindings: object, message: string) => void } | undefined,
): Promise<void> {
  await forgetDavKeys(apiKeyIds, log ?? { warn: () => undefined });
}

export {
  CARDDAV_KEY_CONFIG_ID,
  createDeviceKey,
  DEVICE_SELECT,
  DEVICE_TRANSACTION_TIMEOUT_MS,
  deleteDeviceKey,
  forgetKeys,
  lockUserDevices,
  mapDevice,
};
