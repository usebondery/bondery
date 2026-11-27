/**
 * CardDAV device lifecycle for `/me/carddav`. One device is one Better Auth key (config
 * `carddav`) plus one `carddav_devices` row. Every query filters by the signed-in user, so
 * another user's device id answers 404.
 *
 * Better Auth writes outside a Prisma transaction. Each flow orders its writes so a failure
 * never leaves a device without a key or a key that a device row does not own.
 */

import { prisma } from "@bondery/db";
import type { CarddavCredentials, CarddavDevice, CarddavSettings } from "@bondery/schemas";
import { CARDDAV_LIMITS } from "@bondery/schemas";
import { type DomainContext, DomainError } from "../../domains/_shared/context.js";
import { ensureAddressBook } from "../../lib/carddav/address-book.js";
import { captureProductEvent } from "../analytics/posthog-capture.js";
import { assertCardDavAllowed } from "./assert-card-dav-allowed.js";
import {
  CARDDAV_KEY_CONFIG_ID,
  createDeviceKey,
  DEVICE_SELECT,
  DEVICE_TRANSACTION_TIMEOUT_MS,
  deleteDeviceKey,
  forgetKeys,
  lockUserDevices,
  mapDevice,
} from "./device-keys.js";

type DeviceWithCredentials = { credentials: CarddavCredentials; device: CarddavDevice };

function deviceNotFound(): DomainError {
  return new DomainError("Device not found", 404, "carddav_device_not_found");
}

/** True when a device row points at the key. Decides whether a failed rotate may delete it. */
async function isKeyOwned(apiKeyId: string): Promise<boolean> {
  const device = await prisma.carddavDevice.findUnique({
    select: { id: true },
    where: { apiKeyId },
  });
  return device !== null;
}

/** Lists the user's devices for `GET /me/carddav`. */
export async function getCarddavSettings(
  ctx: DomainContext,
  deployment: { isEnabled: boolean; serverUrl: string },
): Promise<CarddavSettings> {
  const base = {
    enabled: deployment.isEnabled,
    maxDevices: CARDDAV_LIMITS.maxDevicesPerUser,
    serverUrl: deployment.serverUrl,
    username: ctx.user.id,
  };
  if (!deployment.isEnabled) {
    return { ...base, devices: [] };
  }

  const rows = await prisma.carddavDevice.findMany({
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: DEVICE_SELECT,
    where: { userId: ctx.user.id },
  });
  return { ...base, devices: rows.map(mapDevice) };
}

/**
 * Connects a device. Holds the per-user lock from the cap check to the device insert, so six
 * parallel creates end with exactly five devices. If the insert fails after the key exists,
 * the key is deleted before the error leaves.
 */
export async function createCarddavDevice(
  ctx: DomainContext,
  input: { name: string },
  serverUrl: string,
): Promise<DeviceWithCredentials> {
  const { user } = ctx;
  await assertCardDavAllowed(user);

  let createdKeyId: string | null = null;
  try {
    const result = await prisma.$transaction(
      async (tx) => {
        await lockUserDevices(tx, user.id);

        const deviceCount = await tx.carddavDevice.count({ where: { userId: user.id } });
        if (deviceCount >= CARDDAV_LIMITS.maxDevicesPerUser) {
          throw new DomainError(
            `Maximum of ${CARDDAV_LIMITS.maxDevicesPerUser} devices per account`,
            409,
            "carddav_device_limit_exceeded",
          );
        }

        await ensureAddressBook(tx, user.id);
        const key = await createDeviceKey(user.id, input.name);
        createdKeyId = key.id;

        const device = await tx.carddavDevice.create({
          data: { apiKeyId: key.id, name: input.name, userId: user.id },
          select: DEVICE_SELECT,
        });
        return { device: mapDevice(device), password: key.password };
      },
      { timeout: DEVICE_TRANSACTION_TIMEOUT_MS },
    );

    await captureProductEvent(ctx, "carddav:device_create");
    return {
      credentials: { password: result.password, serverUrl, username: user.id },
      device: result.device,
    };
  } catch (error) {
    if (createdKeyId) {
      await deleteDeviceKey(createdKeyId, user.id, ctx.log);
    }
    throw error;
  }
}

/** Renames the device row and its key in one transaction. */
export async function renameCarddavDevice(
  ctx: DomainContext,
  deviceId: string,
  name: string,
): Promise<CarddavDevice> {
  const { user } = ctx;

  return prisma.$transaction(async (tx) => {
    await lockUserDevices(tx, user.id);

    const existing = await tx.carddavDevice.findFirst({
      select: { apiKeyId: true },
      where: { id: deviceId, userId: user.id },
    });
    if (!existing) {
      throw deviceNotFound();
    }

    await tx.apikey.updateMany({
      data: { name },
      where: { configId: CARDDAV_KEY_CONFIG_ID, id: existing.apiKeyId, referenceId: user.id },
    });
    const device = await tx.carddavDevice.update({
      data: { name },
      select: DEVICE_SELECT,
      where: { id: deviceId },
    });
    return mapDevice(device);
  });
}

/**
 * Replaces the device key. The new key exists and the device row points at it before the old
 * key goes, so the device always has a key. If the old key cannot be deleted, the rotation
 * still holds: no device row points at the old key, so the DAV shell rejects it.
 */
export async function rotateCarddavDevice(
  ctx: DomainContext,
  deviceId: string,
  serverUrl: string,
): Promise<DeviceWithCredentials> {
  const { user } = ctx;
  await assertCardDavAllowed(user);

  let newKeyId: string | null = null;
  try {
    const result = await prisma.$transaction(
      async (tx) => {
        await lockUserDevices(tx, user.id);

        const existing = await tx.carddavDevice.findFirst({
          select: { apiKeyId: true, name: true },
          where: { id: deviceId, userId: user.id },
        });
        if (!existing) {
          throw deviceNotFound();
        }

        const key = await createDeviceKey(user.id, existing.name);
        newKeyId = key.id;

        const device = await tx.carddavDevice.update({
          data: { apiKeyId: key.id },
          select: DEVICE_SELECT,
          where: { id: deviceId },
        });
        return { device: mapDevice(device), oldKeyId: existing.apiKeyId, password: key.password };
      },
      { timeout: DEVICE_TRANSACTION_TIMEOUT_MS },
    );

    await deleteDeviceKey(result.oldKeyId, user.id, ctx.log);
    await forgetKeys([result.oldKeyId], ctx.log);

    await captureProductEvent(ctx, "carddav:device_rotate");
    return {
      credentials: { password: result.password, serverUrl, username: user.id },
      device: result.device,
    };
  } catch (error) {
    if (newKeyId && !(await isKeyOwned(newKeyId))) {
      await deleteDeviceKey(newKeyId, user.id, ctx.log);
    }
    throw error;
  }
}

/** Revokes a device by deleting its key. The device row cascades. */
export async function deleteCarddavDevice(ctx: DomainContext, deviceId: string): Promise<void> {
  const { user } = ctx;

  const apiKeyId = await prisma.$transaction(async (tx) => {
    await lockUserDevices(tx, user.id);

    const existing = await tx.carddavDevice.findFirst({
      select: { apiKeyId: true },
      where: { id: deviceId, userId: user.id },
    });
    if (!existing) {
      throw deviceNotFound();
    }

    await tx.apikey.deleteMany({
      where: { configId: CARDDAV_KEY_CONFIG_ID, id: existing.apiKeyId, referenceId: user.id },
    });
    return existing.apiKeyId;
  });

  await forgetKeys([apiKeyId], ctx.log);
  await captureProductEvent(ctx, "carddav:device_revoke");
}

/** Clears the mass-change guard pause so the device can write again. */
export async function resumeCarddavDevice(
  ctx: DomainContext,
  deviceId: string,
): Promise<CarddavDevice> {
  const { user } = ctx;

  const updated = await prisma.carddavDevice.updateMany({
    data: { pausedAt: null },
    where: { id: deviceId, userId: user.id },
  });
  if (updated.count === 0) {
    throw deviceNotFound();
  }

  const device = await prisma.carddavDevice.findFirstOrThrow({
    select: DEVICE_SELECT,
    where: { id: deviceId, userId: user.id },
  });
  return mapDevice(device);
}
