import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@bondery/schemas/supabase.types";

type AppClient = SupabaseClient<Database>;

export async function markBulkImportCompleted(
  client: AppClient,
  userId: string,
): Promise<void> {
  const now = new Date().toISOString();

  const { error } = await client
    .from("user_settings")
    .update({
      import_completed_at: now,
      import_followup_status: null,
      import_followup_platform: null,
    })
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}
