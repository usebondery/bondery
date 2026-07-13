import type { Polar } from "@polar-sh/sdk";
import type { DomainContext } from "../../domains/_shared/context.js";
import { createAdminClient } from "../../lib/data/supabase.js";
import { getPolarClient } from "../../services/billing/polar.js";
import { deletePendingSubscription, mapStatus, upsertSubscription } from "./subscription.js";

export type SubscriptionSyncResult =
  | { synced: true; source: "pending" | "polar_api" }
  | { synced: false; reason: string };

export async function syncSubscriptionFromPolar(
  ctx: DomainContext,
): Promise<SubscriptionSyncResult> {
  const { client, user, log } = ctx;
  const email = user.email;

  const { data: existing } = await client
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .single();

  if (existing?.status === "active" || existing?.status === "canceling") {
    log?.info({ userId: user.id }, "subscription-sync: already active, skipping");
    return { reason: "already_active", synced: false };
  }

  const admin = createAdminClient();

  if (email) {
    const { data: pending } = (await admin
      .from("pending_subscriptions" as never)
      .select("*")
      .eq("email", email)
      .single()) as unknown as {
      data: {
        polar_customer_id: string;
        polar_subscription_id: string;
        status: string;
        current_period_end: string | null;
        cancel_at_period_end: boolean;
      } | null;
    };

    if (pending) {
      await upsertSubscription(
        user.id,
        pending.polar_customer_id,
        pending.polar_subscription_id,
        pending.status,
        null,
        pending.current_period_end ? new Date(pending.current_period_end) : null,
        pending.cancel_at_period_end,
      );

      await deletePendingSubscription(email);

      log?.info(
        { email, userId: user.id },
        "subscription-sync: claimed from pending_subscriptions",
      );
      return { source: "pending", synced: true };
    }
  }

  let polar: Polar;
  try {
    polar = getPolarClient();
  } catch {
    log?.warn({ userId: user.id }, "subscription-sync: Polar not configured");
    return { reason: "polar_not_configured", synced: false };
  }

  let polarCustomer: Awaited<ReturnType<Polar["customers"]["getExternal"]>>;
  try {
    polarCustomer = await polar.customers.getExternal({
      externalId: user.id,
    });
  } catch {
    log?.info({ userId: user.id }, "subscription-sync: no Polar customer found");
    return { reason: "no_polar_customer", synced: false };
  }

  const subscriptions = await polar.subscriptions.list({
    customerId: polarCustomer.id,
  });

  const activeSub =
    subscriptions.result.items.find(
      (s) => s.status === "active" || (s.status === "canceled" && s.cancelAtPeriodEnd),
    ) ?? subscriptions.result.items[0];

  if (!activeSub) {
    log?.info(
      { polarCustomerId: polarCustomer.id, userId: user.id },
      "subscription-sync: no active Polar subscription found",
    );
    return { reason: "no_active_subscription", synced: false };
  }

  const status = mapStatus(activeSub.status, activeSub.cancelAtPeriodEnd);
  const currentPeriodStart =
    (activeSub as { currentPeriodStart?: Date | null }).currentPeriodStart ?? null;
  const currentPeriodEnd = activeSub.currentPeriodEnd ?? null;

  await upsertSubscription(
    user.id,
    polarCustomer.id,
    activeSub.id,
    status,
    currentPeriodStart,
    currentPeriodEnd,
    activeSub.cancelAtPeriodEnd,
  );

  log?.info({ status, userId: user.id }, "subscription-sync: synced from Polar API");
  return { source: "polar_api", synced: true };
}
