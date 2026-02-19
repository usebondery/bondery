/**
 * Activities API Routes
 * Handles CRUD operations for activities
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireAuth } from "../lib/supabase.js";
import type { CreateActivityInput, UpdateActivityInput } from "@bondery/types";

export async function activityRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/activities - List all activities
   */
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) return;

    const { client } = auth;

    const { data: activities, error } = await client
      .from("activities")
      .select(
        `
        *,
        participants:activity_participants(
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
      console.error("Error fetching activities:", error);
      return reply.status(500).send({ error: error.message });
    }

    // Transform data to match frontend expectations (flatten participants)
    const formattedActivities = activities.map((activity: any) => ({
      ...activity,
      userId: activity.user_id,
      createdAt: activity.created_at,
      updatedAt: activity.updated_at,
      participants: activity.participants.map((p: any) => p.person),
    }));

    return {
      activities: formattedActivities,
      totalCount: activities.length,
    };
  });

  /**
   * POST /api/activities - Create a new activity
   */
  fastify.post(
    "/",
    async (request: FastifyRequest<{ Body: CreateActivityInput }>, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client, user } = auth;
      const body = request.body;

      // Validation
      if (!body.type) {
        return reply.status(400).send({ error: "Type is required" });
      }

      if (!body.date) {
        return reply.status(400).send({ error: "Date is required" });
      }

      // 1. Insert activity
      const { data: activity, error: activityError } = await client
        .from("activities")
        .insert({
          user_id: user.id,
          title: body.title || null,
          type: body.type,
          description: body.description || null,
          date: body.date,
        })
        .select()
        .single();

      if (activityError) {
        console.error("Error creating activity:", activityError);
        return reply.status(500).send({ error: activityError.message });
      }

      // 2. Insert participants if any
      if (body.participantIds && body.participantIds.length > 0) {
        const participantsData = body.participantIds.map((personId) => ({
          activity_id: activity.id,
          person_id: personId,
        }));

        const { error: participantsError } = await client
          .from("activity_participants")
          .insert(participantsData);

        if (participantsError) {
          console.error("Error adding participants:", participantsError);
          // Don't fail the whole request, but log it.
          // Ideally we might want to transaction this, but supabase-js via HTTP doesn't do transactions easily
          // without RPC.
        }

        // Also update last_interaction for these contacts
        await client
          .from("people")
          .update({ last_interaction: body.date })
          .in("id", body.participantIds);
      }

      return reply.status(201).send({ id: activity.id });
    },
  );

  /**
   * DELETE /api/activities/:id - Delete an activity
   */
  fastify.delete(
    "/:id",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client } = auth;
      const { id } = request.params;

      const { error } = await client.from("activities").delete().eq("id", id);

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return { message: "Activity deleted successfully" };
    },
  );

  /**
   * PATCH /api/activities/:id - Update an activity
   */
  fastify.patch(
    "/:id",
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: UpdateActivityInput }>,
      reply: FastifyReply,
    ) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client } = auth;
      const { id } = request.params;
      const body = request.body;

      // Update fields
      const updates: any = {};
      if (body.title !== undefined) updates.title = body.title;
      if (body.description !== undefined) updates.description = body.description;
      if (body.type !== undefined) updates.type = body.type;
      if (body.date !== undefined) updates.date = body.date;

      const { error } = await client.from("activities").update(updates).eq("id", id);

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      if (body.participantIds) {
        const { error: deleteParticipantsError } = await client
          .from("activity_participants")
          .delete()
          .eq("activity_id", id);

        if (deleteParticipantsError) {
          return reply.status(500).send({ error: deleteParticipantsError.message });
        }

        if (body.participantIds.length > 0) {
          const participantsData = body.participantIds.map((personId) => ({
            activity_id: id,
            person_id: personId,
          }));

          const { error: insertParticipantsError } = await client
            .from("activity_participants")
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

      return { message: "Activity updated successfully" };
    },
  );
}
