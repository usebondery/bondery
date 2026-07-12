/**
 * Me API Routes
 * Handles authenticated user profile operations
 */

import {
  apiSuccessResponseSchema,
  contactResponseSchema,
  updateAccountInputSchema,
  userAccountResponseSchema,
} from "@bondery/schemas";
import { avatarTransformQuerySchema } from "@bondery/schemas/http";
import { EXAMPLE_PROFILE_PHOTO_RESPONSE } from "@bondery/schemas/openapi/fixtures/responses";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { z } from "zod";
import { attachContactExtras } from "../../lib/contacts/enrichment.js";
import { CONTACT_SELECT, extractAvatarOptions } from "../../lib/data/select-fragments.js";
import { getAuth } from "../../lib/platform/auth/strategies.js";
import { badRequest, internal, notFound } from "../../lib/platform/errors/http-errors.js";
import type { AppRoutePlugin } from "../../lib/platform/fastify-types.js";
import { withOkResponse } from "../../lib/platform/openapi/responses.js";
import { withDomainRoute } from "../../lib/platform/with-domain-route.js";
import {
  deleteAccount,
  deleteProfilePhoto,
  updateAccountMetadata,
  uploadProfilePhoto,
} from "../../services/me/account.js";

const profilePhotoResponseSchema = z
  .object({
    data: z.object({ avatarUrl: z.string() }),
    success: z.boolean(),
  })
  .meta({ example: EXAMPLE_PROFILE_PHOTO_RESPONSE });

export const meRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Me"];
    }
  });

  /**
   * PATCH /api/me - Update user account metadata
   */
  fastify.patch(
    "/",
    {
      schema: {
        body: updateAccountInputSchema,
        description: "Update user account metadata (name fields).",
        response: withOkResponse(userAccountResponseSchema, "Updated account"),
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute({ body: updateAccountInputSchema }, async (ctx, { body }) =>
      updateAccountMetadata(ctx, body),
    ),
  );

  /**
   * DELETE /api/me - Delete user account
   */
  fastify.delete(
    "/",
    {
      schema: {
        description: "Delete the authenticated user account and associated storage.",
        response: withOkResponse(apiSuccessResponseSchema, "Account deleted"),
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(async (ctx) => deleteAccount(ctx)),
  );

  /**
   * GET /api/me/person - Fetch the authenticated user's "myself" contact
   */
  fastify.get(
    "/person",
    {
      schema: {
        description: "Fetch the authenticated user's myself contact profile.",
        querystring: avatarTransformQuerySchema,
        response: withOkResponse(contactResponseSchema, "Myself contact"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const { client, user } = getAuth(request);
      const avatarOpts = extractAvatarOptions(request.query);

      const { data: contact, error } = await client
        .from("people")
        .select(CONTACT_SELECT)
        .eq("user_id", user.id)
        .eq("myself", true)
        .single();

      if (error || !contact) {
        throw notFound("Myself contact not found", "not_found");
      }

      try {
        const [enrichedContact] = await attachContactExtras(client, user.id, [contact], {
          addresses: true,
          avatarOptions: avatarOpts,
        });
        return { contact: enrichedContact };
      } catch (error) {
        request.log.error({ err: error }, "Failed to enrich myself contact");
        throw internal("failed_to_load_profile_contact");
      }
    },
  );

  /**
   * POST /api/me/photo - Upload profile photo
   */
  fastify.post(
    "/photo",
    {
      schema: {
        description: "Upload a profile photo for the authenticated user.",
        response: withOkResponse(profilePhotoResponseSchema, "Profile photo uploaded"),
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(async (ctx, { request }) => {
      const data = await request.file();
      if (!data) {
        throw badRequest("No file provided", "bad_request");
      }

      const buffer = await data.toBuffer();
      return uploadProfilePhoto(ctx, buffer, data.mimetype);
    }),
  );

  /**
   * DELETE /api/me/photo - Delete profile photo
   */
  fastify.delete(
    "/photo",
    {
      schema: {
        description: "Delete the authenticated user's profile photo.",
        response: withOkResponse(apiSuccessResponseSchema, "Profile photo deleted"),
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(async (ctx) => deleteProfilePhoto(ctx)),
  );
};
