/**
 * Contacts — Enrich Queue Routes
 * Manages the LinkedIn enrichment queue (init, next-batch, status, complete/fail, cancel).
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { Type } from "@sinclair/typebox";
import { getAuth } from "../../../lib/auth.js";
import { UuidParam, NullableString } from "../../../lib/schemas.js";

export function registerEnrichQueueRoutes(fastify: FastifyInstance): void {
  /**
   * GET /api/contacts/enrich-queue/eligible-count
   * Count people with a LinkedIn handle but no people_linkedin record (never synced).
   * Uses the get_linkedin_enrich_eligible RPC for a single efficient join.
   */
  fastify.get(
    "/enrich-queue/eligible-count",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { client, user } = getAuth(request);

      const { data, error } = await client.rpc("get_linkedin_enrich_eligible", {
        p_user_id: user.id,
      });

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return { count: (data || []).length };
    },
  );

  /**
   * GET /api/contacts/enrich-queue/status
   * Returns counts of queue items grouped by status.
   * Used for resume detection on page load.
   */
  fastify.get("/enrich-queue/status", async (request: FastifyRequest, reply: FastifyReply) => {
    const { client, user } = getAuth(request);

    const { data, error } = await client
      .from("linkedin_enrich_queue")
      .select("status")
      .eq("user_id", user.id);

    if (error) {
      return reply.status(500).send({ error: error.message });
    }

    const counts = { pending: 0, completed: 0, failed: 0 };
    for (const row of data || []) {
      if (row.status === "pending" || row.status === "processing") {
        counts.pending++;
      } else if (row.status === "completed") {
        counts.completed++;
      } else if (row.status === "failed") {
        counts.failed++;
      }
    }

    return counts;
  });

  /**
   * POST /api/contacts/enrich-queue/init
   * Initialize a new enrichment run.
   *
   * When `personId` is provided in the body, queues only that single contact.
   * Otherwise queues all eligible contacts (those with a LinkedIn handle but
   * no people_linkedin record yet).
   *
   * 1. Deletes all existing queue rows for the user (clears previous run).
   * 2. Finds eligible contacts (all or just one).
   * 3. Bulk-inserts them as status='pending'.
   * 4. Returns totalEligible.
   *
   * Idempotent — safe to call multiple times.
   */
  fastify.post(
    "/enrich-queue/init",
    {
      schema: {
        body: Type.Optional(
          Type.Object({
            personId: Type.Optional(Type.String()),
          }),
        ),
      },
    },
    async (request: FastifyRequest<{ Body?: { personId?: string } }>, reply: FastifyReply) => {
      const { client, user } = getAuth(request);
      const personId = (request.body as { personId?: string } | undefined)?.personId;

      // Clear any leftover rows from a previous run.
      await client.from("linkedin_enrich_queue").delete().eq("user_id", user.id);

      if (personId) {
        // Single-person mode: verify the contact belongs to this user, then queue just them.
        const { data: person, error: personError } = await client
          .from("people")
          .select("id")
          .eq("id", personId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (personError) {
          return reply.status(500).send({ error: personError.message });
        }

        if (!person) {
          return reply.status(404).send({ error: "Contact not found" });
        }

        const { error: insertError } = await client.from("linkedin_enrich_queue").insert({
          user_id: user.id,
          person_id: personId,
          status: "pending" as const,
        });

        if (insertError) {
          return reply.status(500).send({ error: insertError.message });
        }

        return { totalEligible: 1 };
      }

      // Batch mode: find all eligible contacts via the efficient RPC join.
      const { data: eligible, error: rpcError } = await client.rpc("get_linkedin_enrich_eligible", {
        p_user_id: user.id,
      });

      if (rpcError) {
        return reply.status(500).send({ error: rpcError.message });
      }

      const rows = eligible || [];
      const totalEligible = rows.length;

      if (totalEligible === 0) {
        return { totalEligible: 0 };
      }

      // Bulk-insert all eligible contacts as pending queue items.
      const queueRows = rows.map((r: { person_id: string }) => ({
        user_id: user.id,
        person_id: r.person_id,
        status: "pending" as const,
      }));

      const { error: insertError } = await client.from("linkedin_enrich_queue").insert(queueRows);

      if (insertError) {
        return reply.status(500).send({ error: insertError.message });
      }

      return { totalEligible };
    },
  );

  /**
   * GET /api/contacts/enrich-queue/next-batch
   * Returns the next batch of pending queue items (up to 50).
   *
   * No request body — the queue status IS the exclude list.
   * Joins with people_socials (for handle) and people (for names).
   */
  fastify.get("/enrich-queue/next-batch", async (request: FastifyRequest, reply: FastifyReply) => {
    const BATCH_LIMIT = 50;
    const { client, user } = getAuth(request);

    // Fetch next pending queue items.
    const { data: queueItems, error: queueError } = await client
      .from("linkedin_enrich_queue")
      .select("id, person_id")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(BATCH_LIMIT);

    if (queueError) {
      return reply.status(500).send({ error: queueError.message });
    }

    const items = queueItems || [];
    if (items.length === 0) {
      return { items: [] };
    }

    const personIds = items.map((i) => i.person_id);

    // Fetch handles and names in parallel.
    const [socialsRes, namesRes] = await Promise.all([
      client
        .from("people_socials")
        .select("person_id, handle")
        .eq("user_id", user.id)
        .eq("platform", "linkedin")
        .in("person_id", personIds),
      client
        .from("people")
        .select("id, first_name, last_name")
        .eq("user_id", user.id)
        .in("id", personIds),
    ]);

    const handleMap = new Map(
      (socialsRes.data || []).map((sm) => [sm.person_id, sm.handle as string]),
    );
    const nameMap = new Map(
      (namesRes.data || []).map((p) => [
        p.id,
        { firstName: p.first_name ?? null, lastName: p.last_name ?? null },
      ]),
    );

    return {
      items: items.map((item) => ({
        queueItemId: item.id,
        personId: item.person_id,
        linkedinHandle: handleMap.get(item.person_id) ?? null,
        firstName: nameMap.get(item.person_id)?.firstName ?? null,
        lastName: nameMap.get(item.person_id)?.lastName ?? null,
      })),
    };
  });

  /**
   * PATCH /api/contacts/enrich-queue/:id
   * Update queue item status to completed or failed.
   */
  fastify.patch(
    "/enrich-queue/:id",
    {
      schema: {
        params: UuidParam,
        body: Type.Object({
          status: Type.Union([Type.Literal("completed"), Type.Literal("failed")]),
          errorMessage: Type.Optional(NullableString),
        }),
      },
    },
    async (
      request: FastifyRequest<{
        Params: typeof UuidParam.static;
        Body: { status: "completed" | "failed"; errorMessage?: string | null };
      }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const { id } = request.params;
      const { status, errorMessage } = request.body;

      const { error } = await client
        .from("linkedin_enrich_queue")
        .update({
          status,
          error_message: errorMessage ?? null,
        })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return { success: true };
    },
  );

  /**
   * DELETE /api/contacts/enrich-queue
   * Delete remaining pending queue items (cancel path).
   * Completed/failed rows are preserved and cleaned up by the next init call.
   */
  fastify.delete("/enrich-queue", async (request: FastifyRequest, reply: FastifyReply) => {
    const { client, user } = getAuth(request);

    const { error } = await client.from("linkedin_enrich_queue").delete().eq("user_id", user.id);

    if (error) {
      return reply.status(500).send({ error: error.message });
    }

    return { success: true };
  });
}
