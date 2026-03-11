/**
 * Interactions API Routes
 * Handles CRUD operations for timeline interactions
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { Type } from "@sinclair/typebox";
import { getAuth } from "../../lib/auth.js";
import {
  UuidParam,
  AvatarQualityEnum,
  AvatarSizeEnum,
  extractAvatarOptions,
} from "../../lib/schemas.js";
import { buildContactAvatarUrl } from "../../lib/supabase.js";

// ── TypeBox Schemas ──────────────────────────────────────────────────────────

const InteractionsQuery = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 200, default: 50 })),
  offset: Type.Optional(Type.Integer({ minimum: 0, default: 0 })),
  avatarQuality: Type.Optional(AvatarQualityEnum),
  avatarSize: Type.Optional(AvatarSizeEnum),
});

const CreateInteractionBody = Type.Object({
  type: Type.String({ minLength: 1 }),
  date: Type.String({ minLength: 1 }),
  title: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
  participantIds: Type.Optional(Type.Array(Type.String())),
});

const UpdateInteractionBody = Type.Object({
  type: Type.Optional(Type.String()),
  date: Type.Optional(Type.String()),
  title: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
  participantIds: Type.Optional(Type.Array(Type.String())),
});

export async function interactionRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRoute", (routeOptions) => {
    routeOptions.schema = { ...routeOptions.schema, tags: ["Interactions"] };
  });
  fastify.addHook("onRequest", fastify.auth([fastify.verifySession]));

  /**
   * GET /api/interactions - List all interactions
   */
  fastify.get(
    "/",
    { schema: { querystring: InteractionsQuery } },
    async (
      request: FastifyRequest<{ Querystring: typeof InteractionsQuery.static }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);

      const limit = Math.min(request.query.limit ?? 50, 200);
      const offset = request.query.offset ?? 0;
      const avatarOptions = extractAvatarOptions(request.query);

      const {
        data: interactions,
        error,
        count,
      } = await client
        .from("interactions")
        .select(
          `
        *,
        participants:interaction_participants(
          person:people(
            id,
            first_name,
            last_name,
            updated_at
          )
        )
      `,
          { count: "exact" },
        )
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
          avatar: buildContactAvatarUrl(
            client,
            user.id,
            participant.person.id,
            avatarOptions,
            participant.person.updated_at,
          ),
        })),
      }));

      return {
        interactions: formattedInteractions,
        totalCount: typeof count === "number" ? count : formattedInteractions.length,
        limit,
        offset,
      };
    },
  );

  /**
   * POST /api/interactions - Create a new interaction
   */
  fastify.post(
    "/",
    { schema: { body: CreateInteractionBody } },
    async (
      request: FastifyRequest<{
        Body: {
          type: string;
          date: string;
          title?: string;
          description?: string;
          participantIds?: string[];
        };
      }>,
      reply: FastifyReply,
    ) => {
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
          .update({ last_interaction: body.date })
          .in("id", body.participantIds);
      }

      return reply.status(201).send({ id: interaction.id });
    },
  );

  /**
   * DELETE /api/interactions/:id - Delete an interaction
   */
  fastify.delete(
    "/:id",
    { schema: { params: UuidParam } },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { client } = getAuth(request);
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
    { schema: { params: UuidParam, body: UpdateInteractionBody } },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: {
          type?: string;
          date?: string;
          title?: string;
          description?: string;
          participantIds?: string[];
        };
      }>,
      reply: FastifyReply,
    ) => {
      const { client } = getAuth(request);
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
              .update({ last_interaction: body.date })
              .in("id", body.participantIds);
          }
        }
      }

      return { message: "Interaction updated successfully" };
    },
  );
}
