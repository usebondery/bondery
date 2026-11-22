import type {
  Contact,
  MergeRecommendationReason,
  MergeRecommendationsResponse,
} from "@bondery/schemas";
import type { DomainContext } from "../../domains/_shared/context.js";
import { domainDb } from "../../domains/_shared/domain-db.js";
import { attachContactExtras, type FullContactExtras } from "../../lib/contacts/enrichment.js";
import { contactDetailSelect, mapContactDetailRecord } from "../../lib/data/prisma-mappers.js";
import type { extractAvatarOptions } from "../../lib/data/select-fragments.js";
import { withEmptyChannels, withEmptySocials } from "./helpers.js";

type MergeRecommendationRow = {
  id: string;
  left_person_id: string;
  right_person_id: string;
  score: number | null;
  reasons: unknown;
};

type MergeRecommendationsContext = Pick<DomainContext, "db" | "user"> & {
  log?: { error: (payload: unknown, message: string) => void };
};

export type { MergeRecommendationRow };

export async function hydrateMergeRecommendations(
  ctx: MergeRecommendationsContext,
  recommendationRows: MergeRecommendationRow[],
  avatarOptions: ReturnType<typeof extractAvatarOptions>,
): Promise<MergeRecommendationsResponse["recommendations"]> {
  const { user } = ctx;
  const db = domainDb(ctx as DomainContext);
  const personIds = Array.from(
    new Set(recommendationRows.flatMap((row) => [row.left_person_id, row.right_person_id])),
  );

  if (personIds.length === 0) {
    return [];
  }

  const personRows = await db.people.findMany({
    select: contactDetailSelect,
    where: { id: { in: personIds }, userId: user.id },
  });

  const mappedContacts = personRows.map(mapContactDetailRecord);

  let enrichedContacts: Array<{ id: string } & FullContactExtras>;
  try {
    enrichedContacts = await attachContactExtras(db, user.id, mappedContacts, {
      addresses: true,
      avatarOptions,
    });
  } catch (error) {
    ctx.log?.error({ err: error }, "Failed to attach contact extras for merge recommendations");
    enrichedContacts = withEmptySocials(withEmptyChannels(mappedContacts));
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
