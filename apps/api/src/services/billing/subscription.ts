import { createAdminClient } from "../../lib/data/supabase.js";
import { internal } from "../../lib/platform/errors/http-errors.js";

export async function findUserIdByEmail(email: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc(
    "get_user_id_by_email" as never,
    {
      p_email: email,
    } as never,
  );

  if (error) {
    throw internal("billing_user_lookup_failed", error);
  }

  return (data as string | null) ?? null;
}

export async function upsertSubscription(
  userId: string,
  polarCustomerId: string,
  polarSubscriptionId: string,
  status: string,
  currentPeriodStart: Date | null,
  currentPeriodEnd: Date | null,
  cancelAtPeriodEnd: boolean,
): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin.from("subscriptions").upsert(
    {
      cancel_at_period_end: cancelAtPeriodEnd,
      current_period_end: currentPeriodEnd ? currentPeriodEnd.toISOString() : null,
      current_period_start: currentPeriodStart ? currentPeriodStart.toISOString() : null,
      polar_customer_id: polarCustomerId,
      polar_subscription_id: polarSubscriptionId,
      status,
      user_id: userId,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw internal("billing_subscription_upsert_failed", error);
  }
}

export async function storePendingSubscription(
  email: string,
  polarCustomerId: string,
  polarSubscriptionId: string,
  status: string,
  currentPeriodEnd: Date | null,
  cancelAtPeriodEnd: boolean,
): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin.from("pending_subscriptions" as never).upsert(
    {
      cancel_at_period_end: cancelAtPeriodEnd,
      current_period_end: currentPeriodEnd ? currentPeriodEnd.toISOString() : null,
      email,
      polar_customer_id: polarCustomerId,
      polar_subscription_id: polarSubscriptionId,
      status,
    } as never,
    { onConflict: "email" },
  );

  if (error) {
    throw internal("billing_pending_subscription_store_failed", error);
  }
}

export async function deletePendingSubscription(email: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("pending_subscriptions" as never)
    .delete()
    .eq("email", email as never);
}

export function mapStatus(polarStatus: string, cancelAtPeriodEnd: boolean): string {
  switch (polarStatus) {
    case "active":
      return cancelAtPeriodEnd ? "canceling" : "active";
    case "trialing":
      return "active";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    case "past_due":
    case "incomplete":
    case "unpaid":
      return "past_due";
    default:
      return "past_due";
  }
}
