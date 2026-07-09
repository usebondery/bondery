import type {
  Contact,
  MergeRecommendationReason,
  MergeRecommendationsResponse,
} from "@bondery/schemas";
import type { Database } from "@bondery/schemas/supabase.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { attachContactExtras, type FullContactExtras } from "../../lib/contacts/enrichment.js";
import { CONTACT_SELECT, type extractAvatarOptions } from "../../lib/data/select-fragments.js";
import { internal } from "../../lib/platform/errors/http-errors.js";
import { withEmptyChannels, withEmptySocials } from "./helpers.js";

export type MergeRecommendationRow = {
  id: string;
  left_person_id: string;
  right_person_id: string;
  score: number | null;
  reasons: unknown;
};

type ServiceLog = {
  error: (payload: unknown, message: string) => void;
};

export async function hydrateMergeRecommendations(
  client: SupabaseClient<Database>,
  userId: string,
  recommendationRows: MergeRecommendationRow[],
  avatarOptions: ReturnType<typeof extractAvatarOptions>,
  log?: ServiceLog,
): Promise<MergeRecommendationsResponse["recommendations"]> {
  const personIds = Array.from(
    new Set(recommendationRows.flatMap((row) => [row.left_person_id, row.right_person_id])),
  );

  if (personIds.length === 0) {
    return [];
  }

  const { data: personRows, error: personRowsError } = await client
    .from("people")
    .select(CONTACT_SELECT)
    .eq("user_id", userId)
    .in("id", personIds);

  if (personRowsError) {
    throw internal("internal_server_error", personRowsError.message);
  }

  let enrichedContacts: Array<{ id: string } & FullContactExtras> = [];
  try {
    enrichedContacts = await attachContactExtras(client, userId, personRows || [], {
      addresses: true,
      avatarOptions,
    });
  } catch (enrichError) {
    log?.error({ enrichError }, "Failed to attach contact extras for merge recommendations");
    enrichedContacts = withEmptySocials(withEmptyChannels(personRows || []));
  }

  const contactsById = new Map(enrichedContacts.map((contact) => [contact.id, contact]));
  const allowedReasons: MergeRecommendationReason[] = ["fullName", "email", "phone"];
  const recommendations: MergeRecommendationsResponse["recommendations"] = [];

  for (const row of recommendationRows) {
    const leftPerson = contactsById.get(row.left_person_id);
    const rightPerson = contactsById.get(row.right_person_id);

    if (!leftPerson || !rightPerson) {
      continue;
    }

    const reasons = (Array.isArray(row.reasons) ? row.reasons : []).filter((reason) =>
      allowedReasons.includes(reason as MergeRecommendationReason),
    ) as MergeRecommendationReason[];

    recommendations.push({
      id: row.id,
      leftPerson: leftPerson as Contact,
      reasons,
      rightPerson: rightPerson as Contact,
      score: Number(row.score) || 0,
    });
  }

  return recommendations;
}
