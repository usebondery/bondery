import type { ScrapedWorkHistoryEntry } from "@bondery/schemas";
import { internal } from "../../../lib/platform/errors/http-errors.js";
import { type DomainContext, DomainError } from "../../_shared/context.js";

export async function upsertLinkedInWorkHistory(
  ctx: DomainContext,
  personId: string,
  workHistory: ScrapedWorkHistoryEntry[],
): Promise<{ success: true; count: number }> {
  const { client, user, log } = ctx;

  log?.info(
    { personId, userId: user.id, workHistory, workHistoryCount: workHistory.length },
    "[linkedin-data] POST received",
  );

  const { data: person, error: personError } = await client
    .from("people")
    .select("id")
    .eq("id", personId)
    .eq("user_id", user.id)
    .single();

  if (personError || !person) {
    throw new DomainError("Contact not found", 404, "contact_not_found");
  }

  const { data: linkedinRow, error: linkedinUpsertError } = await client
    .from("people_linkedin")
    .upsert(
      { person_id: personId, updated_at: new Date().toISOString(), user_id: user.id },
      { onConflict: "user_id,person_id" },
    )
    .select("id")
    .single();

  if (linkedinUpsertError || !linkedinRow) {
    throw internal("contact_enrich_failed_to_upsert_linkedin_profile");
  }

  const { error: deleteError } = await client
    .from("people_work_history")
    .delete()
    .eq("people_linkedin_id", linkedinRow.id)
    .eq("user_id", user.id);

  if (deleteError) {
    throw internal("contact_enrich_failed", deleteError.message);
  }

  if (workHistory.length > 0) {
    const rows = workHistory.map((entry) => ({
      company_linkedin_id: entry.companyLinkedinId ?? null,
      company_name: entry.companyName,
      employment_type: entry.employmentType ?? null,
      end_date: entry.endDate ?? null,
      location: entry.location ?? null,
      people_linkedin_id: linkedinRow.id,
      start_date: entry.startDate ?? null,
      title: entry.title ?? null,
      user_id: user.id,
    }));

    log?.info({ rows }, "[linkedin-data] Inserting rows");

    const { error: insertError } = await client.from("people_work_history").insert(rows);

    if (insertError) {
      log?.error({ insertError }, "[linkedin-data] Insert failed");
      throw internal("contact_enrich_failed", insertError.message);
    }
  }

  log?.info({ count: workHistory.length, personId }, "[linkedin-data] Upsert complete");
  return { count: workHistory.length, success: true };
}
