/**
 * Contacts — LinkedIn Data Routes
 * Upsert and retrieve scraped LinkedIn work/education history.
 */

import type { FastifyReply } from "fastify";
import type { AppFastifyInstance } from "../../../lib/fastify-types";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { getAuth } from "../../../lib/auth";
import { withOkResponse } from "../../../lib/openapi-route-responses";
import { uuidParamSchema } from "@bondery/schemas/http";
import {
  linkedInDataRequestSchema,
  linkedInDataResponseSchema,
  linkedInDataUpsertResponseSchema,
} from "@bondery/schemas";
import { linkedinCompanyUrl } from "@bondery/helpers";
import { ENRICH_TIER } from "../../../lib/rate-limit";

export function registerLinkedInDataRoutes(fastify: AppFastifyInstance): void {
  /**
   * POST /api/contacts/:id/linkedin-data - Upsert scraped LinkedIn work history
   */
  fastify.post(
    "/:id/linkedin-data",
    {
      schema: {
        description: "Upsert scraped LinkedIn work history for a contact.",
        params: uuidParamSchema,
        body: linkedInDataRequestSchema,
        response: withOkResponse(linkedInDataUpsertResponseSchema, "LinkedIn data upserted"),
      } satisfies FastifyZodOpenApiSchema,
      config: { rateLimit: ENRICH_TIER },
    },
    async (request, reply) => {
      const { client, user } = getAuth(request);
      const { id: personId } = request.params;
      const { workHistory = [] } = request.body;

      request.log.info(
        { personId, userId: user.id, workHistoryCount: workHistory.length, workHistory },
        "[linkedin-data] POST received",
      );

      // Verify the person belongs to the authenticated user
      const { data: person, error: personError } = await client
        .from("people")
        .select("id")
        .eq("id", personId)
        .eq("user_id", user.id)
        .single();

      if (personError || !person) {
        return reply.status(404).send({ error: "Contact not found" });
      }

      // Upsert people_linkedin to get the parent row id + update sync timestamp
      const { data: linkedinRow, error: linkedinUpsertError } = await client
        .from("people_linkedin")
        .upsert(
          { user_id: user.id, person_id: personId, updated_at: new Date().toISOString() },
          { onConflict: "user_id,person_id" },
        )
        .select("id")
        .single();

      if (linkedinUpsertError || !linkedinRow) {
        return reply.status(500).send({ error: "Failed to upsert LinkedIn profile" });
      }

      // Delete existing work history, then insert the new set
      const { error: deleteError } = await client
        .from("people_work_history")
        .delete()
        .eq("people_linkedin_id", linkedinRow.id)
        .eq("user_id", user.id);

      if (deleteError) {
        return reply.status(500).send({ error: deleteError.message });
      }

      if (workHistory.length > 0) {
        const rows = workHistory.map((entry) => ({
          user_id: user.id,
          people_linkedin_id: linkedinRow.id,
          company_name: entry.companyName,
          company_linkedin_id: entry.companyLinkedinId ?? null,
          title: entry.title ?? null,
          start_date: entry.startDate ?? null,
          end_date: entry.endDate ?? null,
          employment_type: entry.employmentType ?? null,
          location: entry.location ?? null,
        }));

        request.log.info({ rows }, "[linkedin-data] Inserting rows");

        const { error: insertError } = await client.from("people_work_history").insert(rows);

        if (insertError) {
          request.log.error({ insertError }, "[linkedin-data] Insert failed");
          return reply.status(500).send({ error: insertError.message });
        }
      }

      request.log.info({ personId, count: workHistory.length }, "[linkedin-data] Upsert complete");
      return reply.status(200).send({ success: true, count: workHistory.length });
    },
  );

  /**
   * GET /api/contacts/:id/linkedin-data - Get work history and education for a person
   */
  fastify.get(
    "/:id/linkedin-data",
    {
      schema: {
        description: "Get LinkedIn work history and education for a contact.",
        params: uuidParamSchema,
        response: withOkResponse(linkedInDataResponseSchema, "LinkedIn data"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const { client, user } = getAuth(request);
      const { id: personId } = request.params;

      // Fetch the people_linkedin row (may not exist if never enriched)
      const { data: linkedinRow } = await client
        .from("people_linkedin")
        .select("id, bio, updated_at")
        .eq("person_id", personId)
        .eq("user_id", user.id)
        .maybeSingle();

      // No people_linkedin row → return empty data with null syncedAt
      if (!linkedinRow) {
        return { linkedinBio: null, syncedAt: null, workHistory: [], education: [] };
      }

      const [workHistoryResult, educationResult] = await Promise.all([
        client
          .from("people_work_history")
          .select("*")
          .eq("user_id", user.id)
          .eq("people_linkedin_id", linkedinRow.id)
          .order("start_date", { ascending: false }),
        client
          .from("people_education_history")
          .select("*")
          .eq("user_id", user.id)
          .eq("people_linkedin_id", linkedinRow.id)
          .order("start_date", { ascending: false }),
      ]);

      // Sort: active (null end_date) first, then finished — both groups ordered by
      // start_date DESC. DB can't express (end_date IS NULL) DESC as a primary sort
      // key via PostgREST, so we apply the two-group ordering in JS.
      const sortByActiveFirst = <T extends { end_date: string | null; start_date: string | null }>(
        rows: T[],
      ): T[] =>
        rows.sort((a, b) => {
          const aActive = a.end_date === null;
          const bActive = b.end_date === null;
          if (aActive !== bActive) return aActive ? -1 : 1;
          // Same group: most recent start_date first
          if (!a.start_date && !b.start_date) return 0;
          if (!a.start_date) return 1;
          if (!b.start_date) return -1;
          return a.start_date > b.start_date ? -1 : 1;
        });

      if (workHistoryResult.error) {
        return reply.status(500).send({ error: workHistoryResult.error.message });
      }
      if (educationResult.error) {
        return reply.status(500).send({ error: educationResult.error.message });
      }

      return {
        linkedinBio: linkedinRow.bio ?? null,
        syncedAt: linkedinRow.updated_at ?? null,
        workHistory: sortByActiveFirst(workHistoryResult.data || []).map((row) => ({
          id: row.id,
          userId: row.user_id,
          peopleLinkedinId: row.people_linkedin_id,
          companyName: row.company_name,
          companyLinkedinUrl: linkedinCompanyUrl(row.company_linkedin_id),
          companyLogoUrl: row.company_linkedin_id
            ? client.storage
                .from("linkedin_logos")
                .getPublicUrl(`${user.id}/${row.company_linkedin_id}.jpg`).data.publicUrl
            : null,
          title: row.title,
          description: row.description,
          startDate: row.start_date,
          endDate: row.end_date,
          employmentType: row.employment_type,
          location: row.location,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })),
        education: sortByActiveFirst(educationResult.data || []).map((row) => ({
          id: row.id,
          userId: row.user_id,
          peopleLinkedinId: row.people_linkedin_id,
          schoolName: row.school_name,
          schoolLinkedinUrl: linkedinCompanyUrl(row.school_linkedin_id),
          schoolLogoUrl: row.school_linkedin_id
            ? client.storage
                .from("linkedin_logos")
                .getPublicUrl(`${user.id}/${row.school_linkedin_id}.jpg`).data.publicUrl
            : null,
          degree: row.degree,
          description: row.description,
          startDate: row.start_date,
          endDate: row.end_date,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })),
      };
    },
  );
}
