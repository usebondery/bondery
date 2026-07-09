import type { DomainContext } from "../../domains/_shared/context.js";
import { internal } from "../../lib/platform/errors/http-errors.js";

export async function markBulkImportCompleted(ctx: DomainContext): Promise<void> {
  const { client, user } = ctx;
  const now = new Date().toISOString();

  const { error } = await client
    .from("user_settings")
    .update({
      import_completed_at: now,
      import_followup_platform: null,
      import_followup_status: null,
    })
    .eq("user_id", user.id);

  if (error) {
    throw internal("import_failed", error.message);
  }
}
