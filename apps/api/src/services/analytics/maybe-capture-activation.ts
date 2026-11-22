import type { DomainContext } from "../../domains/_shared/context.js";
import { domainDb } from "../../domains/_shared/domain-db.js";
import { captureProductEvent } from "./posthog-capture.js";

export type ActivationType = "first_contact" | "first_import" | "first_interaction" | "first_group";

/**
 * Fires `signup_flow:activation_complete` once when the user reaches a milestone
 * (first contact, import, interaction, or group).
 */
export async function maybeCaptureActivation(
  ctx: DomainContext,
  activationType: ActivationType,
): Promise<void> {
  const db = domainDb(ctx);
  const { user } = ctx;

  let isFirst = false;

  switch (activationType) {
    case "first_contact": {
      const count = await db.people.count({
        where: { myself: false, userId: user.id },
      });
      isFirst = count === 1;
      break;
    }
    case "first_group": {
      const count = await db.group.count({ where: { userId: user.id } });
      isFirst = count === 1;
      break;
    }
    case "first_interaction": {
      const count = await db.interaction.count({ where: { userId: user.id } });
      isFirst = count === 1;
      break;
    }
    case "first_import": {
      const settings = await db.userSettings.findUnique({
        select: { importCompletedAt: true },
        where: { userId: user.id },
      });
      isFirst = settings?.importCompletedAt !== null && settings?.importCompletedAt !== undefined;
      break;
    }
  }

  if (!isFirst) {
    return;
  }

  await captureProductEvent(ctx, "signup_flow:activation_complete", {
    activation_type: activationType,
  });
}
