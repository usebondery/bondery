/**
 * Contacts API Routes
 * Handles CRUD operations for contacts
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { Type } from "@sinclair/typebox";
import { getAuth } from "../../lib/auth.js";
import { buildContactAvatarUrl } from "../../lib/supabase.js";
import { generateVCard } from "./vcard.js";
import {
  parseEmailEntries,
  parsePhoneEntries,
  replaceContactEmails,
  replaceContactPhones,
} from "./channels.js";
import { parseAddressEntries, replaceContactAddresses } from "./addresses.js";
import { findPersonIdBySocial, upsertContactSocials } from "../../lib/socials.js";
import { attachContactExtras, type FullContactExtras } from "../../lib/contact-enrichment.js";
import type {
  Contact,
  ContactAddressEntry,
  EmailEntry,
  ImportantDateType,
  PhoneEntry,
  SocialPlatform,
} from "@bondery/types";
import {
  UuidParam,
  ContactsFilterSchema,
  ContactSortEnum,
  NullableString,
  NullableNumber,
  PhoneEntrySchema,
  EmailEntrySchema,
  ContactAddressEntrySchema,
  CONTACT_SELECT,
  GROUP_SELECT,
  AvatarQualityEnum,
  AvatarSizeEnum,
  extractAvatarOptions,
} from "../../lib/schemas.js";
import { registerMergeRoutes } from "./merge/index.js";
import { registerEnrichmentRoutes } from "./enrichment/index.js";
import { registerRelationshipRoutes } from "./relationships/index.js";
import { registerImportantDateRoutes, IMPORTANT_DATE_TYPES } from "./important-dates/index.js";
import { registerPhotoRoutes } from "./photo/index.js";
import { registerTagRoutes } from "./tags/index.js";

const LOOKUP_SOCIAL_PLATFORMS: SocialPlatform[] = ["instagram", "linkedin", "facebook"];

// ── TypeBox Schemas ──────────────────────────────────────────────

const LookupPlatformEnum = Type.Union([
  Type.Literal("instagram"),
  Type.Literal("linkedin"),
  Type.Literal("facebook"),
]);

const ContactListQuery = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 200, default: 50 })),
  offset: Type.Optional(Type.Integer({ minimum: 0, default: 0 })),
  q: Type.Optional(Type.String()),
  sort: Type.Optional(ContactSortEnum),
  keepInTouch: Type.Optional(Type.Boolean()),
  avatarQuality: Type.Optional(AvatarQualityEnum),
  avatarSize: Type.Optional(AvatarSizeEnum),
});

const CreateContactBody = Type.Object({
  firstName: Type.String({ minLength: 1 }),
  lastName: Type.String({ minLength: 1 }),
  middleName: Type.Optional(Type.String()),
  linkedin: Type.Optional(Type.String()),
});

const UpdateContactBody = Type.Object({
  firstName: Type.Optional(Type.String({ minLength: 1 })),
  middleName: Type.Optional(NullableString),
  lastName: Type.Optional(NullableString),
  headline: Type.Optional(NullableString),
  location: Type.Optional(NullableString),
  notes: Type.Optional(NullableString),
  language: Type.Optional(NullableString),
  timezone: Type.Optional(NullableString),
  gisPoint: Type.Optional(NullableString),
  latitude: Type.Optional(NullableNumber),
  longitude: Type.Optional(NullableNumber),
  lastInteraction: Type.Optional(NullableString),
  keepFrequencyDays: Type.Optional(Type.Union([Type.Integer({ minimum: 1 }), Type.Null()])),
  phones: Type.Optional(Type.Array(PhoneEntrySchema)),
  emails: Type.Optional(Type.Array(EmailEntrySchema)),
  addresses: Type.Optional(Type.Array(ContactAddressEntrySchema)),
  linkedin: Type.Optional(NullableString),
  instagram: Type.Optional(NullableString),
  whatsapp: Type.Optional(NullableString),
  facebook: Type.Optional(NullableString),
  website: Type.Optional(NullableString),
  signal: Type.Optional(NullableString),
});

const DeleteContactsBody = Type.Union([
  Type.Object({
    ids: Type.Array(Type.String(), { minItems: 1 }),
  }),
  Type.Object({
    filter: ContactsFilterSchema,
    excludeIds: Type.Optional(Type.Array(Type.String())),
  }),
]);

const BySocialQuery = Type.Object({
  platform: Type.Optional(Type.String()),
  handle: Type.Optional(Type.String()),
  avatarQuality: Type.Optional(AvatarQualityEnum),
  avatarSize: Type.Optional(AvatarSizeEnum),
});

const MapPinsQuery = Type.Object({
  minLat: Type.Number({ minimum: -90, maximum: 90 }),
  maxLat: Type.Number({ minimum: -90, maximum: 90 }),
  minLon: Type.Number({ minimum: -180, maximum: 180 }),
  maxLon: Type.Number({ minimum: -180, maximum: 180 }),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 1000, default: 500 })),
  avatarQuality: Type.Optional(AvatarQualityEnum),
  avatarSize: Type.Optional(AvatarSizeEnum),
});

const MapAddressPinsQuery = Type.Object({
  minLat: Type.Number({ minimum: -90, maximum: 90 }),
  maxLat: Type.Number({ minimum: -90, maximum: 90 }),
  minLon: Type.Number({ minimum: -180, maximum: 180 }),
  maxLon: Type.Number({ minimum: -180, maximum: 180 }),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 1000, default: 500 })),
  avatarQuality: Type.Optional(AvatarQualityEnum),
  avatarSize: Type.Optional(AvatarSizeEnum),
});

function isLookupPlatform(value: string): value is (typeof LOOKUP_SOCIAL_PLATFORMS)[number] {
  return LOOKUP_SOCIAL_PLATFORMS.includes(value as (typeof LOOKUP_SOCIAL_PLATFORMS)[number]);
}

function toContactPreview(
  person: {
    id: string;
    first_name: string;
    last_name: string | null;
  },
  avatarUrl: string | null,
) {
  return {
    id: person.id,
    firstName: person.first_name,
    lastName: person.last_name,
    avatar: avatarUrl,
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
 * Deletes interactions that would be left without participants after removing the given contacts.
 *
 * It only affects interactions owned by the current user and only interactions that currently include
 * at least one of the contacts being deleted.
 */
async function deleteOrphanedInteractionsForDeletedContacts(
  client: any,
  userId: string,
  contactIds: string[],
) {
  if (!Array.isArray(contactIds) || contactIds.length === 0) {
    return;
  }

  const uniqueContactIds = Array.from(new Set(contactIds.filter(Boolean)));
  if (uniqueContactIds.length === 0) {
    return;
  }

  const { data: impactedMemberships, error: impactedMembershipsError } = await client
    .from("interaction_participants")
    .select("interaction_id, person_id")
    .in("person_id", uniqueContactIds);

  if (impactedMembershipsError) {
    throw new Error(impactedMembershipsError.message);
  }

  const impactedInteractionIds = Array.from(
    new Set(
      (impactedMemberships || []).map(
        (membership: { interaction_id: string }) => membership.interaction_id,
      ),
    ),
  );

  if (impactedInteractionIds.length === 0) {
    return;
  }

  const { data: ownedInteractions, error: ownedInteractionsError } = await client
    .from("interactions")
    .select("id")
    .eq("user_id", userId)
    .in("id", impactedInteractionIds);

  if (ownedInteractionsError) {
    throw new Error(ownedInteractionsError.message);
  }

  const ownedInteractionIds = (ownedInteractions || []).map(
    (interaction: { id: string }) => interaction.id,
  );

  if (ownedInteractionIds.length === 0) {
    return;
  }

  const { data: allMemberships, error: allMembershipsError } = await client
    .from("interaction_participants")
    .select("interaction_id, person_id")
    .in("interaction_id", ownedInteractionIds);

  if (allMembershipsError) {
    throw new Error(allMembershipsError.message);
  }

  const deleteIdSet = new Set<string>();

  for (const interactionId of ownedInteractionIds) {
    const participants = (allMemberships || []).filter(
      (membership: { interaction_id: string; person_id: string }) =>
        membership.interaction_id === interactionId,
    );

    if (participants.length === 0) {
      continue;
    }

    const allParticipantsDeleted = participants.every((membership: { person_id: string }) =>
      uniqueContactIds.includes(membership.person_id),
    );

    if (allParticipantsDeleted) {
      deleteIdSet.add(interactionId);
    }
  }

  const interactionIdsToDelete = Array.from(deleteIdSet);

  if (interactionIdsToDelete.length === 0) {
    return;
  }

  const { error: deleteInteractionsError } = await client
    .from("interactions")
    .delete()
    .in("id", interactionIdsToDelete);

  if (deleteInteractionsError) {
    throw new Error(deleteInteractionsError.message);
  }
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
  for (const row of workResult.data ?? []) stillReferenced.add(row.company_linkedin_id);
  for (const row of eduResult.data ?? []) stillReferenced.add(row.school_linkedin_id);

  const orphaned = candidateIds.filter((id) => !stillReferenced.has(id));
  if (orphaned.length === 0) return;

  const paths = orphaned.map((id) => `${userId}/${id}.jpg`);
  await client.storage.from("linkedin_logos").remove(paths);
}

export async function contactRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRoute", (routeOptions) => {
    routeOptions.schema = { ...routeOptions.schema, tags: ["Contacts"] };
  });
  fastify.addHook("onRequest", fastify.auth([fastify.verifySession]));

  registerMergeRoutes(fastify);
  registerEnrichmentRoutes(fastify);
  registerRelationshipRoutes(fastify);
  registerImportantDateRoutes(fastify);

  /**
   * GET /api/contacts/map-pins - Fetch lightweight pin data for contacts within a bounding box
   */
  fastify.get(
    "/map-pins",
    { schema: { querystring: MapPinsQuery } },
    async (
      request: FastifyRequest<{ Querystring: typeof MapPinsQuery.static }>,
      reply: FastifyReply,
    ) => {
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
        }) => ({
          id: row.id,
          firstName: row.first_name,
          lastName: row.last_name,
          headline: row.headline,
          location: row.location,
          lastInteraction: row.last_interaction,
          latitude: row.latitude,
          longitude: row.longitude,
          avatar: buildContactAvatarUrl(client, user.id, row.id, avatarOptions),
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
    { schema: { querystring: MapAddressPinsQuery } },
    async (
      request: FastifyRequest<{ Querystring: typeof MapAddressPinsQuery.static }>,
      reply: FastifyReply,
    ) => {
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
          avatar: buildContactAvatarUrl(client, user.id, row.person_id, avatarOptions),
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
    { schema: { querystring: ContactListQuery } },
    async (
      request: FastifyRequest<{
        Querystring: typeof ContactListQuery.static;
      }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const query = request.query || {};
      const avatarOptions = extractAvatarOptions(query);

      const limit = Math.min(query.limit ?? 50, 200);
      const offset = query.offset ?? 0;
      const search = typeof query.q === "string" ? query.q.trim() : "";

      const now = new Date();
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
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

      let peopleQuery = client
        .from("people")
        .select(CONTACT_SELECT, { count: "exact" })
        .eq("user_id", user.id)
        .eq("myself", false);

      // Keep-in-touch filter: only contacts with a frequency set
      if (query.keepInTouch) {
        peopleQuery = peopleQuery.not("keep_frequency_days", "is", null);
      }

      if (search) {
        const searchTokens = search.split(/\s+/).filter(Boolean);
        for (const token of searchTokens) {
          peopleQuery = peopleQuery.or(`first_name.ilike.%${token}%,last_name.ilike.%${token}%`);
        }
      }

      switch (query.sort) {
        case "nameAsc":
          peopleQuery = peopleQuery.order("first_name", { ascending: true });
          break;
        case "nameDesc":
          peopleQuery = peopleQuery.order("first_name", { ascending: false });
          break;
        case "surnameAsc":
          peopleQuery = peopleQuery.order("last_name", { ascending: true, nullsFirst: true });
          break;
        case "surnameDesc":
          peopleQuery = peopleQuery.order("last_name", { ascending: false, nullsFirst: false });
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

      const { data: contacts, error, count } = await peopleQuery;

      if (error) {
        request.log.error({ err: error }, "Error fetching contacts");
        return reply.status(500).send({ error: error.message });
      }

      let enrichedContacts: Array<{ id: string } & FullContactExtras> = [];
      try {
        enrichedContacts = await attachContactExtras(client, user.id, contacts || [], {
          addresses: true,
          avatarOptions,
        });
      } catch (enrichError) {
        fastify.log.error({ enrichError }, "Failed to attach contact extras for contact list");
        enrichedContacts = withEmptySocials(withEmptyChannels(contacts || []));
      }

      return {
        contacts: enrichedContacts,
        totalCount: typeof count === "number" ? count : enrichedContacts.length,
        limit,
        offset,
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
    { schema: { body: CreateContactBody } },
    async (
      request: FastifyRequest<{ Body: typeof CreateContactBody.static }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const body = request.body;

      // Prepare insert data
      const insertData: any = {
        user_id: user.id,
        first_name: body.firstName.trim(),
        last_name: body.lastName.trim(),
        last_interaction: new Date().toISOString(),
        myself: false,
      };

      if (body.middleName && body.middleName.trim().length > 0) {
        insertData.middle_name = body.middleName.trim();
      }

      // Insert contact
      const { data: newContact, error } = await client
        .from("people")
        .insert(insertData)
        .select("id")
        .single();

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      if (body.linkedin && body.linkedin.trim().length > 0) {
        try {
          await upsertContactSocials(client, user.id, newContact.id, "linkedin", body.linkedin);
        } catch (socialError) {
          const message =
            socialError instanceof Error ? socialError.message : "Social upsert failed";
          return reply.status(500).send({ error: message });
        }
      }

      return reply.status(201).send({ id: newContact.id });
    },
  );

  /**
   * DELETE /api/contacts - Delete multiple contacts
   * Accepts either { ids: string[] } or { filter: ContactsFilter, excludeIds?: string[] }.
   */
  fastify.delete(
    "/",
    { schema: { body: DeleteContactsBody } },
    async (
      request: FastifyRequest<{ Body: typeof DeleteContactsBody.static }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const body = request.body;

      let uniqueIds: string[];

      // Resolve the list of IDs to delete — either provided directly or via filter.
      if ("ids" in body && Array.isArray(body.ids)) {
        uniqueIds = Array.from(new Set(body.ids.filter(Boolean)));
        if (uniqueIds.length === 0) {
          return reply.status(400).send({
            error: "Invalid request body. 'ids' must be a non-empty array.",
          });
        }

        // Filter out myself contacts — they cannot be deleted
        const { data: myselfRows } = await client
          .from("people")
          .select("id")
          .eq("user_id", user.id)
          .eq("myself", true)
          .in("id", uniqueIds);
        const myselfIds = new Set((myselfRows ?? []).map((r: { id: string }) => r.id));
        uniqueIds = uniqueIds.filter((id) => !myselfIds.has(id));

        if (uniqueIds.length === 0) {
          return reply.status(400).send({
            error: "No deletable contacts found. Your own contact card cannot be deleted.",
          });
        }
      } else if ("filter" in body && body.filter) {
        // Build the same Supabase query used by GET /contacts, but only select IDs.
        let filterQuery = client
          .from("people")
          .select("id")
          .eq("user_id", user.id)
          .eq("myself", false);

        const search = typeof body.filter.q === "string" ? body.filter.q.trim() : "";
        if (search) {
          const searchTokens = search.split(/\s+/).filter(Boolean);
          for (const token of searchTokens) {
            filterQuery = filterQuery.or(`first_name.ilike.%${token}%,last_name.ilike.%${token}%`);
          }
        }

        const { data: rows, error: filterError } = await filterQuery;

        if (filterError) {
          return reply.status(500).send({ error: filterError.message });
        }

        const excludeSet = new Set(body.excludeIds ?? []);
        uniqueIds = (rows || [])
          .map((r: { id: string }) => r.id)
          .filter((id: string) => !excludeSet.has(id));

        if (uniqueIds.length === 0) {
          return { message: "No contacts matched the filter" };
        }
      } else {
        return reply.status(400).send({
          error: "Invalid request body. Provide either 'ids' or 'filter'.",
        });
      }

      try {
        await deleteOrphanedInteractionsForDeletedContacts(client, user.id, uniqueIds);
      } catch (cleanupError) {
        const message =
          cleanupError instanceof Error
            ? cleanupError.message
            : "Failed to clean up interactions for deleted contacts";
        return reply.status(500).send({ error: message });
      }

      const candidateLogoIds = await collectLinkedInLogoIds(client, user.id, uniqueIds);

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

      return { message: "Contacts deleted successfully", deletedCount: uniqueIds.length };
    },
  );

  /**
   * DELETE /api/contacts/:id - Delete a single contact
   */
  fastify.delete(
    "/:id",
    { schema: { params: UuidParam } },
    async (request: FastifyRequest<{ Params: typeof UuidParam.static }>, reply: FastifyReply) => {
      const { client, user } = getAuth(request);
      const { id } = request.params;

      // Check if this is the myself contact before doing anything destructive
      const { data: contactCheck } = await client
        .from("people")
        .select("id, myself")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (!contactCheck) {
        return reply.status(404).send({ error: "Contact not found" });
      }

      if (contactCheck.myself) {
        return reply.status(403).send({ error: "Cannot delete your own contact card" });
      }

      try {
        await deleteOrphanedInteractionsForDeletedContacts(client, user.id, [id]);
      } catch (cleanupError) {
        const message =
          cleanupError instanceof Error
            ? cleanupError.message
            : "Failed to clean up interactions for deleted contact";
        return reply.status(500).send({ error: message });
      }

      const candidateLogoIds = await collectLinkedInLogoIds(client, user.id, [id]);

      const { data: deletedContact, error } = await client
        .from("people")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id)
        .select("id")
        .single();

      if (error || !deletedContact) {
        return reply.status(404).send({ error: "Contact not found" });
      }

      // Clean up storage: delete avatar file for the deleted contact
      await client.storage.from("avatars").remove([`${user.id}/${id}.jpg`]);

      // Clean up orphaned LinkedIn logo files (best-effort, does not fail the response)
      try {
        await removeOrphanedLinkedInLogos(client, user.id, candidateLogoIds);
      } catch (logoCleanupError) {
        request.log.warn(
          { logoCleanupError },
          "[contacts] Failed to clean up orphaned LinkedIn logos",
        );
      }

      return { message: "Contact deleted successfully" };
    },
  );

  /**
   * GET /api/contacts/by-social - Find contact by social media platform + handle
   */
  fastify.get(
    "/by-social",
    { schema: { querystring: BySocialQuery } },
    async (
      request: FastifyRequest<{
        Querystring: typeof BySocialQuery.static;
      }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const platform = request.query.platform?.trim() ?? "";
      const handle = request.query.handle?.trim() ?? "";
      const avatarOpts = extractAvatarOptions(request.query);

      if (!platform || !handle || !isLookupPlatform(platform)) {
        return reply.status(400).send({ error: "Invalid platform or handle" });
      }

      const personId = await findPersonIdBySocial(client, user.id, platform, handle);

      if (!personId) {
        return { exists: false };
      }

      const { data: person, error } = await client
        .from("people")
        .select("id, first_name, last_name, updated_at")
        .eq("user_id", user.id)
        .eq("id", personId)
        .single();

      if (error || !person) {
        return reply.status(500).send({ error: error?.message ?? "Failed to find contact" });
      }

      return {
        exists: true,
        contact: toContactPreview(
          person,
          buildContactAvatarUrl(client, user.id, person.id, avatarOpts, person.updated_at),
        ),
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
        params: UuidParam,
        querystring: Type.Object({
          avatarQuality: Type.Optional(AvatarQualityEnum),
          avatarSize: Type.Optional(AvatarSizeEnum),
        }),
      },
    },
    async (
      request: FastifyRequest<{
        Params: typeof UuidParam.static;
        Querystring: { avatarQuality?: string; avatarSize?: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const { id } = request.params;
      const avatarOpts = extractAvatarOptions(request.query as any);

      const { data: contact, error } = await client
        .from("people")
        .select(CONTACT_SELECT)
        .eq("id", id)
        .single();

      if (error) {
        return reply.status(404).send({ error: error.message });
      }

      try {
        const [enrichedContact] = await attachContactExtras(client, user.id, [contact], {
          addresses: true,
          avatarOptions: avatarOpts,
        });
        return { contact: enrichedContact };
      } catch (channelError) {
        fastify.log.error(
          { channelError },
          "Failed to attach contact channels/social media for single contact",
        );
        return { contact: withEmptySocials(withEmptyChannels([contact]))[0] };
      }
    },
  );

  /**
   * GET /api/contacts/:id/groups - Get groups a contact belongs to
   */
  fastify.get(
    "/:id/groups",
    { schema: { params: UuidParam } },
    async (request: FastifyRequest<{ Params: typeof UuidParam.static }>, reply: FastifyReply) => {
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

      return { groups };
    },
  );

  registerTagRoutes(fastify);

  /**
   * PATCH /api/contacts/:id - Update a contact
   */
  fastify.patch(
    "/:id",
    { schema: { params: UuidParam, body: UpdateContactBody } },
    async (
      request: FastifyRequest<{
        Params: typeof UuidParam.static;
        Body: typeof UpdateContactBody.static;
      }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const { id } = request.params;
      const body = request.body;

      // Map camelCase to snake_case
      const updates: Record<string, unknown> = {};

      if (body.firstName !== undefined) {
        updates.first_name = body.firstName;
      }
      if (body.middleName !== undefined) updates.middle_name = body.middleName;
      if (body.lastName !== undefined) updates.last_name = body.lastName;
      if (body.headline !== undefined) updates.headline = body.headline;
      if (body.location !== undefined) updates.location = body.location;
      if (body.notes !== undefined) updates.notes = body.notes;
      if (body.language !== undefined) updates.language = body.language;
      if (body.timezone !== undefined) updates.timezone = body.timezone;
      if (body.gisPoint !== undefined) updates.gis_point = body.gisPoint;
      if (body.lastInteraction !== undefined) {
        updates.last_interaction = body.lastInteraction;
        // Manual update clears the activity link — NULL signals "set manually"
        updates.last_interaction_activity_id = null;
      }
      if (body.keepFrequencyDays !== undefined)
        updates.keep_frequency_days = body.keepFrequencyDays;

      const hasLatitudeField = Object.prototype.hasOwnProperty.call(body, "latitude");
      const hasLongitudeField = Object.prototype.hasOwnProperty.call(body, "longitude");

      let nextLatitude: number | null | undefined;
      let nextLongitude: number | null | undefined;

      if (hasLatitudeField || hasLongitudeField) {
        nextLatitude = (body.latitude as number | null | undefined) ?? null;
        nextLongitude = (body.longitude as number | null | undefined) ?? null;

        if ((nextLatitude === null) !== (nextLongitude === null)) {
          return reply
            .status(400)
            .send({ error: "Both latitude and longitude must be provided together" });
        }

        if (
          nextLatitude !== null &&
          nextLongitude !== null &&
          (!Number.isFinite(nextLatitude) || !Number.isFinite(nextLongitude))
        ) {
          return reply.status(400).send({ error: "Invalid latitude/longitude values" });
        }
      }

      let nextPhones: PhoneEntry[] | undefined;
      if (body.phones !== undefined) {
        try {
          nextPhones = parsePhoneEntries(body.phones);
        } catch (parseError) {
          const message =
            parseError instanceof Error ? parseError.message : "Invalid phones payload";
          return reply.status(400).send({ error: message });
        }
      }

      let nextEmails: EmailEntry[] | undefined;
      if (body.emails !== undefined) {
        try {
          nextEmails = parseEmailEntries(body.emails);
        } catch (parseError) {
          const message =
            parseError instanceof Error ? parseError.message : "Invalid emails payload";
          return reply.status(400).send({ error: message });
        }
      }

      let nextAddresses: ContactAddressEntry[] | undefined;
      if (body.addresses !== undefined) {
        try {
          nextAddresses = parseAddressEntries(body.addresses);
          request.log.info(
            {
              route: "PATCH /contacts/:id",
              personId: id,
              addressCount: nextAddresses.length,
              addresses: nextAddresses.map((entry) => ({
                type: entry.type,
                value: entry.value,
                latitude: entry.latitude,
                longitude: entry.longitude,
                addressFormatted: entry.addressFormatted,
                addressGeocodeSource: entry.addressGeocodeSource,
              })),
            },
            "Parsed addresses payload",
          );
        } catch (parseError) {
          const message =
            parseError instanceof Error ? parseError.message : "Invalid addresses payload";
          return reply.status(400).send({ error: message });
        }

        // NOTE: people.location is NOT auto-synced from the preferred address here.
        // The client sends a separate PATCH with { location, latitude, longitude }
        // only when the user explicitly confirms the location update prompt.
        // Auto-syncing here would overwrite a manually set location when the user declines.
      }

      const socialsUpdates: Array<{
        platform: Parameters<typeof upsertContactSocials>[3];
        handle: string | null | undefined;
      }> = [];

      if (body.linkedin !== undefined) {
        socialsUpdates.push({ platform: "linkedin", handle: body.linkedin });
      }
      if (body.instagram !== undefined) {
        socialsUpdates.push({ platform: "instagram", handle: body.instagram });
      }
      if (body.whatsapp !== undefined) {
        socialsUpdates.push({ platform: "whatsapp", handle: body.whatsapp });
      }
      if (body.facebook !== undefined) {
        socialsUpdates.push({ platform: "facebook", handle: body.facebook });
      }
      if (body.website !== undefined) {
        socialsUpdates.push({ platform: "website", handle: body.website });
      }
      if (body.signal !== undefined) {
        socialsUpdates.push({ platform: "signal", handle: body.signal });
      }

      updates.updated_at = new Date().toISOString();

      const { data: updatedContact, error } = await client
        .from("people")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id)
        .select("id, myself")
        .single();

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      if (!updatedContact) {
        return reply.status(404).send({ error: "Contact not found" });
      }

      try {
        if (hasLatitudeField || hasLongitudeField) {
          const { error: locationError } = await client.rpc("set_person_location", {
            p_person_id: id,
            p_user_id: user.id,
            // The SQL function handles null to clear coordinates; cast needed because
            // generated types reflect the non-nullable Postgres signature.
            p_latitude: (nextLatitude ?? null) as number,
            p_longitude: (nextLongitude ?? null) as number,
          });

          if (locationError) {
            return reply.status(500).send({ error: locationError.message });
          }
        }

        if (nextPhones !== undefined) {
          request.log.info(
            {
              route: "PATCH /contacts/:id",
              personId: id,
              addresses: nextAddresses?.map((entry) => ({
                type: entry.type,
                value: entry.value,
                latitude: entry.latitude,
                longitude: entry.longitude,
              })),
            },
            "Upserting contact channels",
          );
        }

        // Run all replace operations in parallel — they operate on independent tables
        const parallelOps: Promise<void>[] = [];

        if (nextPhones !== undefined) {
          parallelOps.push(replaceContactPhones(client, user.id, id, nextPhones));
        }
        if (nextEmails !== undefined) {
          parallelOps.push(replaceContactEmails(client, user.id, id, nextEmails));
        }
        if (nextAddresses !== undefined) {
          parallelOps.push(replaceContactAddresses(client, user.id, id, nextAddresses));
        }
        if (socialsUpdates.length > 0) {
          parallelOps.push(
            Promise.all(
              socialsUpdates.map((entry) =>
                upsertContactSocials(client, user.id, id, entry.platform, entry.handle),
              ),
            ).then(() => undefined),
          );
        }

        if (parallelOps.length > 0) {
          await Promise.all(parallelOps);
        }
      } catch (channelError) {
        const message =
          channelError instanceof Error ? channelError.message : "Unknown channel error";
        return reply.status(500).send({ error: message });
      }

      return { message: "Contact updated successfully" };
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
        params: UuidParam,
        querystring: Type.Object({
          avatarQuality: Type.Optional(AvatarQualityEnum),
          avatarSize: Type.Optional(AvatarSizeEnum),
        }),
      },
    },
    async (request: FastifyRequest<{ Params: typeof UuidParam.static }>, reply: FastifyReply) => {
      const { client, user } = getAuth(request);
      const avatarOpts = extractAvatarOptions(request.query as any);
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
        const [enrichedContact] = await attachContactExtras(client, user.id, [contact], {
          addresses: true,
          avatarOptions: avatarOpts,
        });
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
        const [{ data: importantDates }, { data: peopleTags }] = await Promise.all([
          client
            .from("people_important_dates")
            .select("type, date")
            .eq("person_id", id)
            .eq("user_id", user.id),
          client.from("people_tags").select("tag_id").eq("person_id", id).eq("user_id", user.id),
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
              type: "birthday" | "anniversary" | "nameday" | "graduation" | "other";
              date: string;
            } =>
              IMPORTANT_DATE_TYPES.includes(entry.type as ImportantDateType) &&
              typeof entry.date === "string" &&
              entry.date.trim().length > 0,
          );

        const tagIds = Array.from(
          new Set((peopleTags ?? []).map((entry) => entry.tag_id).filter(Boolean)),
        );

        if (tagIds.length > 0) {
          const { data: tags } = await client
            .from("tags")
            .select("label")
            .eq("user_id", user.id)
            .in("id", tagIds);

          exportCategories = Array.from(
            new Set(
              (tags ?? []).map((entry) => entry.label).filter((label): label is string => !!label),
            ),
          );
        }
      } catch (extrasError) {
        fastify.log.warn({ extrasError }, "Failed to fetch important dates/tags for vCard export");
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
      const filename = lastName ? `${firstName}_${lastName}.vcf` : `${firstName}.vcf`;

      // Set response headers for file download
      reply.header("Content-Type", "text/vcard; charset=utf-8");
      reply.header("Content-Disposition", `attachment; filename="${filename}"`);

      return vcard;
    },
  );
}
