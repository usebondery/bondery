/**
 * Contacts — Merge Recommendations Routes
 * Lists, refreshes, declines, and restores merge recommendations.
 * Also contains the core recomputeMergeRecommendations() logic.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuth } from "../../../lib/auth.js";
import { buildContactAvatarUrl } from "../../../lib/supabase.js";
import { attachContactExtras, type FullContactExtras } from "../../../lib/contact-enrichment.js";
import type {
  Contact,
  Database,
  MergeRecommendationReason,
  MergeRecommendationsResponse,
  RefreshMergeRecommendationsResponse,
} from "@bondery/types";
import { UuidParam, CONTACT_SELECT, extractAvatarOptions } from "../../../lib/schemas.js";
import {
  MERGE_RECOMMENDATION_ALGORITHM_VERSION,
  type MergeRecommendationCandidate,
  normalizeEmailValue,
  normalizePhoneValue,
  normalizeSocialHandle,
  toFullNameKey,
  diceCoefficient,
  countSetOverlap,
  MergeRecommendationsQuery,
  withEmptyChannels,
  withEmptySocials,
} from "./helpers.js";

// Suppress unused import warning — buildContactAvatarUrl is transitively needed
// by attachContactExtras but referenced here to maintain the same import surface
void buildContactAvatarUrl;

async function recomputeMergeRecommendations(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<number> {
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
    throw new Error(
      peopleError?.message ||
        emailError?.message ||
        phoneError?.message ||
        socialError?.message ||
        existingError?.message ||
        "Failed to recompute merge recommendations",
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
        throw new Error(clearError.message);
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

    const existing = socialByPerson.get(row.person_id) || { linkedin: "", facebook: "" };
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
    const leftSocial = socialByPerson.get(leftPerson.id) || { linkedin: "", facebook: "" };

    for (let rightIndex = leftIndex + 1; rightIndex < people.length; rightIndex += 1) {
      const rightPerson = people[rightIndex];
      const rightName = toFullNameKey(rightPerson);
      const rightEmails = emailsByPerson.get(rightPerson.id) || new Set<string>();
      const rightPhones = phonesByPerson.get(rightPerson.id) || new Set<string>();
      const rightSocial = socialByPerson.get(rightPerson.id) || { linkedin: "", facebook: "" };

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
      const hasFullNameMatch = fullNameScore >= 0.84;

      if (hasFullNameMatch) {
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
        rightPersonId,
        score,
        reasons,
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
        user_id: userId,
        left_person_id: candidate.leftPersonId,
        right_person_id: candidate.rightPersonId,
        score: candidate.score,
        reasons: candidate.reasons,
        algorithm_version: MERGE_RECOMMENDATION_ALGORITHM_VERSION,
        is_declined: existing?.is_declined || false,
      };
    });

    const { error: upsertError } = await client
      .from("people_merge_recommendations")
      .upsert(rowsToUpsert, {
        onConflict: "user_id,left_person_id,right_person_id",
      });

    if (upsertError) {
      throw new Error(upsertError.message);
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
      throw new Error(deleteStaleError.message);
    }
  }

  return newCandidatesCount;
}

export function registerRecommendationRoutes(fastify: FastifyInstance): void {
  /**
   * GET /api/contacts/merge-recommendations - List merge recommendations
   */
  fastify.get(
    "/merge-recommendations",
    { schema: { querystring: MergeRecommendationsQuery } },
    async (
      request: FastifyRequest<{ Querystring: typeof MergeRecommendationsQuery.static }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const avatarOptions = extractAvatarOptions(request.query);
      const declinedQuery = request.query?.declined;
      const showDeclined =
        typeof declinedQuery === "boolean"
          ? declinedQuery
          : typeof declinedQuery === "string"
            ? declinedQuery.toLowerCase() === "true"
            : false;

      let { data: recommendationRows, error: recommendationsError } = await client
        .from("people_merge_recommendations")
        .select("id, left_person_id, right_person_id, score, reasons")
        .eq("user_id", user.id)
        .eq("is_declined", showDeclined)
        .order("score", { ascending: false })
        .order("created_at", { ascending: false });

      if (recommendationsError) {
        return reply.status(500).send({ error: recommendationsError.message });
      }

      if (!showDeclined && (!recommendationRows || recommendationRows.length === 0)) {
        const { data: existingRows, error: existingRowsError } = await client
          .from("people_merge_recommendations")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);

        if (existingRowsError) {
          return reply.status(500).send({ error: existingRowsError.message });
        }

        if (!existingRows || existingRows.length === 0) {
          try {
            await recomputeMergeRecommendations(client, user.id);
          } catch (recomputeError) {
            const message =
              recomputeError instanceof Error
                ? recomputeError.message
                : "Failed to generate merge recommendations";
            return reply.status(500).send({ error: message });
          }

          const refreshed = await client
            .from("people_merge_recommendations")
            .select("id, left_person_id, right_person_id, score, reasons")
            .eq("user_id", user.id)
            .eq("is_declined", false)
            .order("score", { ascending: false })
            .order("created_at", { ascending: false });

          recommendationRows = refreshed.data || [];
          recommendationsError = refreshed.error;

          if (recommendationsError) {
            return reply.status(500).send({ error: recommendationsError.message });
          }
        }
      }

      const personIds = Array.from(
        new Set(
          (recommendationRows || []).flatMap((row) => [row.left_person_id, row.right_person_id]),
        ),
      );

      if (personIds.length === 0) {
        const emptyResponse: MergeRecommendationsResponse = { recommendations: [] };
        return emptyResponse;
      }

      const { data: personRows, error: personRowsError } = await client
        .from("people")
        .select(CONTACT_SELECT)
        .eq("user_id", user.id)
        .in("id", personIds);

      if (personRowsError) {
        return reply.status(500).send({ error: personRowsError.message });
      }

      let enrichedContacts: Array<{ id: string } & FullContactExtras> = [];
      try {
        enrichedContacts = await attachContactExtras(client, user.id, personRows || [], {
          addresses: true,
          avatarOptions,
        });
      } catch (enrichError) {
        fastify.log.error(
          { enrichError },
          "Failed to attach contact extras for merge recommendations",
        );
        enrichedContacts = withEmptySocials(withEmptyChannels(personRows || []));
      }

      const contacts = enrichedContacts;
      const contactsById = new Map(contacts.map((contact) => [contact.id, contact]));

      const allowedReasons: MergeRecommendationReason[] = ["fullName", "email", "phone"];
      const recommendations: MergeRecommendationsResponse["recommendations"] = [];

      for (const row of recommendationRows || []) {
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
          rightPerson: rightPerson as Contact,
          score: Number(row.score) || 0,
          reasons,
        });
      }

      const response: MergeRecommendationsResponse = { recommendations };
      return response;
    },
  );

  /**
   * POST /api/contacts/merge-recommendations/refresh - Recompute merge recommendations
   */
  fastify.post(
    "/merge-recommendations/refresh",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { client, user } = getAuth(request);

      try {
        const recommendationsCount = await recomputeMergeRecommendations(client, user.id);
        const response: RefreshMergeRecommendationsResponse = {
          success: true,
          recommendationsCount,
        };

        return response;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to refresh merge recommendations";
        return reply.status(500).send({ error: message });
      }
    },
  );

  /**
   * PATCH /api/contacts/merge-recommendations/:id/decline - Decline recommendation
   */
  fastify.patch(
    "/merge-recommendations/:id/decline",
    { schema: { params: UuidParam } },
    async (request: FastifyRequest<{ Params: typeof UuidParam.static }>, reply: FastifyReply) => {
      const { client, user } = getAuth(request);
      const recommendationId = request.params.id?.trim();

      if (!recommendationId) {
        return reply.status(400).send({ error: "Recommendation id is required" });
      }

      const { data, error } = await client
        .from("people_merge_recommendations")
        .update({
          is_declined: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", recommendationId)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      if (!data) {
        return reply.status(404).send({ error: "Recommendation not found" });
      }

      return { success: true };
    },
  );

  /**
   * PATCH /api/contacts/merge-recommendations/:id/restore - Restore recommendation
   */
  fastify.patch(
    "/merge-recommendations/:id/restore",
    { schema: { params: UuidParam } },
    async (request: FastifyRequest<{ Params: typeof UuidParam.static }>, reply: FastifyReply) => {
      const { client, user } = getAuth(request);
      const recommendationId = request.params.id?.trim();

      if (!recommendationId) {
        return reply.status(400).send({ error: "Recommendation id is required" });
      }

      const { data, error } = await client
        .from("people_merge_recommendations")
        .update({
          is_declined: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", recommendationId)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      if (!data) {
        return reply.status(404).send({ error: "Recommendation not found" });
      }

      return { success: true };
    },
  );
}
