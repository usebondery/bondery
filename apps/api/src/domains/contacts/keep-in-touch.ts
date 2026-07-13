import type { KeepInTouchCountResponse } from "@bondery/schemas";
import { internal } from "../../lib/platform/errors/http-errors.js";
import type { DomainContext } from "../_shared/context.js";

export async function getKeepInTouchOverdueCount(
  ctx: DomainContext,
): Promise<KeepInTouchCountResponse> {
  const { client, user } = ctx;

  const { data, error } = await client.rpc("get_keep_in_touch_overdue_count", {
    p_user_id: user.id,
  });

  if (error) {
    throw internal("internal_server_error", error.message);
  }

  return { overdueCount: typeof data === "number" ? data : 0 };
}
