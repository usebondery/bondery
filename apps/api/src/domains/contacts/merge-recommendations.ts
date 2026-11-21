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
import { hydrateMergeRecommendations } from "../../services/contacts/merge-recommendations.js";
import { type DomainContext, DomainError } from "../_shared/context.js";
import { domainDb } from "../_shared/domain-db.js";

export { patchAffectsMergeRecommendations } from "@bondery/helpers/contact";

export interface RefreshMergeRecommendationsOptions {
  avatarOptions?: ReturnType<typeof extractAvatarOptions>;
  hydrate?: boolean;
}

export async function getMergeRecommendationsCount(
  ctx: DomainContext,
): Promise<MergeRecommendationsCountResponse> {
  const { user } = ctx;
  const db = domainDb(ctx);

  const activeCount = await db.peopleMergeRecommendation.count({
    where: { isDeclined: false, userId: user.id },
  });

  return { activeCount };
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

  const { user } = ctx;
  const db = domainDb(ctx);

  const recommendationRows = await db.peopleMergeRecommendation.findMany({
    orderBy: [{ score: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      leftPersonId: true,
      reasons: true,
      rightPersonId: true,
      score: true,
    },
    where: { isDeclined: false, userId: user.id },
  });

  const recommendations = await hydrateMergeRecommendations(
    ctx,
    recommendationRows.map((row) => ({
      id: row.id,
      left_person_id: row.leftPersonId,
      reasons: row.reasons,
      right_person_id: row.rightPersonId,
      score: row.score,
    })),
    options.avatarOptions ?? {},
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

  const { user } = ctx;
  const db = domainDb(ctx);

  const updated = await db.peopleMergeRecommendation.updateMany({
    data: { isDeclined: true, updatedAt: new Date() },
    where: { id, userId: user.id },
  });

  if (updated.count === 0) {
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

  const { user } = ctx;
  const db = domainDb(ctx);

  const updated = await db.peopleMergeRecommendation.updateMany({
    data: { isDeclined: false, updatedAt: new Date() },
    where: { id, userId: user.id },
  });

  if (updated.count === 0) {
    throw new DomainError("Recommendation not found", 404, "merge_recommendation_not_found");
  }

  return { data: { success: true } };
}

export async function recomputeMergeRecommendations(ctx: DomainContext): Promise<number> {
  const { user } = ctx;
  const db = domainDb(ctx);
  const userId = user.id;

  const [peopleRows, emailRows, phoneRows, socialRows, existingRows] = await Promise.all([
    db.people.findMany({
      select: { firstName: true, id: true, lastName: true },
      where: { userId },
    }),
    db.peopleEmail.findMany({
      select: { personId: true, value: true },
      where: { userId },
    }),
    db.peoplePhone.findMany({
      select: { personId: true, prefix: true, value: true },
      where: { userId },
    }),
    db.peopleSocial.findMany({
      select: { handle: true, personId: true, platform: true },
      where: { platform: { in: ["linkedin", "facebook"] }, userId },
    }),
    db.peopleMergeRecommendation.findMany({
      select: { id: true, isDeclined: true, leftPersonId: true, rightPersonId: true },
      where: { userId },
    }),
  ]);

  const people = peopleRows;
  if (people.length < 2) {
    if (existingRows.length > 0) {
      await db.peopleMergeRecommendation.deleteMany({
        where: { isDeclined: false, userId },
      });
    }

    return 0;
  }

  const emailsByPerson = new Map<string, Set<string>>();
  for (const row of emailRows) {
    const normalized = normalizeEmailValue(row.value || "");
    if (!normalized) {
      continue;
    }

    const bucket = emailsByPerson.get(row.personId) ?? new Set<string>();
    bucket.add(normalized);
    emailsByPerson.set(row.personId, bucket);
  }

  const phonesByPerson = new Map<string, Set<string>>();
  for (const row of phoneRows) {
    const normalized = normalizePhoneValue(row.prefix, row.value || "");
    if (!normalized) {
      continue;
    }

    const bucket = phonesByPerson.get(row.personId) ?? new Set<string>();
    bucket.add(normalized);
    phonesByPerson.set(row.personId, bucket);
  }

  const socialByPerson = new Map<string, { linkedin: string; facebook: string }>();
  for (const row of socialRows) {
    const normalized = normalizeSocialHandle(row.handle || "");
    if (!normalized) {
      continue;
    }

    const existing = socialByPerson.get(row.personId) ?? { facebook: "", linkedin: "" };
    if (row.platform === "linkedin") {
      existing.linkedin = normalized;
    }
    if (row.platform === "facebook") {
      existing.facebook = normalized;
    }
    socialByPerson.set(row.personId, existing);
  }

  const candidates: MergeRecommendationCandidate[] = [];
  for (const [leftIndex, leftPerson] of people.entries()) {
    const leftName = toFullNameKey({
      first_name: leftPerson.firstName,
      last_name: leftPerson.lastName,
    });
    const leftEmails = emailsByPerson.get(leftPerson.id) ?? new Set<string>();
    const leftPhones = phonesByPerson.get(leftPerson.id) ?? new Set<string>();
    const leftSocial = socialByPerson.get(leftPerson.id) ?? { facebook: "", linkedin: "" };

    for (const rightPerson of people.slice(leftIndex + 1)) {
      const rightName = toFullNameKey({
        first_name: rightPerson.firstName,
        last_name: rightPerson.lastName,
      });
      const rightEmails = emailsByPerson.get(rightPerson.id) ?? new Set<string>();
      const rightPhones = phonesByPerson.get(rightPerson.id) ?? new Set<string>();
      const rightSocial = socialByPerson.get(rightPerson.id) ?? { facebook: "", linkedin: "" };

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

      // The ids are strings, so order the pair with `<`. `Math.min` would give NaN.
      const leftSortsFirst = leftPerson.id < rightPerson.id;
      const leftPersonId = leftSortsFirst ? leftPerson.id : rightPerson.id;
      const rightPersonId = leftSortsFirst ? rightPerson.id : leftPerson.id;

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
    existingRows.map((row) => [`${row.leftPersonId}|${row.rightPersonId}`, row]),
  );
  const nextPairKeys = new Set(
    candidates.map((candidate) => `${candidate.leftPersonId}|${candidate.rightPersonId}`),
  );
  const newCandidatesCount = candidates.filter(
    (candidate) => !existingByPair.has(`${candidate.leftPersonId}|${candidate.rightPersonId}`),
  ).length;

  for (const candidate of candidates) {
    const key = `${candidate.leftPersonId}|${candidate.rightPersonId}`;
    const existing = existingByPair.get(key);

    if (existing) {
      await db.peopleMergeRecommendation.update({
        data: {
          algorithmVersion: MERGE_RECOMMENDATION_ALGORITHM_VERSION,
          reasons: candidate.reasons,
          score: candidate.score,
          updatedAt: new Date(),
        },
        where: { id: existing.id },
      });
      continue;
    }

    await db.peopleMergeRecommendation.create({
      data: {
        algorithmVersion: MERGE_RECOMMENDATION_ALGORITHM_VERSION,
        isDeclined: false,
        leftPersonId: candidate.leftPersonId,
        reasons: candidate.reasons,
        rightPersonId: candidate.rightPersonId,
        score: candidate.score,
        userId,
      },
    });
  }

  const staleActiveIds = existingRows
    .filter((row) => !row.isDeclined)
    .filter((row) => !nextPairKeys.has(`${row.leftPersonId}|${row.rightPersonId}`))
    .map((row) => row.id);

  if (staleActiveIds.length > 0) {
    await db.peopleMergeRecommendation.deleteMany({
      where: { id: { in: staleActiveIds }, userId },
    });
  }

  return newCandidatesCount;
}
