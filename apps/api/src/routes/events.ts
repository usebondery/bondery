/**
 * Events API Routes
 * Handles CRUD operations for events
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireAuth } from "../lib/supabase.js";
import type { CreateEventInput, UpdateEventInput } from "@bondery/types";

export async function eventRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/events - List all events
   */
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) return;

    const { client } = auth;

    const { data: events, error } = await client
      .from("events")
      .select(
        `
        *,
        participants:event_participants(
          person:people(
            id,
            first_name,
            last_name,
            avatar,
            avatar_color
          )
        )
      `,
      )
      .order("date", { ascending: false });

    if (error) {
      console.error("Error fetching events:", error);
      return reply.status(500).send({ error: error.message });
    }

    const formattedEvents = events.map((event: any) => ({
      ...event,
      userId: event.user_id,
      createdAt: event.created_at,
      updatedAt: event.updated_at,
      participants: event.participants.map((participant: any) => participant.person),
    }));

    return {
      events: formattedEvents,
      totalCount: events.length,
    };
  });

  /**
   * POST /api/events - Create a new event
   */
  fastify.post(
    "/",
    async (request: FastifyRequest<{ Body: CreateEventInput }>, reply: FastifyReply) => {
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

      const { data: event, error: eventError } = await client
        .from("events")
        .insert({
          user_id: user.id,
          title: body.title || null,
          type: body.type,
          description: body.description || null,
          date: body.date,
        })
        .select()
        .single();

      if (eventError) {
        console.error("Error creating event:", eventError);
        return reply.status(500).send({ error: eventError.message });
      }

      if (body.participantIds && body.participantIds.length > 0) {
        const participantsData = body.participantIds.map((personId) => ({
          event_id: event.id,
          person_id: personId,
        }));

        const { error: participantsError } = await client
          .from("event_participants")
          .insert(participantsData);

        if (participantsError) {
          console.error("Error adding participants:", participantsError);
        }

        await client
          .from("people")
          .update({ last_interaction: body.date })
          .in("id", body.participantIds);
      }

      return reply.status(201).send({ id: event.id });
    },
  );

  /**
   * DELETE /api/events/:id - Delete an event
   */
  fastify.delete(
    "/:id",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client } = auth;
      const { id } = request.params;

      const { error } = await client.from("events").delete().eq("id", id);

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return { message: "Event deleted successfully" };
    },
  );

  /**
   * PATCH /api/events/:id - Update an event
   */
  fastify.patch(
    "/:id",
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: UpdateEventInput }>,
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

      const { error } = await client.from("events").update(updates).eq("id", id);

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      if (body.participantIds) {
        const { error: deleteParticipantsError } = await client
          .from("event_participants")
          .delete()
          .eq("event_id", id);

        if (deleteParticipantsError) {
          return reply.status(500).send({ error: deleteParticipantsError.message });
        }

        if (body.participantIds.length > 0) {
          const participantsData = body.participantIds.map((personId) => ({
            event_id: id,
            person_id: personId,
          }));

          const { error: insertParticipantsError } = await client
            .from("event_participants")
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

      return { message: "Event updated successfully" };
    },
  );
}
