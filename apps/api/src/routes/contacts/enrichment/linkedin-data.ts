/**
 * Contacts — LinkedIn Data Routes
 */

import { linkedinCompanyUrl } from "@bondery/helpers";
import {
  linkedInDataRequestSchema,
  linkedInDataResponseSchema,
  linkedInDataUpsertResponseSchema,
} from "@bondery/schemas";
import { uuidParamSchema } from "@bondery/schemas/http";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { upsertLinkedInWorkHistory } from "../../../domains/contacts/enrichment/linkedin-data.js";
import { getAuth } from "../../../lib/platform/auth/strategies.js";
import { internal } from "../../../lib/platform/errors/http-errors.js";
import type { AppFastifyInstance } from "../../../lib/platform/fastify-types.js";
import { withOkResponse } from "../../../lib/platform/openapi/responses.js";
import { ENRICH_TIER } from "../../../lib/platform/rate-limit.js";
import { withDomainRoute } from "../../../lib/platform/with-domain-route.js";

export function registerLinkedInDataRoutes(fastify: AppFastifyInstance): void {
  fastify.post(
    "/:id/linkedin-data",
    {
      config: { rateLimit: ENRICH_TIER },
      schema: {
        body: linkedInDataRequestSchema,
        description: "Upsert scraped LinkedIn work history for a contact.",
        params: uuidParamSchema,
        response: withOkResponse(linkedInDataUpsertResponseSchema, "LinkedIn data upserted"),
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(async (ctx, request) => {
      return upsertLinkedInWorkHistory(ctx, request.params.id, request.body.workHistory ?? []);
    }),
  );

  fastify.get(
    "/:id/linkedin-data",
    {
      schema: {
        description: "Get LinkedIn work history and education for a contact.",
        params: uuidParamSchema,
        response: withOkResponse(linkedInDataResponseSchema, "LinkedIn data"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const { client, user } = getAuth(request);
      const { id: personId } = request.params;

      const { data: linkedinRow } = await client
        .from("people_linkedin")
        .select("id, bio, updated_at")
        .eq("person_id", personId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!linkedinRow) {
        return { education: [], linkedinBio: null, syncedAt: null, workHistory: [] };
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

      const sortByActiveFirst = <T extends { end_date: string | null; start_date: string | null }>(
        rows: T[],
      ): T[] =>
        rows.sort((a, b) => {
          const aActive = a.end_date === null;
          const bActive = b.end_date === null;
          if (aActive !== bActive) {
            return aActive ? -1 : 1;
          }
          if (!a.start_date && !b.start_date) {
            return 0;
          }
          if (!a.start_date) {
            return 1;
          }
          if (!b.start_date) {
            return -1;
          }
          return a.start_date > b.start_date ? -1 : 1;
        });

      if (workHistoryResult.error) {
        throw internal("internal_server_error", workHistoryResult.error.message);
      }
      if (educationResult.error) {
        throw internal("internal_server_error", educationResult.error.message);
      }

      return {
        education: sortByActiveFirst(educationResult.data || []).map((row) => ({
          createdAt: row.created_at,
          degree: row.degree,
          description: row.description,
          endDate: row.end_date,
          id: row.id,
          peopleLinkedinId: row.people_linkedin_id,
          schoolLinkedinUrl: linkedinCompanyUrl(row.school_linkedin_id),
          schoolLogoUrl: row.school_linkedin_id
            ? client.storage
                .from("linkedin_logos")
                .getPublicUrl(`${user.id}/${row.school_linkedin_id}.jpg`).data.publicUrl
            : null,
          schoolName: row.school_name,
          startDate: row.start_date,
          updatedAt: row.updated_at,
          userId: row.user_id,
        })),
        linkedinBio: linkedinRow.bio ?? null,
        syncedAt: linkedinRow.updated_at ?? null,
        workHistory: sortByActiveFirst(workHistoryResult.data || []).map((row) => ({
          companyLinkedinUrl: linkedinCompanyUrl(row.company_linkedin_id),
          companyLogoUrl: row.company_linkedin_id
            ? client.storage
                .from("linkedin_logos")
                .getPublicUrl(`${user.id}/${row.company_linkedin_id}.jpg`).data.publicUrl
            : null,
          companyName: row.company_name,
          createdAt: row.created_at,
          description: row.description,
          employmentType: row.employment_type,
          endDate: row.end_date,
          id: row.id,
          location: row.location,
          peopleLinkedinId: row.people_linkedin_id,
          startDate: row.start_date,
          title: row.title,
          updatedAt: row.updated_at,
          userId: row.user_id,
        })),
      };
    },
  );
}
