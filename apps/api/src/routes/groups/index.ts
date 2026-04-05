/**
 * Groups API Routes
 * Handles CRUD operations for groups and group memberships
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { Type } from "@sinclair/typebox";
import { getAuth } from "../../lib/auth.js";
import {
  UuidParam,
  IdsBody,
  GROUP_SELECT,
  AvatarQualityEnum,
  AvatarSizeEnum,
  extractAvatarOptions,
} from "../../lib/schemas.js";
import { buildContactAvatarUrl } from "../../lib/supabase.js";
import type { Group, GroupWithCount, ContactPreview } from "@bondery/types";

import { registerGroupContactRoutes } from "./contacts.js";

// ── TypeBox Schemas ──────────────────────────────────────────────────────────

const GroupsQuery = Type.Object({
  previewLimit: Type.Optional(Type.String()),
  avatarQuality: Type.Optional(AvatarQualityEnum),
  avatarSize: Type.Optional(AvatarSizeEnum),
});

const CreateGroupBody = Type.Object({
  label: Type.String({ minLength: 1 }),
  emoji: Type.Optional(Type.String()),
  color: Type.String({ minLength: 1 }),
});

const UpdateGroupBody = Type.Object({
  label: Type.Optional(Type.String({ minLength: 1 })),
  emoji: Type.Optional(Type.String()),
  color: Type.Optional(Type.String()),
});

export async function groupRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRoute", (routeOptions) => {
    routeOptions.schema = { ...routeOptions.schema, tags: ["Groups"] };
  });
  fastify.addHook("onRequest", fastify.auth([fastify.verifySession]));

  /**
   * GET /api/groups - List all groups with contact counts
   */
  fastify.get(
    "/",
    { schema: { querystring: GroupsQuery } },
    async (
      request: FastifyRequest<{ Querystring: typeof GroupsQuery.static }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);

      const previewLimitRaw = request.query?.previewLimit;
      const previewLimit = previewLimitRaw ? Number(previewLimitRaw) : undefined;
      const includePreview = Number.isFinite(previewLimit) && (previewLimit as number) > 0;
      const avatarOptions = extractAvatarOptions(request.query);

      // Get all groups
      const { data: groups, error: groupsError } = await client
        .from("groups")
        .select(GROUP_SELECT)
        .order("label", { ascending: true });

      if (groupsError) {
        return reply.status(500).send({ error: groupsError.message });
      }

      // Get contact counts (and optional previews) for each group
      const { data: memberships, error: countsError } = await client
        .from("people_groups")
        .select("group_id, person_id");

      if (countsError) {
        return reply.status(500).send({ error: countsError.message });
      }

      // Calculate counts per group
      const countMap = new Map<string, number>();
      const previewMap = new Map<string, string[]>();

      memberships?.forEach((item) => {
        const current = countMap.get(item.group_id) || 0;
        countMap.set(item.group_id, current + 1);

        if (!includePreview) return;

        const existing = previewMap.get(item.group_id) || [];
        if (existing.length < (previewLimit as number)) {
          existing.push(item.person_id);
          previewMap.set(item.group_id, existing);
        }
      });

      let previewContactsById = new Map<string, ContactPreview>();

      if (includePreview) {
        const previewIds = Array.from(new Set(Array.from(previewMap.values()).flat()));

        if (previewIds.length > 0) {
          const { data: previewContacts, error: previewError } = await client
            .from("people")
            .select(`id, firstName:first_name, lastName:last_name, updatedAt:updated_at`)
            .in("id", previewIds)
            .eq("myself", false);

          if (previewError) {
            return reply.status(500).send({ error: previewError.message });
          }

          previewContactsById = new Map(
            (previewContacts || []).map((contact) => [
              contact.id,
              {
                ...contact,
                avatar: buildContactAvatarUrl(
                  client,
                  user.id,
                  contact.id,
                  avatarOptions,
                  contact.updatedAt,
                ),
              } as ContactPreview,
            ]),
          );
        }
      }

      // Combine groups with counts
      const groupsWithCounts: GroupWithCount[] = (groups || []).map((group) => {
        const baseGroup = group as unknown as Group;
        const previewIds = includePreview ? previewMap.get(group.id) || [] : [];
        const previewContacts = includePreview
          ? (previewIds
              .map((id) => previewContactsById.get(id))
              .filter(Boolean) as ContactPreview[])
          : undefined;

        return {
          ...baseGroup,
          contactCount: countMap.get(group.id) || 0,
          previewContacts,
        };
      });

      return {
        groups: groupsWithCounts,
        totalCount: groupsWithCounts.length,
      };
    },
  );

  /**
   * POST /api/groups - Create a new group
   */
  fastify.post(
    "/",
    { schema: { body: CreateGroupBody } },
    async (
      request: FastifyRequest<{ Body: { label: string; emoji?: string; color: string } }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const body = request.body;

      // Prepare insert data
      const insertData: any = {
        user_id: user.id,
        label: body.label.trim(),
        emoji: body.emoji?.trim() || null,
        color: body.color?.trim() || null,
      };

      // Insert group
      const { data: newGroup, error } = await client
        .from("groups")
        .insert(insertData)
        .select("id")
        .single();

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return reply.status(201).send({ id: newGroup.id });
    },
  );

  /**
   * GET /api/groups/:id - Get a single group
   */
  fastify.get(
    "/:id",
    { schema: { params: UuidParam } },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { client, user } = getAuth(request);
      const { id } = request.params;

      const { data: group, error } = await client
        .from("groups")
        .select(GROUP_SELECT)
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (error) {
        return reply.status(404).send({ error: "Group not found" });
      }

      return { group };
    },
  );

  /**
   * PATCH /api/groups/:id - Update a group
   */
  fastify.patch(
    "/:id",
    { schema: { params: UuidParam, body: UpdateGroupBody } },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: { label?: string; emoji?: string; color?: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const { id } = request.params;
      const body = request.body;

      // Map camelCase to snake_case
      const updates: Record<string, unknown> = {};

      if (body.label !== undefined) {
        updates.label = body.label;
      }
      if (body.emoji !== undefined) updates.emoji = body.emoji;
      if (body.color !== undefined) updates.color = body.color;

      updates.updated_at = new Date().toISOString();

      const { error } = await client
        .from("groups")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return { message: "Group updated successfully" };
    },
  );

  /**
   * DELETE /api/groups - Delete multiple groups
   */
  fastify.delete(
    "/",
    { schema: { body: IdsBody } },
    async (request: FastifyRequest<{ Body: { ids: string[] } }>, reply: FastifyReply) => {
      const { client, user } = getAuth(request);
      const { ids } = request.body;

      const { error } = await client.from("groups").delete().eq("user_id", user.id).in("id", ids);

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return { message: "Groups deleted successfully" };
    },
  );

  /**
   * DELETE /api/groups/:id - Delete a single group
   */
  fastify.delete(
    "/:id",
    { schema: { params: UuidParam } },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { client, user } = getAuth(request);
      const { id } = request.params;

      const { error } = await client.from("groups").delete().eq("id", id).eq("user_id", user.id);

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return { message: "Group deleted successfully" };
    },
  );

  registerGroupContactRoutes(fastify);
}
