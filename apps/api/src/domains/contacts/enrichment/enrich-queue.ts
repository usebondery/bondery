import { internal } from "../../../lib/platform/errors/http-errors.js";
import { type DomainContext, DomainError } from "../../_shared/context.js";

export async function initEnrichQueue(
  ctx: DomainContext,
  personId?: string,
): Promise<{ totalEligible: number }> {
  const { client, user } = ctx;

  await client.from("linkedin_enrich_queue").delete().eq("user_id", user.id);

  if (personId) {
    const { data: person, error: personError } = await client
      .from("people")
      .select("id")
      .eq("id", personId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (personError) {
      throw internal("contact_enrich_failed", personError.message);
    }
    if (!person) {
      throw new DomainError("Contact not found", 404, "contact_not_found");
    }

    const { error: insertError } = await client.from("linkedin_enrich_queue").insert({
      person_id: personId,
      status: "pending" as const,
      user_id: user.id,
    });

    if (insertError) {
      throw internal("contact_enrich_failed", insertError.message);
    }

    return { totalEligible: 1 };
  }

  const { data: eligible, error: rpcError } = await client.rpc("get_linkedin_enrich_eligible", {
    p_user_id: user.id,
  });

  if (rpcError) {
    throw internal("contact_enrich_failed", rpcError.message);
  }

  const rows = eligible || [];
  const totalEligible = rows.length;

  if (totalEligible === 0) {
    return { totalEligible: 0 };
  }

  const queueRows = rows.map((r: { person_id: string }) => ({
    person_id: r.person_id,
    status: "pending" as const,
    user_id: user.id,
  }));

  const { error: insertError } = await client.from("linkedin_enrich_queue").insert(queueRows);

  if (insertError) {
    throw internal("contact_enrich_failed", insertError.message);
  }

  return { totalEligible };
}

export async function updateEnrichQueueItem(
  ctx: DomainContext,
  queueItemId: string,
  status: "completed" | "failed",
  errorMessage?: string | null,
): Promise<{ success: true }> {
  const { client, user } = ctx;

  const { error } = await client
    .from("linkedin_enrich_queue")
    .update({
      error_message: errorMessage ?? null,
      status,
    })
    .eq("id", queueItemId)
    .eq("user_id", user.id);

  if (error) {
    throw internal("contact_enrich_failed", error.message);
  }

  return { success: true };
}

export async function cancelEnrichQueue(ctx: DomainContext): Promise<{ success: true }> {
  const { client, user } = ctx;

  const { error } = await client.from("linkedin_enrich_queue").delete().eq("user_id", user.id);

  if (error) {
    throw internal("contact_enrich_failed", error.message);
  }

  return { success: true };
}
