/**
 * Contacts API Routes
 * Handles CRUD operations for contacts
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
  resolveContactPersonIds,
  ResolveContactPersonIdsError,
} from "../../lib/resolve-contact-person-ids.js";
import { generateVCard } from "./vcard.js";
import {
  parseEmailEntries,
  parsePhoneEntries,
  replaceContactEmails,
  replaceContactPhones,
} from "./channels.js";
import { parseAddressEntries, replaceContactAddresses } from "./addresses.js";
import {
  findPersonIdBySocial,
  upsertContactSocials,
} from "../../lib/socials.js";
import { cachedGeocodeLinkedInLocation } from "../../lib/mapy.js";
import {
  attachContactExtras,
  loadEnrichedContact,
  type FullContactExtras,
} from "../../lib/contact-enrichment.js";
import type {
  Contact,
  ContactAddressEntry,
  EmailEntry,
  ImportantDateType,
  PhoneEntry,
  SocialPlatform,
  TablesUpdate,
} from "@bondery/schemas";
import {
  contactsFilterSchema,
  contactGroupsResponseSchema,
  contactResponseSchema,
  contactsListResponseSchema,
  createContactApiInputSchema,
  createContactResponseSchema,
  deleteContactResponseSchema,
  deleteContactsRequestSchema,
  deleteContactsResponseSchema,
  mapAddressPinsResponseSchema,
  mapPinsResponseSchema,
} from "@bondery/schemas";
import {
  contactAddressEntrySchema,
  emailEntryEntitySchema,
  phoneEntryEntitySchema,
} from "@bondery/schemas";
import {
  avatarTransformQuerySchema,
  peopleListQuerySchema,
  uuidParamSchema,
} from "@bondery/schemas/http";
import {
  CONTACT_SELECT,
  GROUP_SELECT,
  extractAvatarOptions,
} from "../../lib/queries.js";
import {
  buildPaginatedResponse,
  buildPaginationMeta,
  normalizeSearch,
  parsePagination,
  resolveSort,
} from "../../lib/pagination.js";
import { registerMergeRoutes } from "./merge/index.js";
import { registerEnrichmentRoutes } from "./enrichment/index.js";
import { registerRelationshipRoutes } from "./relationships/index.js";
import {
  registerImportantDateRoutes,
  IMPORTANT_DATE_TYPES,
} from "./important-dates/index.js";
import { registerPhotoRoutes } from "./photo/index.js";
import { registerTagRoutes } from "./tags/index.js";
import { deleteOrphanedInteractionsForDeletedContacts } from "../../lib/delete-orphaned-interactions-for-contacts.js";
import { createContact, updateContact, deleteContact } from "../../domains/contacts/index.js";
import { handleDomainError } from "../../lib/sync/handle-domain-error.js";

const LOOKUP_SOCIAL_PLATFORMS: SocialPlatform[] = [
  "instagram",
  "linkedin",
  "facebook",
];

// ── Zod Schemas ──────────────────────────────────────────────────

const nullableString = z.union([z.string(), z.null()]);
const nullableNumber = z.union([z.number(), z.null()]);

const lookupPlatformSchema = z.enum(["instagram", "linkedin", "facebook"]);

const createContactBodySchema = createContactApiInputSchema.extend({
  id: z.string().uuid().optional(),
});

const patchContactBodySchema = z.object({
  firstName: z.string().min(1).optional(),
  middleName: nullableString.optional(),
  lastName: nullableString.optional(),
  headline: nullableString.optional(),
  location: nullableString.optional(),
  notes: nullableString.optional(),
  language: nullableString.optional(),
  timezone: nullableString.optional(),
  gisPoint: nullableString.optional(),
  latitude: nullableNumber.optional(),
  longitude: nullableNumber.optional(),
  lastInteraction: nullableString.optional(),
  keepFrequencyDays: z.union([z.number().int().min(1), z.null()]).optional(),
  phones: z.array(phoneEntryEntitySchema).optional(),
  emails: z.array(emailEntryEntitySchema).optional(),
  addresses: z.array(contactAddressEntrySchema).optional(),
  linkedin: nullableString.optional(),
  instagram: nullableString.optional(),
  whatsapp: nullableString.optional(),
  facebook: nullableString.optional(),
  website: nullableString.optional(),
  signal: nullableString.optional(),
});

const deleteContactsBodySchema = deleteContactsRequestSchema;

const bySocialQuerySchema = z.object({
  platform: z.string().optional(),
  handle: z.string().optional(),
  avatarQuality: avatarTransformQuerySchema.shape.avatarQuality,
  avatarSize: avatarTransformQuerySchema.shape.avatarSize,
});

const mapBoundsQuerySchema = z.object({
  minLat: z.coerce.number().min(-90).max(90),
  maxLat: z.coerce.number().min(-90).max(90),
  minLon: z.coerce.number().min(-180).max(180),
  maxLon: z.coerce.number().min(-180).max(180),
  limit: z.coerce.number().int().min(1).max(1000).optional().default(500),
  avatarQuality: avatarTransformQuerySchema.shape.avatarQuality,
  avatarSize: avatarTransformQuerySchema.shape.avatarSize,
});

const mapPinsQuerySchema = mapBoundsQuerySchema;
const mapAddressPinsQuerySchema = mapBoundsQuerySchema;

function isLookupPlatform(
  value: string,
): value is (typeof LOOKUP_SOCIAL_PLATFORMS)[number] {
  return LOOKUP_SOCIAL_PLATFORMS.includes(
    value as (typeof LOOKUP_SOCIAL_PLATFORMS)[number],
  );
}

function toContactPreview(
  client: Parameters<typeof resolveContactAvatarUrl>[0],
  userId: string,
  person: {
    id: string;
    first_name: string;
    last_name: string | null;
    has_avatar: boolean;
    updated_at?: string | null;
  },
  avatarOptions?: Parameters<typeof resolveContactAvatarUrl>[3],
) {
  return {
    id: person.id,
    firstName: person.first_name,
    lastName: person.last_name,
    avatar: resolveContactAvatarUrl(
      client,
      userId,
      {
        id: person.id,
        hasAvatar: person.has_avatar,
        updatedAt: person.updated_at,
      },
      avatarOptions,
    ),
  };
}

function withEmptyChannels<T extends { id: string }>(
  rows: T[],
): Array<T & { phones: []; emails: []; addresses: [] }> {
  return rows.map((row) => ({
    ...row,
    phones: [],
    emails: [],
    addresses: [],
  }));
}

function withEmptySocials<
  T extends {
    id: string;
  },
>(
  rows: T[],
): Array<
  T & {
    avatar: null;
    linkedin: null;
    instagram: null;
    whatsapp: null;
    facebook: null;
    website: null;
    signal: null;
  }
> {
  return rows.map((row) => ({
    ...row,
    avatar: null,
    linkedin: null,
    instagram: null,
    whatsapp: null,
    facebook: null,
    website: null,
    signal: null,
  }));
}

/**
 * Collects all LinkedIn IDs (company and school) referenced by the work/education
 * history of the given persons. Must be called BEFORE deleting the persons so the
 * rows are still present.
 *
 * @param client Authenticated Supabase client.
 * @param userId The user who owns the contacts.
 * @param personIds The IDs of the contacts about to be deleted.
 * @returns Deduplicated array of LinkedIn IDs whose logos may become orphaned.
 */
async function collectLinkedInLogoIds(
  client: any,
  userId: string,
  personIds: string[],
): Promise<string[]> {
  if (personIds.length === 0) return [];

  const [workResult, eduResult] = await Promise.all([
    client
      .from("people_work_history")
      .select("company_linkedin_id")
      .eq("user_id", userId)
      .in("person_id", personIds)
      .not("company_linkedin_id", "is", null),
    client
      .from("people_education_history")
      .select("school_linkedin_id")
      .eq("user_id", userId)
      .in("person_id", personIds)
      .not("school_linkedin_id", "is", null),
  ]);

  const ids = new Set<string>();
  for (const row of workResult.data ?? []) ids.add(row.company_linkedin_id);
  for (const row of eduResult.data ?? []) ids.add(row.school_linkedin_id);
  return Array.from(ids);
}

/**
 * After the persons have been deleted (and their work/education rows cascaded away),
 * checks which of the candidate LinkedIn IDs are no longer referenced by any remaining
 * row for this user, then removes those orphaned logo files from Supabase Storage.
 *
 * @param client Authenticated Supabase client.
 * @param userId The user who owns the contacts.
 * @param candidateIds LinkedIn IDs collected before deletion via collectLinkedInLogoIds.
 */
async function removeOrphanedLinkedInLogos(
  client: any,
  userId: string,
  candidateIds: string[],
): Promise<void> {
  if (candidateIds.length === 0) return;

  const [workResult, eduResult] = await Promise.all([
    client
      .from("people_work_history")
      .select("company_linkedin_id")
      .eq("user_id", userId)
      .in("company_linkedin_id", candidateIds),
    client
      .from("people_education_history")
      .select("school_linkedin_id")
      .eq("user_id", userId)
      .in("school_linkedin_id", candidateIds),
  ]);

  const stillReferenced = new Set<string>();
  for (const row of workResult.data ?? [])
    stillReferenced.add(row.company_linkedin_id);
  for (const row of eduResult.data ?? [])
    stillReferenced.add(row.school_linkedin_id);

  const orphaned = candidateIds.filter((id) => !stillReferenced.has(id));
  if (orphaned.length === 0) return;

  const paths = orphaned.map((id) => `${userId}/${id}.jpg`);
  await client.storage.from("linkedin_logos").remove(paths);
}

export const contactRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Contacts"];
    }
    applyOpenApiRouteMeta(routeOptions, { area: "integration" });
  });
  registerApiKeyProtectedHooks(fastify);

  registerMergeRoutes(fastify);
  registerEnrichmentRoutes(fastify);
  registerRelationshipRoutes(fastify);
  registerImportantDateRoutes(fastify);

  /**
   * GET /api/contacts/map-pins - Fetch lightweight pin data for contacts within a bounding box
   */
  fastify.get(
    "/map-pins",
    {
      schema: {
        description: "Fetch lightweight map pins for contacts within a bounding box.",
        querystring: mapPinsQuerySchema,
        response: withOkResponse(
          mapPinsResponseSchema,
          "Map pins within the bounding box",
        ),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const { client, user } = getAuth(request);
      const { minLat, maxLat, minLon, maxLon, limit = 500 } = request.query;
      const avatarOptions = extractAvatarOptions(request.query);

      const { data, error } = await client.rpc("get_map_pins_in_bbox", {
        p_user_id: user.id,
        p_min_lat: minLat,
        p_max_lat: maxLat,
        p_min_lon: minLon,
        p_max_lon: maxLon,
        p_limit: Math.min(limit, 1000),
      });

      if (error) {
        request.log.error({ err: error }, "Error fetching map pins");
        return reply.status(500).send({ error: error.message });
      }

      const pins = (data || []).map(
        (row: {
          id: string;
          first_name: string;
          last_name: string | null;
          headline: string | null;
          location: string | null;
          last_interaction: string | null;
          latitude: number;
          longitude: number;
          updated_at: string;
          has_avatar: boolean;
        }) => ({
          id: row.id,
          firstName: row.first_name,
          lastName: row.last_name,
          headline: row.headline,
          location: row.location,
          lastInteraction: row.last_interaction,
          latitude: row.latitude,
          longitude: row.longitude,
          avatar: resolveContactAvatarUrl(
            client,
            user.id,
            {
              id: row.id,
              hasAvatar: row.has_avatar,
              updatedAt: row.updated_at,
            },
            avatarOptions,
          ),
        }),
      );

      return { pins };
    },
  );

  /**
   * GET /api/contacts/map-address-pins - Fetch address pin data within a bounding box.
   * Returns one row per people_addresses record (not deduplicated by person).
   */
  fastify.get(
    "/map-address-pins",
    {
      schema: {
        description:
          "Fetch address-level map pins within a bounding box (one pin per address).",
        querystring: mapAddressPinsQuerySchema,
        response: withOkResponse(
          mapAddressPinsResponseSchema,
          "Address map pins within the bounding box",
        ),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const { client, user } = getAuth(request);
      const { minLat, maxLat, minLon, maxLon, limit = 500 } = request.query;
      const avatarOptions = extractAvatarOptions(request.query);

      const { data, error } = await client.rpc("get_map_address_pins_in_bbox", {
        p_user_id: user.id,
        p_min_lat: minLat,
        p_max_lat: maxLat,
        p_min_lon: minLon,
        p_max_lon: maxLon,
        p_limit: Math.min(limit, 1000),
      });

      if (error) {
        request.log.error({ err: error }, "Error fetching map address pins");
        return reply.status(500).send({ error: error.message });
      }

      const pins = (data || []).map(
        (row: {
          address_id: string;
          person_id: string;
          first_name: string;
          last_name: string | null;
          address_type: string;
          address_formatted: string | null;
          address_city: string | null;
          address_country: string | null;
          latitude: number;
          longitude: number;
          updated_at: string;
          has_avatar: boolean;
        }) => ({
          addressId: row.address_id,
          personId: row.person_id,
          firstName: row.first_name,
          lastName: row.last_name,
          addressType: row.address_type,
          addressFormatted: row.address_formatted,
          addressCity: row.address_city,
          addressCountry: row.address_country,
          latitude: row.latitude,
          longitude: row.longitude,
          avatar: resolveContactAvatarUrl(
            client,
            user.id,
            {
              id: row.person_id,
              hasAvatar: row.has_avatar,
              updatedAt: row.updated_at,
            },
            avatarOptions,
          ),
        }),
      );

      return { pins };
    },
  );

  /**
   * GET /api/contacts - List all contacts
   */
  fastify.get(
    "/",
    {
      schema: {
        description: "List contacts with pagination, search, sort, and list stats.",
        querystring: peopleListQuerySchema,
        response: withOkResponse(
          contactsListResponseSchema,
          "Paginated contact list",
        ),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const { client, user } = getAuth(request);
      const query = request.query;
      const avatarOptions = extractAvatarOptions(query);

      const { limit, offset } = parsePagination(query);
      const search = normalizeSearch(query.search);
      const effectiveSort = resolveSort(query.sort, "nameAsc");

      const now = new Date();
      const monthStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
      );
      const nextMonthStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
      );
      const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
      const nextYearStart = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1));

      const [
        { count: totalContactsCount },
        { count: monthInteractionsCount },
        { count: newContactsYearCount },
      ] = await Promise.all([
        client
          .from("people")
          .select("id", { head: true, count: "exact" })
          .eq("user_id", user.id)
          .eq("myself", false),
        client
          .from("interactions")
          .select("id", { head: true, count: "exact" })
          .eq("user_id", user.id)
          .gte("date", monthStart.toISOString())
          .lt("date", nextMonthStart.toISOString()),
        client
          .from("people")
          .select("id", { head: true, count: "exact" })
          .eq("user_id", user.id)
          .eq("myself", false)
          .not("created_at", "is", null)
          .gte("created_at", yearStart.toISOString())
          .lt("created_at", nextYearStart.toISOString()),
      ]);

      // ── Fuzzy search path ────────────────────────────────────────────────
      // When a search query is active, use the search_people_ids RPC which
      // leverages pg_trgm word_similarity for typo-tolerant, accent-insensitive
      // matching. The RPC returns ranked (id, rank) pairs; we then fetch full
      // contact rows via .in() to preserve the CONTACT_SELECT camelCase aliases.
      let contacts: any[] | null = null;
      let count: number | null = null;
      let error: any = null;

      if (search) {
        const keepInTouch = Boolean(query.keepInTouch);
        const [searchResult, countResult] = await Promise.all([
          searchPeopleIds(client, user.id, search, limit, offset, { keepInTouch }),
          countSearchPeopleIds(client, user.id, search, { keepInTouch }),
        ]);

        if (searchResult.error) {
          request.log.error({ err: searchResult.error }, "Error in fuzzy search RPC");
          return reply.status(500).send({ error: searchResult.error });
        }

        if (countResult.error) {
          request.log.error({ err: countResult.error }, "Error in fuzzy search count RPC");
          return reply.status(500).send({ error: countResult.error });
        }

        count = countResult.count ?? 0;

        if (!searchResult.ranked || searchResult.ranked.length === 0) {
          contacts = [];
        } else {
          const rankedIds = searchResult.ranked.map((r) => r.id);

          const { data: fetchedContacts, error: fetchError } = await client
            .from("people")
            .select(CONTACT_SELECT)
            .in("id", rankedIds);

          if (fetchError) {
            request.log.error(
              { err: fetchError },
              "Error fetching fuzzy search results",
            );
            return reply.status(500).send({ error: fetchError.message });
          }

          contacts = restoreRankedOrder(fetchedContacts || [], rankedIds);
        }
      } else {
        // ── Standard list path (no search) ──────────────────────────────────
        let peopleQuery = client
          .from("people")
          .select(CONTACT_SELECT, { count: "exact" })
          .eq("user_id", user.id)
          .eq("myself", false);

        // Keep-in-touch filter: only contacts with a frequency set
        if (query.keepInTouch) {
          peopleQuery = peopleQuery.not("keep_frequency_days", "is", null);
        }

        switch (query.sort) {
          case "nameAsc":
            peopleQuery = peopleQuery.order("first_name", { ascending: true });
            break;
          case "nameDesc":
            peopleQuery = peopleQuery.order("first_name", { ascending: false });
            break;
          case "surnameAsc":
            peopleQuery = peopleQuery.order("last_name", {
              ascending: true,
              nullsFirst: true,
            });
            break;
          case "surnameDesc":
            peopleQuery = peopleQuery.order("last_name", {
              ascending: false,
              nullsFirst: false,
            });
            break;
          case "interactionAsc":
            peopleQuery = peopleQuery.order("last_interaction", {
              ascending: true,
              nullsFirst: true,
            });
            break;
          case "interactionDesc":
            peopleQuery = peopleQuery.order("last_interaction", {
              ascending: false,
              nullsFirst: false,
            });
            break;
          case "createdAtAsc":
            peopleQuery = peopleQuery.order("created_at", {
              ascending: true,
              nullsFirst: true,
            });
            break;
          case "createdAtDesc":
            peopleQuery = peopleQuery.order("created_at", {
              ascending: false,
              nullsFirst: false,
            });
            break;
          default:
            peopleQuery = peopleQuery.order("first_name", { ascending: true });
            break;
        }

        peopleQuery = peopleQuery.range(offset, offset + limit - 1);

        const result = await peopleQuery;
        contacts = result.data;
        count = result.count;
        error = result.error;
      }

      if (error) {
        request.log.error({ err: error }, "Error fetching contacts");
        return reply.status(500).send({ error: error.message });
      }

      let enrichedContacts: Array<{ id: string } & FullContactExtras> = [];
      try {
        enrichedContacts = await attachContactExtras(
          client,
          user.id,
          contacts || [],
          {
            addresses: true,
            avatarOptions,
          },
        );
      } catch (enrichError) {
        fastify.log.error(
          { enrichError },
          "Failed to attach contact extras for contact list",
        );
        enrichedContacts = withEmptySocials(withEmptyChannels(contacts || []));
      }

      const totalCount = typeof count === "number" ? count : enrichedContacts.length;
      const pagination = buildPaginationMeta({
        limit,
        offset,
        totalCount,
        itemCount: enrichedContacts.length,
        sort: effectiveSort,
        search,
      });

      return {
        ...buildPaginatedResponse("contacts", enrichedContacts, pagination),
        stats: {
          totalContacts: totalContactsCount || 0,
          thisMonthInteractions: monthInteractionsCount || 0,
          newContactsThisYear: newContactsYearCount || 0,
        },
      };
    },
  );

  /**
   * POST /api/contacts - Create a new contact
   */
  fastify.post(
    "/",
    {
      schema: {
        description: "Create a new contact.",
        body: createContactBodySchema,
        response: withCreatedResponse(
          createContactResponseSchema,
          "Contact created",
        ),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const { client, user } = getAuth(request);
      const body = request.body;

      try {
        const { data, txid } = await createContact(
          { client, user, log: request.log },
          {
            id: body.id,
            firstName: body.firstName,
            lastName: body.lastName,
            middleName: body.middleName,
            linkedin: body.linkedin,
          },
        );

        return reply.status(201).send({ contact: data.contact, txid });
      } catch (error) {
        if (handleDomainError(error, reply)) return;
        throw error;
      }
    },
  );

  /**
   * DELETE /api/contacts - Delete multiple contacts
   * Accepts either { ids: string[] } or { filter: ContactsFilter, excludeIds?: string[] }.
   */
  fastify.delete(
    "/",
    {
      schema: {
        description:
          "Delete multiple contacts by IDs or by filter with optional exclusions.",
        body: deleteContactsBodySchema,
        response: withOkResponse(
          deleteContactsResponseSchema,
          "Contacts deleted successfully",
        ),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const { client, user } = getAuth(request);
      const body = request.body;

      let uniqueIds: string[];

      try {
        if ("ids" in body && Array.isArray(body.ids)) {
          uniqueIds = await resolveContactPersonIds(
            client,
            user.id,
            { personIds: body.ids },
            {
              rejectEmptyExplicit: true,
              emptyExplicitError:
                "Invalid request body. 'ids' must be a non-empty array.",
              onlyMyselfError:
                "No deletable contacts found. Your own contact card cannot be deleted.",
            },
          );
        } else if ("filter" in body && body.filter) {
          uniqueIds = await resolveContactPersonIds(client, user.id, {
            contactFilter: body.filter,
            excludePersonIds: body.excludeIds,
          });

          if (uniqueIds.length === 0) {
            return { message: "No contacts matched the filter" };
          }
        } else {
          return reply.status(400).send({
            error: "Invalid request body. Provide either 'ids' or 'filter'.",
          });
        }
      } catch (error) {
        if (error instanceof ResolveContactPersonIdsError) {
          return reply.status(error.statusCode).send({ error: error.message });
        }

        throw error;
      }

      try {
        await deleteOrphanedInteractionsForDeletedContacts(
          client,
          user.id,
          uniqueIds,
          { includeParticipantlessInteractions: true },
        );
      } catch (cleanupError) {
        const message =
          cleanupError instanceof Error
            ? cleanupError.message
            : "Failed to clean up interactions for deleted contacts";
        return reply.status(500).send({ error: message });
      }

      const candidateLogoIds = await collectLinkedInLogoIds(
        client,
        user.id,
        uniqueIds,
      );

      const { error } = await client
        .from("people")
        .delete()
        .eq("user_id", user.id)
        .in("id", uniqueIds);

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      // Clean up storage: delete avatar files for the deleted contacts
      const avatarPaths = uniqueIds.map((id) => `${user.id}/${id}.jpg`);
      await client.storage.from("avatars").remove(avatarPaths);

      // Clean up orphaned LinkedIn logo files (best-effort, does not fail the response)
      try {
        await removeOrphanedLinkedInLogos(client, user.id, candidateLogoIds);
      } catch (logoCleanupError) {
        request.log.warn(
          { logoCleanupError },
          "[contacts] Failed to clean up orphaned LinkedIn logos",
        );
      }

      return {
        message: "Contacts deleted successfully",
        deletedCount: uniqueIds.length,
      };
    },
  );

  /**
   * DELETE /api/contacts/:id - Delete a single contact
   */
  fastify.delete(
    "/:id",
    {
      schema: {
        description: "Delete a single contact by ID.",
        params: uuidParamSchema,
        response: withOkResponse(
          deleteContactResponseSchema,
          "Contact deleted successfully",
        ),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const { client, user } = getAuth(request);
      const { id } = request.params;

      try {
        await deleteContact({ client, user, log: request.log }, id);
        return { message: "Contact deleted successfully" };
      } catch (error) {
        if (handleDomainError(error, reply)) return;
        throw error;
      }
    },
  );

  /**
   * GET /api/contacts/by-social - Find contact by social media platform + handle
   */
  fastify.get(
    "/by-social",
    {
      schema: {
        description: "Find a contact by social platform and handle.",
        querystring: bySocialQuerySchema,
        response: withOkResponse(contactResponseSchema, "Matching contact"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const { client, user } = getAuth(request);
      const platform = request.query.platform?.trim() ?? "";
      const handle = request.query.handle?.trim() ?? "";
      const avatarOpts = extractAvatarOptions(request.query);

      if (!platform || !handle || !isLookupPlatform(platform)) {
        return reply.status(400).send({ error: "Invalid platform or handle" });
      }

      const personId = await findPersonIdBySocial(
        client,
        user.id,
        platform,
        handle,
      );

      if (!personId) {
        return { exists: false };
      }

      const { data: person, error } = await client
        .from("people")
        .select("id, first_name, last_name, updated_at, has_avatar")
        .eq("user_id", user.id)
        .eq("id", personId)
        .single();

      if (error || !person) {
        return reply
          .status(500)
          .send({ error: error?.message ?? "Failed to find contact" });
      }

      return {
        exists: true,
        contact: toContactPreview(client, user.id, person, avatarOpts),
      };
    },
  );

  /**
   * GET /api/contacts/:id - Get a single contact
   */
  fastify.get(
    "/:id",
    {
      schema: {
        description: "Get a single contact by ID.",
        params: uuidParamSchema,
        querystring: avatarTransformQuerySchema,
        response: withOkResponse(contactResponseSchema, "Contact details"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const { client, user } = getAuth(request);
      const { id } = request.params;
      const avatarOpts = extractAvatarOptions(request.query);

      const enrichedContact = await loadEnrichedContact(
        client,
        user.id,
        id,
        { avatarOptions: avatarOpts },
        request.log,
      );

      if (!enrichedContact) {
        return reply.status(404).send({ error: "Contact not found" });
      }

      return { contact: enrichedContact };
    },
  );

  /**
   * GET /api/contacts/:id/groups - Get groups a contact belongs to
   */
  fastify.get(
    "/:id/groups",
    {
      schema: {
        description: "List groups a contact belongs to.",
        params: uuidParamSchema,
        response: withOkResponse(
          contactGroupsResponseSchema,
          "Groups for the contact",
        ),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const { client } = getAuth(request);
      const { id: personId } = request.params;

      const { data: memberships, error: membershipsError } = await client
        .from("people_groups")
        .select("group_id")
        .eq("person_id", personId);

      if (membershipsError) {
        return reply.status(500).send({ error: membershipsError.message });
      }

      const groupIds = (memberships || []).map((m) => m.group_id);

      if (groupIds.length === 0) {
        return { groups: [] };
      }

      const { data: groups, error: groupsError } = await client
        .from("groups")
        .select(GROUP_SELECT)
        .in("id", groupIds)
        .order("label", { ascending: true });

      if (groupsError) {
        return reply.status(500).send({ error: groupsError.message });
      }

      const { data: groupMemberships, error: countsError } = await client
        .from("people_groups")
        .select("group_id")
        .in("group_id", groupIds);

      if (countsError) {
        return reply.status(500).send({ error: countsError.message });
      }

      const countMap = new Map<string, number>();
      groupMemberships?.forEach((item) => {
        const current = countMap.get(item.group_id) || 0;
        countMap.set(item.group_id, current + 1);
      });

      const groupsWithCounts = (groups || []).map((group) => ({
        ...group,
        contactCount: countMap.get(group.id) || 0,
      }));

      return { groups: groupsWithCounts };
    },
  );

  registerTagRoutes(fastify);

  /**
   * PATCH /api/contacts/:id - Update a contact
   */
  fastify.patch(
    "/:id",
    {
      schema: {
        description: "Update a contact by ID.",
        params: uuidParamSchema,
        body: patchContactBodySchema,
        response: withOkResponse(
          createContactResponseSchema,
          "Updated contact",
        ),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const { client, user } = getAuth(request);
      const { id } = request.params;
      const body = request.body;

      try {
        const { data, txid } = await updateContact(
          { client, user, log: request.log },
          {
            personId: id,
            patch: body,
          },
        );

        return { contact: data.contact, txid };
      } catch (error) {
        if (handleDomainError(error, reply)) return;
        throw error;
      }
    },
  );

  registerPhotoRoutes(fastify);

  /**
   * GET /api/contacts/:id/vcard - Export contact as vCard file
   */
  fastify.get(
    "/:id/vcard",
    {
      schema: {
        description: "Export a contact as a vCard (.vcf) file.",
        params: uuidParamSchema,
        querystring: avatarTransformQuerySchema,
        response: withOkResponse(
          z.string().meta({ description: "vCard file content" }),
          "vCard export",
        ),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const { client, user } = getAuth(request);
      const avatarOpts = extractAvatarOptions(request.query);
      const { id } = request.params;

      // Fetch contact
      const { data: contact, error } = await client
        .from("people")
        .select(CONTACT_SELECT)
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (error || !contact) {
        return reply.status(404).send({ error: "Contact not found" });
      }

      let contactWithChannels: Contact;
      try {
        const [enrichedContact] = await attachContactExtras(
          client,
          user.id,
          [contact],
          {
            addresses: true,
            avatarOptions: avatarOpts,
          },
        );
        contactWithChannels = enrichedContact as Contact;
      } catch (channelError) {
        fastify.log.error(
          { channelError },
          "Failed to attach contact channels/social media for vCard export",
        );
        contactWithChannels = withEmptySocials(
          withEmptyChannels([contact]),
        )[0] as unknown as Contact;
      }

      let exportImportantDates: Array<{
        type: "birthday" | "anniversary" | "nameday" | "graduation" | "other";
        date: string;
      }> = [];
      let exportCategories: string[] = [];

      try {
        const [{ data: importantDates }, { data: peopleTags }] =
          await Promise.all([
            client
              .from("people_important_dates")
              .select("type, date")
              .eq("person_id", id)
              .eq("user_id", user.id),
            client
              .from("people_tags")
              .select("tag_id")
              .eq("person_id", id)
              .eq("user_id", user.id),
          ]);

        exportImportantDates = (importantDates ?? [])
          .map((entry) => ({
            type: entry.type,
            date: entry.date,
          }))
          .filter(
            (
              entry,
            ): entry is {
              type:
                | "birthday"
                | "anniversary"
                | "nameday"
                | "graduation"
                | "other";
              date: string;
            } =>
              IMPORTANT_DATE_TYPES.includes(entry.type as ImportantDateType) &&
              typeof entry.date === "string" &&
              entry.date.trim().length > 0,
          );

        const tagIds = Array.from(
          new Set(
            (peopleTags ?? []).map((entry) => entry.tag_id).filter(Boolean),
          ),
        );

        if (tagIds.length > 0) {
          const { data: tags } = await client
            .from("tags")
            .select("label")
            .eq("user_id", user.id)
            .in("id", tagIds);

          exportCategories = Array.from(
            new Set(
              (tags ?? [])
                .map((entry) => entry.label)
                .filter((label): label is string => !!label),
            ),
          );
        }
      } catch (extrasError) {
        fastify.log.warn(
          { extrasError },
          "Failed to fetch important dates/tags for vCard export",
        );
      }

      // Generate vCard
      let vcard: string;
      try {
        vcard = await generateVCard(contactWithChannels, {
          importantDates: exportImportantDates,
          categories: exportCategories,
        });
      } catch (vcardError) {
        fastify.log.error({ vcardError }, "Failed to generate vCard");
        return reply.status(500).send({ error: "Failed to generate vCard" });
      }

      // Create filename
      const firstName = contact.firstName || "contact";
      const lastName = contact.lastName || "";
      const filename = lastName
        ? `${firstName}_${lastName}.vcf`
        : `${firstName}.vcf`;

      // Set response headers for file download
      reply.header("Content-Type", "text/vcard; charset=utf-8");
      reply.header("Content-Disposition", `attachment; filename="${filename}"`);

      return vcard;
    },
  );
}
