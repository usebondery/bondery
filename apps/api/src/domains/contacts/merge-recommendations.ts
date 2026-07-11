import type {
  MergeRecommendationReason,
  MergeRecommendationsCountResponse,
  RefreshMergeRecommendationsResponse,
} from "@bondery/schemas";
import {
  countSetOverlap,
  diceCoefficient,
  MERGE_RECOMMENDATION_ALGORITHM_VERSION,
  type MergeRecommendationCandidate,
  normalizeEmailValue,
  normalizePhoneValue,
  normalizeSocialHandle,
  toFullNameKey,
} from "../../lib/contacts/merge-helpers.js";
import type { extractAvatarOptions } from "../../lib/data/select-fragments.js";
import { internal } from "../../lib/platform/errors/http-errors.js";
import { hydrateMergeRecommendations } from "../../services/contacts/merge-recommendations.js";
import { type DomainContext, DomainError } from "../_shared/context.js";

export { patchAffectsMergeRecommendations } from "@bondery/helpers/contact";

export interface RefreshMergeRecommendationsOptions {
  avatarOptions?: ReturnType<typeof extractAvatarOptions>;
  hydrate?: boolean;
}

export async function getMergeRecommendationsCount(
  ctx: DomainContext,
): Promise<MergeRecommendationsCountResponse> {
  const { client, user } = ctx;

  const { count, error } = await client
    .from("people_merge_recommendations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_declined", false);

  if (error) {
    throw internal("internal_server_error", error.message);
  }

  return { activeCount: count ?? 0 };
}

export async function refreshMergeRecommendations(
  ctx: DomainContext,
  options: RefreshMergeRecommendationsOptions = {},
): Promise<RefreshMergeRecommendationsResponse | { recommendationsCount: number; success: true }> {
  await recomputeMergeRecommendations(ctx);

  if (!options.hydrate) {
    const { activeCount } = await getMergeRecommendationsCount(ctx);
    return { recommendationsCount: activeCount, success: true };
  }

  const { client, user, log } = ctx;
  const { data: recommendationRows, error: recommendationsError } = await client
    .from("people_merge_recommendations")
    .select("id, left_person_id, right_person_id, score, reasons")
    .eq("user_id", user.id)
    .eq("is_declined", false)
    .order("score", { ascending: false })
    .order("created_at", { ascending: false });

  if (recommendationsError) {
    throw internal("internal_server_error", recommendationsError.message);
  }

  const recommendations = await hydrateMergeRecommendations(
    client,
    user.id,
    recommendationRows || [],
    options.avatarOptions ?? {},
    log,
  );

  return {
    recommendations,
    recommendationsCount: recommendations.length,
    success: true,
  };
}

/** Fire-and-forget recompute after mutations that affect merge matching. */
export function scheduleMergeRecommendationsRefresh(ctx: DomainContext): void {
  void refreshMergeRecommendations(ctx).catch((error) => {
    ctx.log?.error({ error }, "Failed to refresh merge recommendations after mutation");
  });
}

export async function declineMergeRecommendation(
  ctx: DomainContext,
  recommendationId: string,
): Promise<{ data: { success: true } }> {
  const id = recommendationId.trim();
  if (!id) {
    throw new DomainError("Recommendation id is required", 400, "merge_recommendation_id_required");
  }

  const { client, user } = ctx;
  const { data, error } = await client
    .from("people_merge_recommendations")
    .update({
      is_declined: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    throw internal("contact_merge_failed", error.message);
  }
  if (!data) {
    throw new DomainError("Recommendation not found", 404, "merge_recommendation_not_found");
  }

  return { data: { success: true } };
}

export async function restoreMergeRecommendation(
  ctx: DomainContext,
  recommendationId: string,
): Promise<{ data: { success: true } }> {
  const id = recommendationId.trim();
  if (!id) {
    throw new DomainError("Recommendation id is required", 400, "merge_recommendation_id_required");
  }

  const { client, user } = ctx;
  const { data, error } = await client
    .from("people_merge_recommendations")
    .update({
      is_declined: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    throw internal("contact_merge_failed", error.message);
  }
  if (!data) {
    throw new DomainError("Recommendation not found", 404, "merge_recommendation_not_found");
  }

  return { data: { success: true } };
}

export async function recomputeMergeRecommendations(ctx: DomainContext): Promise<number> {
  const { client, user } = ctx;
  const userId = user.id;

  const [
    { data: peopleRows, error: peopleError },
    { data: emailRows, error: emailError },
    { data: phoneRows, error: phoneError },
    { data: socialRows, error: socialError },
    { data: existingRows, error: existingError },
  ] = await Promise.all([
    client.from("people").select("id, first_name, last_name").eq("user_id", userId),
    client.from("people_emails").select("person_id, value").eq("user_id", userId),
    client.from("people_phones").select("person_id, prefix, value").eq("user_id", userId),
    client
      .from("people_socials")
      .select("person_id, platform, handle")
      .eq("user_id", userId)
      .in("platform", ["linkedin", "facebook"]),
    client
      .from("people_merge_recommendations")
      .select("id, left_person_id, right_person_id, is_declined")
      .eq("user_id", userId),
  ]);

  if (peopleError || emailError || phoneError || socialError || existingError) {
    throw internal(
      "contact_merge_recommendations_recompute_failed",
      peopleError ?? emailError ?? phoneError ?? socialError ?? existingError,
    );
  }

  const people = peopleRows || [];
  if (people.length < 2) {
    if ((existingRows || []).length > 0) {
      const { error: clearError } = await client
        .from("people_merge_recommendations")
        .delete()
        .eq("user_id", userId)
        .eq("is_declined", false);

      if (clearError) {
        throw internal("contact_merge_failed", clearError.message);
      }
    }

    return 0;
  }

  const emailsByPerson = new Map<string, Set<string>>();
  for (const row of emailRows || []) {
    const normalized = normalizeEmailValue(row.value || "");
    if (!normalized) {
      continue;
    }

    const bucket = emailsByPerson.get(row.person_id) || new Set<string>();
    bucket.add(normalized);
    emailsByPerson.set(row.person_id, bucket);
  }

  const phonesByPerson = new Map<string, Set<string>>();
  for (const row of phoneRows || []) {
    const normalized = normalizePhoneValue(row.prefix, row.value || "");
    if (!normalized) {
      continue;
    }

    const bucket = phonesByPerson.get(row.person_id) || new Set<string>();
    bucket.add(normalized);
    phonesByPerson.set(row.person_id, bucket);
  }

  const socialByPerson = new Map<string, { linkedin: string; facebook: string }>();
  for (const row of socialRows || []) {
    const normalized = normalizeSocialHandle(row.handle || "");
    if (!normalized) {
      continue;
    }

    const existing = socialByPerson.get(row.person_id) || { facebook: "", linkedin: "" };
    if (row.platform === "linkedin") {
      existing.linkedin = normalized;
    }
    if (row.platform === "facebook") {
      existing.facebook = normalized;
    }
    socialByPerson.set(row.person_id, existing);
  }

  const candidates: MergeRecommendationCandidate[] = [];
  for (let leftIndex = 0; leftIndex < people.length; leftIndex += 1) {
    const leftPerson = people[leftIndex];
    const leftName = toFullNameKey(leftPerson);
    const leftEmails = emailsByPerson.get(leftPerson.id) || new Set<string>();
    const leftPhones = phonesByPerson.get(leftPerson.id) || new Set<string>();
    const leftSocial = socialByPerson.get(leftPerson.id) || { facebook: "", linkedin: "" };

    for (let rightIndex = leftIndex + 1; rightIndex < people.length; rightIndex += 1) {
      const rightPerson = people[rightIndex];
      const rightName = toFullNameKey(rightPerson);
      const rightEmails = emailsByPerson.get(rightPerson.id) || new Set<string>();
      const rightPhones = phonesByPerson.get(rightPerson.id) || new Set<string>();
      const rightSocial = socialByPerson.get(rightPerson.id) || { facebook: "", linkedin: "" };

      const hasLinkedinConflict =
        Boolean(leftSocial.linkedin) &&
        Boolean(rightSocial.linkedin) &&
        leftSocial.linkedin !== rightSocial.linkedin;
      const hasFacebookConflict =
        Boolean(leftSocial.facebook) &&
        Boolean(rightSocial.facebook) &&
        leftSocial.facebook !== rightSocial.facebook;

      if (hasLinkedinConflict || hasFacebookConflict) {
        continue;
      }

      const fullNameScore = diceCoefficient(leftName, rightName);
      const emailOverlapCount = countSetOverlap(leftEmails, rightEmails);
      const phoneOverlapCount = countSetOverlap(leftPhones, rightPhones);

      const reasons: MergeRecommendationReason[] = [];
      if (fullNameScore >= 0.84) {
        reasons.push("fullName");
      }
      if (emailOverlapCount > 0) {
        reasons.push("email");
      }
      if (phoneOverlapCount > 0) {
        reasons.push("phone");
      }

      if (reasons.length === 0) {
        continue;
      }

      const leftPersonId = leftPerson.id < rightPerson.id ? leftPerson.id : rightPerson.id;
      const rightPersonId = leftPerson.id < rightPerson.id ? rightPerson.id : leftPerson.id;

      const score = Math.min(
        1,
        fullNameScore * 0.6 +
          Math.min(emailOverlapCount, 1) * 0.25 +
          Math.min(phoneOverlapCount, 1) * 0.2,
      );

      candidates.push({
        leftPersonId,
        reasons,
        rightPersonId,
        score,
      });
    }
  }

  const existingByPair = new Map(
    (existingRows || []).map((row) => [`${row.left_person_id}|${row.right_person_id}`, row]),
  );
  const nextPairKeys = new Set(
    candidates.map((candidate) => `${candidate.leftPersonId}|${candidate.rightPersonId}`),
  );
  const newCandidatesCount = candidates.filter(
    (candidate) => !existingByPair.has(`${candidate.leftPersonId}|${candidate.rightPersonId}`),
  ).length;

  if (candidates.length > 0) {
    const rowsToUpsert = candidates.map((candidate) => {
      const key = `${candidate.leftPersonId}|${candidate.rightPersonId}`;
      const existing = existingByPair.get(key);

      return {
        algorithm_version: MERGE_RECOMMENDATION_ALGORITHM_VERSION,
        is_declined: existing?.is_declined || false,
        left_person_id: candidate.leftPersonId,
        reasons: candidate.reasons,
        right_person_id: candidate.rightPersonId,
        score: candidate.score,
        user_id: userId,
      };
    });

    const { error: upsertError } = await client
      .from("people_merge_recommendations")
      .upsert(rowsToUpsert, {
        onConflict: "user_id,left_person_id,right_person_id",
      });

    if (upsertError) {
      throw internal("contact_merge_failed", upsertError.message);
    }
  }

  const staleActiveIds = (existingRows || [])
    .filter((row) => !row.is_declined)
    .filter((row) => !nextPairKeys.has(`${row.left_person_id}|${row.right_person_id}`))
    .map((row) => row.id);

  if (staleActiveIds.length > 0) {
    const { error: deleteStaleError } = await client
      .from("people_merge_recommendations")
      .delete()
      .eq("user_id", userId)
      .in("id", staleActiveIds);

    if (deleteStaleError) {
      throw internal("contact_merge_failed", deleteStaleError.message);
    }
  }

  return newCandidatesCount;
}
