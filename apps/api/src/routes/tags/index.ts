/**

 * Tags API Routes

 * Handles CRUD operations for tags and tag memberships on contacts

 */



import type { FastifyInstance, FastifyReply } from "fastify";
import type { AppFastifyInstance, AppRoutePlugin } from "../../lib/fastify-types.js";

import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";

import { z } from "zod";

import { getAuth } from "../../lib/auth.js";

import { registerApiKeyProtectedHooks } from "../../lib/api-key-access.js";

import { applyOpenApiRouteMeta } from "../../lib/openapi-route-meta.js";

import { withCreatedResponse, withOkResponse } from "../../lib/openapi-route-responses.js";

import { resolveContactAvatarUrl } from "../../lib/supabase.js";

import { searchPeopleIds, restoreRankedOrder, countSearchPeopleIds } from "../../lib/search.js";

import {

  TAG_SELECT,

  extractAvatarOptions,

} from "../../lib/queries.js";

import {

  idsRequestBodySchema,

  peopleListQuerySchema,

  previewListQuerySchema,

  uuidParamSchema,

} from "@bondery/schemas/http";

import {

  buildPaginatedResponse,

  buildPaginationMeta,

  normalizeSearch,

  parsePagination,

  resolveSort,

} from "../../lib/pagination.js";

import {

  createTagInputSchema,

  tagMembershipRequestSchema,

  updateTagSchema,

  tagsListResponseSchema,

  tagResponseSchema,

  messageResponseSchema,

  tagMembersListResponseSchema,

  tagUpdateResponseSchema,

  type Tag,

  type TagWithCount,

  type ContactPreview,

  type TablesUpdate,

} from "@bondery/schemas";



// Fixed color palette for auto-assigning tag colors

const TAG_COLORS = [

  "#3B82F6", // blue

  "#10B981", // emerald

  "#F59E0B", // amber

  "#EF4444", // red

  "#8B5CF6", // violet

  "#EC4899", // pink

  "#14B8A6", // teal

  "#F97316", // orange

  "#6366F1", // indigo

  "#84CC16", // lime

];



/**

 * Selects the next color from the palette by cycling through them

 * based on the current count of tags the user already has.

 */

async function pickNextColor(client: any, userId: string): Promise<string> {

  const { count } = await client

    .from("tags")

    .select("id", { count: "exact", head: true })

    .eq("user_id", userId);



  return TAG_COLORS[(count || 0) % TAG_COLORS.length];

}



export const tagRoutes: AppRoutePlugin = async (fastify) => {

  fastify.addHook("onRoute", (routeOptions) => {

    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Tags"];
    }

    applyOpenApiRouteMeta(routeOptions, { area: "integration" });

  });

  registerApiKeyProtectedHooks(fastify);



  /**

   * GET /api/tags - List all tags with contact counts and preview contacts

   */

  fastify.get(

    "/",

    {

      schema: {
        description: "List all tags with contact counts and optional member previews.",
        querystring: previewListQuerySchema,
        response: withOkResponse(tagsListResponseSchema, "Tag list"),
      } satisfies FastifyZodOpenApiSchema,

    },

    async (request, reply) => {

      const { client, user } = getAuth(request);



      const previewLimitRaw = request.query?.previewLimit;

      const previewLimit = previewLimitRaw ? Number(previewLimitRaw) : 3;

      const includePreview = previewLimit > 0;

      const avatarOptions = extractAvatarOptions(request.query);



      // Get all tags

      const { data: tags, error: tagsError } = await client

        .from("tags")

        .select(TAG_SELECT)

        .order("label", { ascending: true });



      if (tagsError) {

        return reply.status(500).send({ error: tagsError.message });

      }



      // Get memberships for counts and previews

      const { data: memberships, error: countsError } = await client

        .from("people_tags")

        .select("tag_id, person_id");



      if (countsError) {

        return reply.status(500).send({ error: countsError.message });

      }



      const countMap = new Map<string, number>();

      const previewMap = new Map<string, string[]>();



      memberships?.forEach((item: { tag_id: string; person_id: string }) => {

        const current = countMap.get(item.tag_id) || 0;

        countMap.set(item.tag_id, current + 1);



        if (!includePreview) return;

        const existing = previewMap.get(item.tag_id) || [];

        if (existing.length < previewLimit) {

          existing.push(item.person_id);

          previewMap.set(item.tag_id, existing);

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



      const tagsWithCounts: TagWithCount[] = (tags || []).map((tag) => {

        const baseTag = tag as unknown as Tag;

        const pIds = includePreview ? previewMap.get(tag.id) || [] : [];

        const previewContacts = includePreview

          ? (pIds

              .map((id: string) => previewContactsById.get(id))

              .filter(Boolean) as ContactPreview[])

          : undefined;



        return {

          ...baseTag,

          contactCount: countMap.get(tag.id) || 0,

          previewContacts,

        };

      });



      return {

        tags: tagsWithCounts,

        totalCount: tagsWithCounts.length,

      };

    },

  );



  /**

   * POST /api/tags - Create a new tag (color auto-assigned)

   */

  fastify.post(

    "/",

    {

      schema: {
        description: "Create a new tag (color auto-assigned).",
        body: createTagInputSchema,
        response: withCreatedResponse(tagResponseSchema, "Tag created"),
      } satisfies FastifyZodOpenApiSchema,

    },

    async (request, reply) => {

      const { client, user } = getAuth(request);

      const body = request.body;



      const color = await pickNextColor(client, user.id);



      const { data: newTag, error } = await client

        .from("tags")

        .insert({ user_id: user.id, label: body.label.trim(), color })

        .select(TAG_SELECT)

        .single();



      if (error) {

        return reply.status(500).send({ error: error.message });

      }



      return reply.status(201).send({ tag: newTag });

    },

  );



  /**

   * GET /api/tags/:id - Get a single tag

   */

  fastify.get(

    "/:id",

    {

      schema: {
        description: "Get a single tag by ID.",
        params: uuidParamSchema,
        response: withOkResponse(tagResponseSchema, "Tag details"),
      } satisfies FastifyZodOpenApiSchema,

    },

    async (request, reply) => {

      const { client, user } = getAuth(request);

      const { id } = request.params;



      const { data: tag, error } = await client

        .from("tags")

        .select(TAG_SELECT)

        .eq("id", id)

        .eq("user_id", user.id)

        .single();



      if (error) {

        return reply.status(404).send({ error: "Tag not found" });

      }



      return { tag };

    },

  );



  /**

   * PATCH /api/tags/:id - Update a tag label

   */

  fastify.patch(

    "/:id",

    {

      schema: {
        description: "Update a tag label or color.",
        params: uuidParamSchema,
        body: updateTagSchema,
        response: withOkResponse(tagUpdateResponseSchema, "Tag updated"),
      } satisfies FastifyZodOpenApiSchema,

    },

    async (request, reply) => {

      const { client, user } = getAuth(request);

      const { id } = request.params;

      const body = request.body;



      const updates: TablesUpdate<"tags"> = {};



      if (body.label !== undefined) {

        updates.label = body.label.trim();

      }

      if (body.color !== undefined) updates.color = body.color;



      updates.updated_at = new Date().toISOString();



      const { data: updatedTag, error } = await client

        .from("tags")

        .update(updates)

        .eq("id", id)

        .eq("user_id", user.id)

        .select(TAG_SELECT)

        .single();



      if (error) {

        return reply.status(500).send({ error: error.message });

      }



      if (!updatedTag) {

        return reply.status(404).send({ error: "Tag not found" });

      }



      return { message: "Tag updated successfully", tag: updatedTag };

    },

  );



  /**

   * DELETE /api/tags/:id - Delete a single tag

   */

  fastify.delete(

    "/:id",

    {

      schema: {
        description: "Delete a single tag by ID.",
        params: uuidParamSchema,
        response: withOkResponse(
          messageResponseSchema,
          "Tag deleted successfully",
        ),
      } satisfies FastifyZodOpenApiSchema,

    },

    async (request, reply) => {

      const { client, user } = getAuth(request);

      const { id } = request.params;



      const { error } = await client

        .from("tags")

        .delete()

        .eq("id", id)

        .eq("user_id", user.id);



      if (error) {

        return reply.status(500).send({ error: error.message });

      }



      return { message: "Tag deleted successfully" };

    },

  );



  /**

   * DELETE /api/tags - Delete multiple tags

   */

  fastify.delete(

    "/",

    {

      schema: {
        description: "Delete multiple tags by ID.",
        body: idsRequestBodySchema,
        response: withOkResponse(
          messageResponseSchema,
          "Tags deleted successfully",
        ),
      } satisfies FastifyZodOpenApiSchema,

    },

    async (request, reply) => {

      const { client, user } = getAuth(request);

      const { ids } = request.body;



      const { error } = await client

        .from("tags")

        .delete()

        .eq("user_id", user.id)

        .in("id", ids);



      if (error) {

        return reply.status(500).send({ error: error.message });

      }



      return { message: "Tags deleted successfully" };

    },

  );



  /**

   * GET /api/tags/:id/contacts - Get contacts that have this tag

   */

  fastify.get(

    "/:id/contacts",

    {

      schema: {
        description: "List paginated contacts that have this tag.",
        params: uuidParamSchema,
        querystring: peopleListQuerySchema,
        response: withOkResponse(
          tagMembersListResponseSchema,
          "Tag members",
        ),
      } satisfies FastifyZodOpenApiSchema,

    },

    async (request, reply) => {

      const { client, user } = getAuth(request);

      const { id: tagId } = request.params;

      const query = request.query;

      const { limit, offset } = parsePagination(query);

      const search = normalizeSearch(query.search);

      const effectiveSort = resolveSort(query.sort, "nameAsc");

      const avatarOptions = extractAvatarOptions(query);



      const { data: tag, error: tagError } = await client

        .from("tags")

        .select("id")

        .eq("id", tagId)

        .eq("user_id", user.id)

        .single();



      if (tagError || !tag) {

        return reply.status(404).send({ error: "Tag not found" });

      }



      let contacts: Array<{

        id: string;

        firstName: string;

        lastName: string | null;

        updatedAt: string | null;

        hasAvatar: boolean;

      }> = [];

      let totalCount = 0;



      if (search) {

        const [searchResult, countResult] = await Promise.all([

          searchPeopleIds(client, user.id, search, limit, offset, { tagId }),

          countSearchPeopleIds(client, user.id, search, { tagId }),

        ]);



        if (searchResult.error) {

          return reply.status(500).send({ error: searchResult.error });

        }

        if (countResult.error) {

          return reply.status(500).send({ error: countResult.error });

        }



        totalCount = countResult.count ?? 0;



        if (searchResult.ranked && searchResult.ranked.length > 0) {

          const rankedIds = searchResult.ranked.map((r) => r.id);

          const { data: fetchedContacts, error: fetchError } = await client

            .from("people")

            .select("id, firstName:first_name, lastName:last_name, updatedAt:updated_at, hasAvatar:has_avatar")

            .in("id", rankedIds)

            .eq("myself", false);



          if (fetchError) {

            return reply.status(500).send({ error: fetchError.message });

          }



          contacts = restoreRankedOrder(fetchedContacts || [], rankedIds);

        }

      } else {

        let contactsQuery = client

          .from("people")

          .select("id, firstName:first_name, lastName:last_name, updatedAt:updated_at, hasAvatar:has_avatar, people_tags!inner(tag_id)", {

            count: "exact",

          })

          .eq("myself", false)

          .eq("people_tags.tag_id", tagId);



        switch (query.sort) {

          case "nameDesc":

            contactsQuery = contactsQuery.order("first_name", { ascending: false });

            break;

          case "surnameAsc":

            contactsQuery = contactsQuery.order("last_name", { ascending: true, nullsFirst: true });

            break;

          case "surnameDesc":

            contactsQuery = contactsQuery.order("last_name", { ascending: false, nullsFirst: false });

            break;

          case "interactionAsc":

            contactsQuery = contactsQuery.order("last_interaction", { ascending: true, nullsFirst: true });

            break;

          case "interactionDesc":

            contactsQuery = contactsQuery.order("last_interaction", { ascending: false, nullsFirst: false });

            break;

          case "nameAsc":

          default:

            contactsQuery = contactsQuery.order("first_name", { ascending: true });

            break;

        }



        const { data: contactRows, error: contactsError, count } = await contactsQuery.range(

          offset,

          offset + limit - 1,

        );



        if (contactsError) {

          return reply.status(500).send({ error: contactsError.message });

        }



        contacts = (contactRows || []).map((row: any) => {

          const { people_tags: _pt, ...contact } = row;

          return contact;

        });

        totalCount = typeof count === "number" ? count : contacts.length;

      }



      const enrichedContacts = contacts.map((c) => ({

        ...c,

        avatar: resolveContactAvatarUrl(

          client,

          user.id,

          {

            id: c.id,

            hasAvatar: c.hasAvatar,

            updatedAt: c.updatedAt,

          },

          avatarOptions,

        ),

      }));



      const pagination = buildPaginationMeta({

        limit,

        offset,

        totalCount,

        itemCount: enrichedContacts.length,

        sort: effectiveSort,

        search,

      });



      return buildPaginatedResponse("contacts", enrichedContacts, pagination);

    },

  );



  /**

   * POST /api/tags/:id/contacts - Add contacts to a tag

   */

  fastify.post(

    "/:id/contacts",

    {

      schema: {
        description: "Add contacts to a tag.",
        params: uuidParamSchema,
        body: tagMembershipRequestSchema,
        response: withOkResponse(
          messageResponseSchema,
          "Contacts added to tag successfully",
        ),
      } satisfies FastifyZodOpenApiSchema,

    },

    async (request, reply) => {

      const { client, user } = getAuth(request);

      const { id: tagId } = request.params;

      const { personIds } = request.body;



      // Verify tag ownership before adding contacts

      const { data: tag, error: tagError } = await client

        .from("tags")

        .select("id")

        .eq("id", tagId)

        .eq("user_id", user.id)

        .single();



      if (tagError || !tag) {

        return reply.status(404).send({ error: "Tag not found" });

      }



      const memberships = personIds.map((personId: string) => ({

        person_id: personId,

        tag_id: tagId,

        user_id: user.id,

      }));



      const { error } = await client.from("people_tags").upsert(memberships, {

        onConflict: "person_id,tag_id",

        ignoreDuplicates: true,

      });



      if (error) {

        return reply.status(500).send({ error: error.message });

      }



      return { message: "Contacts added to tag successfully" };

    },

  );



  /**

   * DELETE /api/tags/:id/contacts - Remove contacts from a tag

   */

  fastify.delete(

    "/:id/contacts",

    {

      schema: {
        description: "Remove contacts from a tag.",
        params: uuidParamSchema,
        body: tagMembershipRequestSchema,
        response: withOkResponse(
          messageResponseSchema,
          "Contacts removed from tag successfully",
        ),
      } satisfies FastifyZodOpenApiSchema,

    },

    async (request, reply) => {

      const { client, user } = getAuth(request);

      const { id: tagId } = request.params;

      const { personIds } = request.body;



      // Verify tag ownership before removing contacts

      const { data: tag, error: tagError } = await client

        .from("tags")

        .select("id")

        .eq("id", tagId)

        .eq("user_id", user.id)

        .single();



      if (tagError || !tag) {

        return reply.status(404).send({ error: "Tag not found" });

      }



      const { error } = await client

        .from("people_tags")

        .delete()

        .eq("tag_id", tagId)

        .in("person_id", personIds);



      if (error) {

        return reply.status(500).send({ error: error.message });

      }



      return { message: "Contacts removed from tag successfully" };

    },

  );

}


