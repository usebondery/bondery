import { randomUUID } from "node:crypto";
import { prisma } from "@bondery/db";
import type { DomainContext } from "../../domains/_shared/context.js";
import { captureProductEvent } from "../analytics/posthog-capture.js";
import {
  CARDDAV_KEY_CONFIG_ID,
  DEVICE_TRANSACTION_TIMEOUT_MS,
  forgetKeys,
  lockUserDevices,
} from "./device-keys.js";

/**
 * Disconnects every device. One transaction deletes the user's device keys (the device rows
 * cascade) and the cards with their versions, and resets the kept address-book row with a new
 * random `generation`, so a token from an earlier connection can never match. It also sets
 * `projection_version` to 0 and clears the rebuild cursor, so the next reconcile rebuilds every
 * card from the persons instead of reading a change log that may be pruned. Persons and
 * `people_vcard_extras` stay.
 *
 * The address-book row is locked first, so a reconcile in flight finishes before the cards go
 * and cannot write cards under the new generation from stale state.
 */
export async function disconnectAllCarddavDevices(ctx: DomainContext): Promise<void> {
  const { user } = ctx;

  const apiKeyIds = await prisma.$transaction(
    async (tx) => {
      await lockUserDevices(tx, user.id);
      await tx.$queryRaw`SELECT id FROM carddav_address_books WHERE user_id = ${user.id}::uuid FOR UPDATE`;

      const keys = await tx.apikey.findMany({
        select: { id: true },
        where: { configId: CARDDAV_KEY_CONFIG_ID, referenceId: user.id },
      });
      await tx.apikey.deleteMany({
        where: { configId: CARDDAV_KEY_CONFIG_ID, referenceId: user.id },
      });
      await tx.carddavCard.deleteMany({ where: { userId: user.id } });
      await tx.carddavAddressBook.updateMany({
        data: {
          generation: randomUUID(),
          projectionVersion: 0,
          rebuildAfterPersonId: null,
          rebuildHead: null,
          reconciledThrough: 0,
          revision: 0,
          tombstoneFloor: 0,
        },
        where: { userId: user.id },
      });
      return keys.map((key) => key.id);
    },
    { timeout: DEVICE_TRANSACTION_TIMEOUT_MS },
  );

  await forgetKeys(apiKeyIds, ctx.log);
  await captureProductEvent(ctx, "carddav:disconnect_all", { device_count: apiKeyIds.length });
}
