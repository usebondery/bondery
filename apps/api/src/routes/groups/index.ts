/**
 * Groups API Routes
 * Handles CRUD operations for groups and group memberships
 */

import type { FastifyReply } from "fastify";
import type { AppRoutePlugin, FastifyZodOpenApiSchema } from "../../lib/fastify-types.js";
import { getAuth } from "../../lib/auth.js";
import { registerApiKeyProtectedHooks } from "../../lib/api-key-access.js";
import { applyOpenApiRouteMeta } from "../../lib/openapi-route-meta.js";
import { withCreatedResponse, withOkResponse } from "../../lib/openapi-route-responses.js";
import { GROUP_SELECT, extractAvatarOptions } from "../../lib/queries.js";
import { idsRequestBodySchema, previewListQuerySchema, uuidParamSchema } from "@bondery/schemas/http";
import { createGroupSchema, groupResponseSchema, groupsListResponseSchema, messageResponseSchema, updateGroupSchema } from "@bondery/schemas";
import { resolveContactAvatarUrl } from "../../lib/supabase.js";
import type {
  Group,
  GroupWithCount,
  ContactPreview,
  TablesUpdate,
} from "@bondery/schemas";
import { GROUP_LABEL_MAX_LENGTH } from "@bondery/schemas/constants";

import { registerGroupContactRoutes } from "./contacts.js";

export const groupRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Groups"];
    }
    applyOpenApiRouteMeta(routeOptions, { area: "integration" });
  });
  registerApiKeyProtectedHooks(fastify);

  /**
   * GET /api/groups - List all groups with contact counts
   */
  fastify.get(
    "/",
    {
      schema: {
        description: "List all groups with contact counts and optional member previews.",
        querystring: previewListQuerySchema,
        response: withOkResponse(groupsListResponseSchema, "Group list"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const { client, user } = getAuth(request);

      const previewLimitRaw = request.query?.previewLimit;
      const previewLimit = previewLimitRaw
        ? Number(previewLimitRaw)
        : undefined;
      const includePreview =
        Number.isFinite(previewLimit) && (previewLimit as number) > 0;
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
        const previewIds = Array.from(
          new Set(Array.from(previewMap.values()).flat()),
        );

        if (previewIds.length > 0) {
          const { data: previewContacts, error: previewError } = await client
            .from("people")
            .select(
              `id, firstName:first_name, lastName:last_name, updatedAt:updated_at, hasAvatar:has_avatar`,
            )
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
                avatar: resolveContactAvatarUrl(
                  client,
                  user.id,
                  {
                    id: contact.id,
                    hasAvatar: contact.hasAvatar,
                    updatedAt: contact.updatedAt,
                  },
                  avatarOptions,
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
    {
      schema: {
        description: "Create a new group.",
        body: createGroupSchema,
        response: withCreatedResponse(groupResponseSchema, "Group created"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const { client, user } = getAuth(request);
      const body = request.body;

      const insertData: any = {
        user_id: user.id,
        label: body.label.trim(),
        emoji: body.emoji.trim() || null,
        color: body.color.trim() || null,
      };

      // Insert group
      const { data: newGroup, error } = await client
        .from("groups")
        .insert(insertData)
        .select(GROUP_SELECT)
        .single();

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return reply.status(201).send({ group: newGroup });
    },
  );

  /**
   * GET /api/groups/:id - Get a single group
   */
  fastify.get(
    "/:id",
    {
      schema: {
        description: "Get a single group by ID.",
        params: uuidParamSchema,
        response: withOkResponse(groupResponseSchema, "Group details"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
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
    {
      schema: {
        description: "Update a group by ID.",
        params: uuidParamSchema,
        body: updateGroupSchema,
        response: withOkResponse(groupResponseSchema, "Updated group"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const { client, user } = getAuth(request);
      const { id } = request.params;
      const body = request.body;

      const updates: TablesUpdate<"groups"> = {};

      if (body.label !== undefined) updates.label = body.label.trim();
      if (body.emoji !== undefined) updates.emoji = body.emoji.trim();
      if (body.color !== undefined) updates.color = body.color.trim();

      updates.updated_at = new Date().toISOString();

      const { data: group, error } = await client
        .from("groups")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id)
        .select(GROUP_SELECT)
        .single();

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      if (!group) {
        return reply.status(404).send({ error: "Group not found" });
      }

      return { group };
    },
  );

  /**
   * DELETE /api/groups - Delete multiple groups
   */
  fastify.delete(
    "/",
    {
      schema: {
        description: "Delete multiple groups by ID.",
        body: idsRequestBodySchema,
        response: withOkResponse(
          messageResponseSchema,
          "Groups deleted successfully",
        ),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const { client, user } = getAuth(request);
      const { ids } = request.body;

      const { error } = await client
        .from("groups")
        .delete()
        .eq("user_id", user.id)
        .in("id", ids);

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
    {
      schema: {
        description: "Delete a single group by ID.",
        params: uuidParamSchema,
        response: withOkResponse(
          messageResponseSchema,
          "Group deleted successfully",
        ),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const { client, user } = getAuth(request);
      const { id } = request.params;

      const { error } = await client
        .from("groups")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return { message: "Group deleted successfully" };
    },
  );

  registerGroupContactRoutes(fastify);
}
