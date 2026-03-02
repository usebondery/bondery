/**
 * Interactions API Routes
 * Handles CRUD operations for timeline interactions
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireAuth } from "../lib/supabase.js";
import type { CreateInteractionInput, UpdateInteractionInput } from "@bondery/types";

export async function interactionRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/interactions - List all interactions
   */
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) return;

    const { client } = auth;

    const { data: interactions, error } = await client
      .from("interactions")
      .select(
        `
        *,
        participants:interaction_participants(
          person:people(
            id,
            first_name,
            last_name,
            avatar
          )
        )
      `,
      )
      .order("date", { ascending: false });

    if (error) {
      console.error("Error fetching interactions:", error);
      return reply.status(500).send({ error: error.message });
    }

    const formattedInteractions = interactions.map((interaction: any) => ({
      ...interaction,
      userId: interaction.user_id,
      createdAt: interaction.created_at,
      updatedAt: interaction.updated_at,
      participants: interaction.participants.map((participant: any) => participant.person),
    }));

    return {
      interactions: formattedInteractions,
      totalCount: interactions.length,
    };
  });

  /**
   * POST /api/interactions - Create a new interaction
   */
  fastify.post(
    "/",
    async (request: FastifyRequest<{ Body: CreateInteractionInput }>, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client, user } = auth;
      const body = request.body;

      if (!body.type) {
        return reply.status(400).send({ error: "Type is required" });
      }

      if (!body.date) {
        return reply.status(400).send({ error: "Date is required" });
      }

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
        console.error("Error creating interaction:", interactionError);
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
          console.error("Error adding participants:", participantsError);
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
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client } = auth;
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
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: UpdateInteractionInput }>,
      reply: FastifyReply,
    ) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client } = auth;
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
