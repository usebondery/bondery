import { prisma } from "@bondery/db";
import { internal } from "../../lib/platform/errors/http-errors.js";

export async function isStripeWebhookEventProcessed(eventId: string): Promise<boolean> {
  try {
    const row = await prisma.stripeWebhookEvent.findUnique({
      select: { eventId: true },
      where: { eventId },
    });
    return row != null;
  } catch (error) {
    throw internal("failed_to_process_webhook", error);
  }
}

export async function recordStripeWebhookEvent(eventId: string, eventType: string): Promise<void> {
  try {
    // Stripe can deliver the same event twice at once. The second write is a no-op.
    await prisma.stripeWebhookEvent.createMany({
      data: [{ eventId, eventType }],
      skipDuplicates: true,
    });
  } catch (error) {
    throw internal("failed_to_process_webhook", error);
  }
}
