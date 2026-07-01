/**
 * Interactions API Routes
 * Handles CRUD operations for timeline interactions
 */

import type { FastifyInstance, FastifyReply } from "fastify";
import type { AppFastifyInstance, AppRoutePlugin } from "../../lib/fastify-types";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { getAuth } from "../../lib/auth";
import { registerApiKeyProtectedHooks } from "../../lib/api-key-access";
import { applyOpenApiRouteMeta } from "../../lib/openapi-route-meta";
import {
  withCreatedResponse,
  withOkResponse,
} from "../../lib/openapi-route-responses";
import { INTERACTION_SELECT, extractAvatarOptions } from "../../lib/queries";
import {
  avatarTransformQuerySchema,
  interactionsListQuerySchema,
  uuidParamSchema,
} from "@bondery/schemas/http";
import {
  createInteractionInputSchema,
  interactionResponseSchema,
  interactionsListResponseSchema,
  messageResponseSchema,
  updateInteractionInputSchema,
} from "@bondery/schemas";
import { resolveContactAvatarUrl } from "../../lib/supabase";
import {
  buildPaginatedResponse,
  buildPaginationMeta,
  parsePagination,
} from "../../lib/pagination";

async function loadInteraction(
  client: ReturnType<typeof getAuth>["client"],
  userId: string,
  interactionId: string,
  avatarOptions?: ReturnType<typeof extractAvatarOptions>,
) {
  const { data: interaction, error } = await client
    .from("interactions")
    .select(INTERACTION_SELECT)
    .eq("id", interactionId)
    .eq("user_id", userId)
    .single();

  if (error || !interaction) {
    return null;
  }

  return {
    id: interaction.id,
    title: interaction.title,
    type: interaction.type,
    description: interaction.description,
    date: interaction.date,
    createdAt: interaction.created_at,
    updatedAt: interaction.updated_at,
    participants: interaction.participants.map((participant: any) => ({
      ...participant.person,
      avatar: resolveContactAvatarUrl(
        client,
        userId,
        {
          id: participant.person.id,
          hasAvatar: participant.person.has_avatar,
          updatedAt: participant.person.updated_at,
        },
        avatarOptions,
      ),
    })),
  };
}

export const interactionRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Interactions"];
    }
    applyOpenApiRouteMeta(routeOptions, { area: "integration" });
  });
  registerApiKeyProtectedHooks(fastify);

  /**
   * GET /api/interactions - List all interactions
   */
  fastify.get(
    "/",
    {
      schema: {
        description: "List interactions with pagination.",
        querystring: interactionsListQuerySchema,
        response: withOkResponse(
          interactionsListResponseSchema,
          "Paginated interactions",
        ),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const { client, user } = getAuth(request);

      const { limit, offset } = parsePagination(request.query);
      const avatarOptions = extractAvatarOptions(request.query);

      const {
        data: interactions,
        error,
        count,
      } = await client
        .from("interactions")
        .select(INTERACTION_SELECT, { count: "exact" })
        .order("date", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        request.log.error({ err: error }, "Error fetching interactions");
        return reply.status(500).send({ error: error.message });
      }

      const formattedInteractions = interactions.map((interaction: any) => ({
        id: interaction.id,
        userId: interaction.user_id,
        title: interaction.title,
        type: interaction.type,
        description: interaction.description,
        date: interaction.date,
        createdAt: interaction.created_at,
        updatedAt: interaction.updated_at,
        participants: interaction.participants.map((participant: any) => ({
          ...participant.person,
          avatar: resolveContactAvatarUrl(
            client,
            user.id,
            {
              id: participant.person.id,
              hasAvatar: participant.person.has_avatar,
              updatedAt: participant.person.updated_at,
            },
            avatarOptions,
          ),
        })),
      }));

      const totalCount =
        typeof count === "number" ? count : formattedInteractions.length;
      const pagination = buildPaginationMeta({
        limit,
        offset,
        totalCount,
        itemCount: formattedInteractions.length,
        sort: "dateDesc",
        search: null,
      });

      return buildPaginatedResponse("interactions", formattedInteractions, pagination);
    },
  );

  /**
   * POST /api/interactions - Create a new interaction
   */
  fastify.post(
    "/",
    {
      schema: {
        description: "Create a new interaction.",
        body: createInteractionInputSchema,
        response: withCreatedResponse(
          interactionResponseSchema,
          "Interaction created",
        ),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const { client, user } = getAuth(request);
      const body = request.body;

      const { data: interaction, error: interactionError } = await client
        .from("interactions")
        .insert({
          user_id: user.id,
          title: body.title || null,
          type: body.type,
          description: body.description || null,
          date: body.date,
        })
        .select()
        .single();

      if (interactionError) {
        request.log.error({ err: interactionError }, "Error creating interaction");
        return reply.status(500).send({ error: interactionError.message });
      }

      if (body.participantIds && body.participantIds.length > 0) {
        const participantsData = body.participantIds.map((personId) => ({
          interaction_id: interaction.id,
          person_id: personId,
        }));

        const { error: participantsError } = await client
          .from("interaction_participants")
          .insert(participantsData);

        if (participantsError) {
          request.log.error({ err: participantsError }, "Error adding participants");
        }

        await client
          .from("people")
          .update({ last_interaction: body.date, last_interaction_activity_id: interaction.id })
          .in("id", body.participantIds);
      }

      const fullInteraction = await loadInteraction(
        client,
        user.id,
        interaction.id,
      );

      if (!fullInteraction) {
        return reply
          .status(500)
          .send({ error: "Interaction was created but could not be reloaded" });
      }

      return reply.status(201).send({ interaction: fullInteraction });
    },
  );

  /**
   * GET /api/interactions/:id - Get a single interaction
   */
  fastify.get(
    "/:id",
    {
      schema: {
        description: "Get a single interaction by ID.",
        params: uuidParamSchema,
        querystring: avatarTransformQuerySchema,
        response: withOkResponse(
          interactionResponseSchema,
          "Interaction details",
        ),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const { client, user } = getAuth(request);
      const { id } = request.params;

      const avatarOptions = extractAvatarOptions(request.query);
      const interaction = await loadInteraction(client, user.id, id, avatarOptions);

      if (!interaction) {
        return reply.status(404).send({ error: "Interaction not found" });
      }

      return { interaction };
    },
  );

  /**
   * DELETE /api/interactions/:id - Delete an interaction
   */
  fastify.delete(
    "/:id",
    {
      schema: {
        description: "Delete an interaction by ID.",
        params: uuidParamSchema,
        response: withOkResponse(
          messageResponseSchema,
          "Interaction deleted successfully",
        ),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const { client, user } = getAuth(request);
      const { id } = request.params;

      const { error } = await client.from("interactions").delete().eq("id", id);

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return { message: "Interaction deleted successfully" };
    },
  );

  /**
   * PATCH /api/interactions/:id - Update an interaction
   */
  fastify.patch(
    "/:id",
    {
      schema: {
        description: "Update an interaction by ID.",
        params: uuidParamSchema,
        body: updateInteractionInputSchema,
        response: withOkResponse(
          interactionResponseSchema,
          "Updated interaction",
        ),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const { client, user } = getAuth(request);
      const { id } = request.params;
      const body = request.body;

      const updates: any = {};
      if (body.title !== undefined) updates.title = body.title;
      if (body.description !== undefined) updates.description = body.description;
      if (body.type !== undefined) updates.type = body.type;
      if (body.date !== undefined) updates.date = body.date;

      const { error } = await client.from("interactions").update(updates).eq("id", id);

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      if (body.participantIds) {
        const { error: deleteParticipantsError } = await client
          .from("interaction_participants")
          .delete()
          .eq("interaction_id", id);

        if (deleteParticipantsError) {
          return reply.status(500).send({ error: deleteParticipantsError.message });
        }

        if (body.participantIds.length > 0) {
          const participantsData = body.participantIds.map((personId) => ({
            interaction_id: id,
            person_id: personId,
          }));

          const { error: insertParticipantsError } = await client
            .from("interaction_participants")
            .insert(participantsData);

          if (insertParticipantsError) {
            return reply.status(500).send({ error: insertParticipantsError.message });
          }

          if (body.date) {
            await client
              .from("people")
              .update({ last_interaction: body.date, last_interaction_activity_id: id })
              .in("id", body.participantIds);
          }
        }
      }

      const interaction = await loadInteraction(client, user.id, id);
      if (!interaction) {
        return reply.status(404).send({ error: "Interaction not found" });
      }

      return { interaction };
    },
  );
}
