/**
 * Contacts API Routes
 * Handles CRUD operations for contacts
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireAuth } from "../lib/supabase.js";
import { generateVCard } from "../lib/vcard.js";
import {
  attachContactChannels,
  parseEmailEntries,
  parsePhoneEntries,
  replaceContactEmails,
  replaceContactPhones,
} from "../lib/contact-channels.js";
import { attachContactSocialMedia, upsertContactSocialMedia } from "../lib/social-media.js";
import { GROUP_SELECT } from "./groups.js";
import type {
  Contact,
  CreateContactInput,
  UpdateContactInput,
  DeleteContactsRequest,
  EmailEntry,
  CreateContactRelationshipInput,
  PhoneEntry,
  UpdateContactRelationshipInput,
  RelationshipType,
  ImportantEventType,
  UpcomingReminder,
  Database,
} from "@bondery/types";

// Contact fields selection query for Supabase
export const CONTACT_SELECT = `
  id,
  userId:user_id,
  firstName:first_name,
  middleName:middle_name,
  lastName:last_name,
  title,
  place,
  description,
  notes,
  avatar,
  lastInteraction:last_interaction,
  createdAt:created_at,
  connections,
  myself,
  position,
  gender,
  language,
  timezone,
  nickname,
  pgpPublicKey:pgp_public_key,
  location,
  latitude,
  longitude
`;

const RELATIONSHIP_SELECT = `
  id,
  user_id,
  source_person_id,
  target_person_id,
  relationship_type,
  created_at,
  updated_at
`;

const RELATIONSHIP_TYPES: RelationshipType[] = [
  "parent",
  "child",
  "spouse",
  "partner",
  "sibling",
  "friend",
  "colleague",
  "neighbor",
  "guardian",
  "dependent",
  "other",
];

const IMPORTANT_EVENT_SELECT = `
  id,
  user_id,
  person_id,
  event_type,
  event_date,
  note,
  notify_on,
  notify_days_before,
  created_at,
  updated_at
`;

const IMPORTANT_EVENT_TYPES: ImportantEventType[] = [
  "birthday",
  "anniversary",
  "nameday",
  "graduation",
  "other",
];

const IMPORTANT_EVENT_NOTIFY_VALUES = [1, 3, 7] as const;

function isRelationshipType(value: string): value is RelationshipType {
  return RELATIONSHIP_TYPES.includes(value as RelationshipType);
}

function isImportantEventType(value: string): value is ImportantEventType {
  return IMPORTANT_EVENT_TYPES.includes(value as ImportantEventType);
}

function isValidImportantEventNotifyDaysBefore(value: unknown): value is 1 | 3 | 7 | null {
  return value === null || IMPORTANT_EVENT_NOTIFY_VALUES.includes(value as 1 | 3 | 7);
}

function toContactPreview(person: {
  id: string;
  first_name: string;
  last_name: string | null;
  avatar: string | null;
}) {
  return {
    id: person.id,
    firstName: person.first_name,
    lastName: person.last_name,
    avatar: person.avatar,
  };
}

function toImportantEvent(event: {
  id: string;
  user_id: string;
  person_id: string;
  event_type: string;
  event_date: string;
  note: string | null;
  notify_on: string | null;
  notify_days_before: number | null;
  created_at: string;
  updated_at: string;
}) {
  return {
    id: event.id,
    userId: event.user_id,
    personId: event.person_id,
    eventType: event.event_type,
    eventDate: event.event_date,
    note: event.note,
    notifyOn: event.notify_on,
    notifyDaysBefore: event.notify_days_before,
    createdAt: event.created_at,
    updatedAt: event.updated_at,
  };
}

function withEmptyChannels<T extends { id: string }>(
  rows: T[],
): Array<T & { phones: []; emails: [] }> {
  return rows.map((row) => ({
    ...row,
    phones: [],
    emails: [],
  }));
}

function withEmptySocialMedia<
  T extends {
    id: string;
  },
>(
  rows: T[],
): Array<
  T & {
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
    linkedin: null,
    instagram: null,
    whatsapp: null,
    facebook: null,
    website: null,
    signal: null,
  }));
}

export async function contactRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/contacts - List all contacts
   */
  fastify.get(
    "/",
    async (
      request: FastifyRequest<{
        Querystring: {
          limit?: string;
          offset?: string;
          q?: string;
          sort?:
            | "nameAsc"
            | "nameDesc"
            | "surnameAsc"
            | "surnameDesc"
            | "interactionAsc"
            | "interactionDesc";
        };
      }>,
      reply: FastifyReply,
    ) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client, user } = auth;
      const query = request.query || {};

      const parsedLimit = Number.parseInt(query.limit || "", 10);
      const parsedOffset = Number.parseInt(query.offset || "", 10);
      const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : null;
      const offset = Number.isFinite(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;
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
          .from("people")
          .select("id", { head: true, count: "exact" })
          .eq("user_id", user.id)
          .eq("myself", false)
          .not("last_interaction", "is", null)
          .gte("last_interaction", monthStart.toISOString())
          .lt("last_interaction", nextMonthStart.toISOString()),
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

      if (search) {
        peopleQuery = peopleQuery.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
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
        default:
          peopleQuery = peopleQuery.order("first_name", { ascending: true });
          break;
      }

      if (limit !== null) {
        peopleQuery = peopleQuery.range(offset, offset + limit - 1);
      }

      const { data: contacts, error, count } = await peopleQuery;

      if (error) {
        console.log("Error fetching contacts:", error);
        return reply.status(500).send({ error: error.message });
      }

      let contactsWithChannels = [] as Awaited<ReturnType<typeof attachContactChannels>>;
      try {
        contactsWithChannels = await attachContactChannels(client, user.id, contacts || []);
      } catch (channelError) {
        fastify.log.error({ channelError }, "Failed to attach contact channels for contact list");
        contactsWithChannels = withEmptyChannels(contacts || []);
      }

      let contactsWithSocialMedia = [] as Awaited<
        ReturnType<typeof attachContactSocialMedia<(typeof contactsWithChannels)[number]>>
      >;
      try {
        contactsWithSocialMedia = await attachContactSocialMedia(
          client,
          user.id,
          contactsWithChannels,
        );
      } catch (socialError) {
        fastify.log.error({ socialError }, "Failed to attach social media for contact list");
        contactsWithSocialMedia = withEmptySocialMedia(contactsWithChannels);
      }

      return {
        contacts: contactsWithSocialMedia,
        totalCount: typeof count === "number" ? count : contactsWithSocialMedia.length,
        stats: {
          totalContacts: totalContactsCount || 0,
          thisMonthInteractions: monthInteractionsCount || 0,
          newContactsThisYear: newContactsYearCount || 0,
        },
      };
    },
  );

  /**
   * GET /api/contacts/important-events/upcoming - List upcoming reminders with notification configured
   */
  fastify.get(
    "/important-events/upcoming",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client, user } = auth;

      const today = new Date();
      const startDate = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
      );
      const endDate = new Date(startDate);
      endDate.setUTCDate(endDate.getUTCDate() + 14);

      const startDateIso = startDate.toISOString().slice(0, 10);
      const endDateIso = endDate.toISOString().slice(0, 10);

      const { data: rows, error } = await client
        .from("people_important_events")
        .select(
          `${IMPORTANT_EVENT_SELECT}, person:people!inner(id, first_name, last_name, avatar)`,
        )
        .eq("user_id", user.id)
        .not("notify_days_before", "is", null)
        .gte("event_date", startDateIso)
        .lte("event_date", endDateIso)
        .order("event_date", { ascending: true });

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      const reminders: UpcomingReminder[] = (rows || [])
        .map((row) => {
          const person = row.person;
          if (!person) {
            return null;
          }

          return {
            event: toImportantEvent(row),
            person: toContactPreview(person),
          };
        })
        .filter((value): value is UpcomingReminder => Boolean(value));

      return { reminders };
    },
  );

  /**
   * POST /api/contacts - Create a new contact
   */
  fastify.post(
    "/",
    async (request: FastifyRequest<{ Body: CreateContactInput }>, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client, user } = auth;
      const body = request.body;

      // Validation
      if (!body.firstName || body.firstName.trim().length === 0) {
        return reply.status(400).send({ error: "First name is required" });
      }

      if (!body.lastName || body.lastName.trim().length === 0) {
        return reply.status(400).send({ error: "Last name is required" });
      }

      // Prepare insert data
      const insertData: any = {
        user_id: user.id,
        first_name: body.firstName.trim(),
        last_name: body.lastName.trim(),
        description: "",
        last_interaction: new Date().toISOString(),
        myself: false,
      };

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
          await upsertContactSocialMedia(client, user.id, newContact.id, "linkedin", body.linkedin);
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
   */
  fastify.delete(
    "/",
    async (request: FastifyRequest<{ Body: DeleteContactsRequest }>, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client } = auth;
      const { ids } = request.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return reply.status(400).send({
          error: "Invalid request body. 'ids' must be a non-empty array.",
        });
      }

      const { error } = await client.from("people").delete().in("id", ids);

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return { message: "Contacts deleted successfully" };
    },
  );

  /**
   * GET /api/contacts/:id - Get a single contact
   */
  fastify.get(
    "/:id",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client, user } = auth;
      const { id } = request.params;

      const { data: contact, error } = await client
        .from("people")
        .select(CONTACT_SELECT)
        .eq("id", id)
        .single();

      if (error) {
        return reply.status(404).send({ error: error.message });
      }

      try {
        const [contactWithChannels] = await attachContactChannels(client, user.id, [contact]);
        const [contactWithSocialMedia] = await attachContactSocialMedia(client, user.id, [
          contactWithChannels,
        ]);
        return { contact: contactWithSocialMedia };
      } catch (channelError) {
        fastify.log.error(
          { channelError },
          "Failed to attach contact channels/social media for single contact",
        );
        return { contact: withEmptySocialMedia(withEmptyChannels([contact]))[0] };
      }
    },
  );

  /**
   * GET /api/contacts/:id/groups - Get groups a contact belongs to
   */
  fastify.get(
    "/:id/groups",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client } = auth;
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

  /**
   * GET /api/contacts/:id/relationships - Get all relationships for a person
   */
  fastify.get(
    "/:id/relationships",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client, user } = auth;
      const { id: personId } = request.params;

      const { data: person, error: personError } = await client
        .from("people")
        .select("id")
        .eq("id", personId)
        .eq("user_id", user.id)
        .single();

      if (personError || !person) {
        return reply.status(404).send({ error: "Contact not found" });
      }

      const { data: rows, error: rowsError } = await client
        .from("people_relationships")
        .select(RELATIONSHIP_SELECT)
        .or(`source_person_id.eq.${personId},target_person_id.eq.${personId}`)
        .order("created_at", { ascending: true });

      if (rowsError) {
        return reply.status(500).send({ error: rowsError.message });
      }

      const relationships = rows || [];
      if (relationships.length === 0) {
        return { relationships: [] };
      }

      const personIds = Array.from(
        new Set(
          relationships.flatMap((relationship) => [
            relationship.source_person_id,
            relationship.target_person_id,
          ]),
        ),
      );

      const { data: peopleRows, error: peopleError } = await client
        .from("people")
        .select("id, first_name, last_name, avatar")
        .in("id", personIds)
        .eq("user_id", user.id);

      if (peopleError) {
        return reply.status(500).send({ error: peopleError.message });
      }

      const peopleById = new Map((peopleRows || []).map((personRow) => [personRow.id, personRow]));

      const formattedRelationships = relationships
        .map((relationship) => {
          const sourcePerson = peopleById.get(relationship.source_person_id);
          const targetPerson = peopleById.get(relationship.target_person_id);

          if (!sourcePerson || !targetPerson) {
            return null;
          }

          return {
            id: relationship.id,
            userId: relationship.user_id,
            sourcePersonId: relationship.source_person_id,
            targetPersonId: relationship.target_person_id,
            relationshipType: relationship.relationship_type,
            createdAt: relationship.created_at,
            updatedAt: relationship.updated_at,
            sourcePerson: toContactPreview(sourcePerson),
            targetPerson: toContactPreview(targetPerson),
          };
        })
        .filter((relationship) => Boolean(relationship));

      return { relationships: formattedRelationships };
    },
  );

  /**
   * POST /api/contacts/:id/relationships - Create a relationship for a person
   */
  fastify.post(
    "/:id/relationships",
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: CreateContactRelationshipInput }>,
      reply: FastifyReply,
    ) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client, user } = auth;
      const { id: sourcePersonId } = request.params;
      const { relatedPersonId, relationshipType } = request.body;
      const normalizedRelatedPersonId = relatedPersonId?.trim();

      if (!normalizedRelatedPersonId || normalizedRelatedPersonId.length === 0) {
        return reply.status(400).send({ error: "Related person is required" });
      }

      if (!relationshipType || !isRelationshipType(relationshipType)) {
        return reply.status(400).send({ error: "Invalid relationship type" });
      }

      if (sourcePersonId === normalizedRelatedPersonId) {
        return reply.status(400).send({ error: "A contact cannot be related to itself" });
      }

      const { data: peopleRows, error: peopleError } = await client
        .from("people")
        .select("id")
        .in("id", [sourcePersonId, normalizedRelatedPersonId])
        .eq("user_id", user.id);

      if (peopleError) {
        return reply.status(500).send({ error: peopleError.message });
      }

      if (!peopleRows || peopleRows.length !== 2) {
        return reply.status(404).send({ error: "One or both contacts were not found" });
      }

      const { data: insertedRelationship, error: insertError } = await client
        .from("people_relationships")
        .insert({
          user_id: user.id,
          source_person_id: sourcePersonId,
          target_person_id: normalizedRelatedPersonId,
          relationship_type: relationshipType,
        })
        .select(RELATIONSHIP_SELECT)
        .single();

      if (insertError) {
        if (insertError.code === "23505") {
          return reply.status(409).send({ error: "Relationship already exists" });
        }

        if (insertError.code === "23514") {
          return reply.status(400).send({ error: "Invalid relationship data" });
        }

        return reply.status(500).send({ error: insertError.message });
      }

      return reply.status(201).send({
        relationship: {
          id: insertedRelationship.id,
          userId: insertedRelationship.user_id,
          sourcePersonId: insertedRelationship.source_person_id,
          targetPersonId: insertedRelationship.target_person_id,
          relationshipType: insertedRelationship.relationship_type,
          createdAt: insertedRelationship.created_at,
          updatedAt: insertedRelationship.updated_at,
        },
      });
    },
  );

  /**
   * PATCH /api/contacts/:id/relationships/:relationshipId - Update a relationship for a person
   */
  fastify.patch(
    "/:id/relationships/:relationshipId",
    async (
      request: FastifyRequest<{
        Params: { id: string; relationshipId: string };
        Body: UpdateContactRelationshipInput;
      }>,
      reply: FastifyReply,
    ) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client, user } = auth;
      const { id: personId, relationshipId } = request.params;
      const { relatedPersonId, relationshipType } = request.body;
      const normalizedRelatedPersonId = relatedPersonId?.trim();

      if (!normalizedRelatedPersonId || normalizedRelatedPersonId.length === 0) {
        return reply.status(400).send({ error: "Related person is required" });
      }

      if (!relationshipType || !isRelationshipType(relationshipType)) {
        return reply.status(400).send({ error: "Invalid relationship type" });
      }

      if (personId === normalizedRelatedPersonId) {
        return reply.status(400).send({ error: "A contact cannot be related to itself" });
      }

      const { data: existingRelationship, error: existingRelationshipError } = await client
        .from("people_relationships")
        .select("id, source_person_id, target_person_id")
        .eq("id", relationshipId)
        .eq("user_id", user.id)
        .single();

      if (existingRelationshipError || !existingRelationship) {
        return reply.status(404).send({ error: "Relationship not found" });
      }

      if (
        existingRelationship.source_person_id !== personId &&
        existingRelationship.target_person_id !== personId
      ) {
        return reply.status(404).send({ error: "Relationship not found" });
      }

      const { data: peopleRows, error: peopleError } = await client
        .from("people")
        .select("id")
        .in("id", [personId, normalizedRelatedPersonId])
        .eq("user_id", user.id);

      if (peopleError) {
        return reply.status(500).send({ error: peopleError.message });
      }

      if (!peopleRows || peopleRows.length !== 2) {
        return reply.status(404).send({ error: "One or both contacts were not found" });
      }

      const { data: updatedRelationship, error: updateError } = await client
        .from("people_relationships")
        .update({
          source_person_id: personId,
          target_person_id: normalizedRelatedPersonId,
          relationship_type: relationshipType,
          updated_at: new Date().toISOString(),
        })
        .eq("id", relationshipId)
        .eq("user_id", user.id)
        .select(RELATIONSHIP_SELECT)
        .single();

      if (updateError) {
        if (updateError.code === "23505") {
          return reply.status(409).send({ error: "Relationship already exists" });
        }

        if (updateError.code === "23514") {
          return reply.status(400).send({ error: "Invalid relationship data" });
        }

        return reply.status(500).send({ error: updateError.message });
      }

      return {
        relationship: {
          id: updatedRelationship.id,
          userId: updatedRelationship.user_id,
          sourcePersonId: updatedRelationship.source_person_id,
          targetPersonId: updatedRelationship.target_person_id,
          relationshipType: updatedRelationship.relationship_type,
          createdAt: updatedRelationship.created_at,
          updatedAt: updatedRelationship.updated_at,
        },
      };
    },
  );

  /**
   * DELETE /api/contacts/:id/relationships/:relationshipId - Delete a relationship for a person
   */
  fastify.delete(
    "/:id/relationships/:relationshipId",
    async (
      request: FastifyRequest<{ Params: { id: string; relationshipId: string } }>,
      reply: FastifyReply,
    ) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client, user } = auth;
      const { id: personId, relationshipId } = request.params;

      const { data: existingRelationship, error: existingRelationshipError } = await client
        .from("people_relationships")
        .select("id, source_person_id, target_person_id")
        .eq("id", relationshipId)
        .eq("user_id", user.id)
        .single();

      if (existingRelationshipError || !existingRelationship) {
        return reply.status(404).send({ error: "Relationship not found" });
      }

      if (
        existingRelationship.source_person_id !== personId &&
        existingRelationship.target_person_id !== personId
      ) {
        return reply.status(404).send({ error: "Relationship not found" });
      }

      const { data: deletedRelationship, error: deleteError } = await client
        .from("people_relationships")
        .delete()
        .eq("id", relationshipId)
        .eq("user_id", user.id)
        .select("id")
        .single();

      if (deleteError || !deletedRelationship) {
        return reply.status(404).send({ error: "Relationship not found" });
      }

      return { message: "Relationship deleted successfully" };
    },
  );

  /**
   * GET /api/contacts/:id/important-events - Get normalized important events for a person
   */
  fastify.get(
    "/:id/important-events",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client, user } = auth;
      const { id: personId } = request.params;

      const { data: person, error: personError } = await client
        .from("people")
        .select("id")
        .eq("id", personId)
        .eq("user_id", user.id)
        .single();

      if (personError || !person) {
        return reply.status(404).send({ error: "Contact not found" });
      }

      const { data: rows, error: rowsError } = await client
        .from("people_important_events")
        .select(IMPORTANT_EVENT_SELECT)
        .eq("user_id", user.id)
        .eq("person_id", personId)
        .order("created_at", { ascending: true });

      if (rowsError) {
        return reply.status(500).send({ error: rowsError.message });
      }

      return {
        events: (rows || []).map(toImportantEvent),
      };
    },
  );

  /**
   * PUT /api/contacts/:id/important-events - Replace normalized important events for a person
   */
  fastify.put(
    "/:id/important-events",
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: {
          events: Array<{
            id?: string;
            eventType: ImportantEventType;
            eventDate: string;
            note?: string | null;
            notifyDaysBefore?: 1 | 3 | 7 | null;
          }>;
        };
      }>,
      reply: FastifyReply,
    ) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client, user } = auth;
      const { id: personId } = request.params;
      const events = request.body?.events;

      if (!Array.isArray(events)) {
        return reply.status(400).send({ error: "events must be an array" });
      }

      const { data: person, error: personError } = await client
        .from("people")
        .select("id")
        .eq("id", personId)
        .eq("user_id", user.id)
        .single();

      if (personError || !person) {
        return reply.status(404).send({ error: "Contact not found" });
      }

      for (const event of events) {
        if (!event?.eventType || !isImportantEventType(event.eventType)) {
          return reply.status(400).send({ error: "Invalid important event type" });
        }

        if (!event?.eventDate || !/^\d{4}-\d{2}-\d{2}$/.test(event.eventDate)) {
          return reply.status(400).send({ error: "eventDate must use YYYY-MM-DD format" });
        }

        if (!isValidImportantEventNotifyDaysBefore(event.notifyDaysBefore ?? null)) {
          return reply.status(400).send({ error: "Invalid notifyDaysBefore value" });
        }
      }

      const replaceRows = events.map((event) => ({
        id: event.id,
        user_id: user.id,
        person_id: personId,
        event_type: event.eventType,
        event_date: event.eventDate,
        note: event.note?.trim() ? event.note.trim() : null,
        notify_days_before: event.notifyDaysBefore ?? null,
      }));

      const { error: deleteError } = await client
        .from("people_important_events")
        .delete()
        .eq("user_id", user.id)
        .eq("person_id", personId);

      if (deleteError) {
        return reply.status(500).send({ error: deleteError.message });
      }

      if (replaceRows.length === 0) {
        return { events: [] };
      }

      const { data: insertedRows, error: insertError } = await client
        .from("people_important_events")
        .insert(replaceRows)
        .select(IMPORTANT_EVENT_SELECT)
        .order("created_at", { ascending: true });

      if (insertError) {
        if (insertError.code === "23505") {
          return reply.status(409).send({ error: "Duplicate important event" });
        }

        return reply.status(500).send({ error: insertError.message });
      }

      return {
        events: (insertedRows || []).map(toImportantEvent),
      };
    },
  );

  /**
   * PATCH /api/contacts/:id - Update a contact
   */
  fastify.patch(
    "/:id",
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: UpdateContactInput }>,
      reply: FastifyReply,
    ) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client, user } = auth;
      const { id } = request.params;
      const body = request.body;

      // Map camelCase to snake_case
      const updates: Record<string, unknown> = {};

      if (body.firstName !== undefined) {
        if (!body.firstName || body.firstName.trim().length === 0) {
          return reply.status(400).send({ error: "First name is required" });
        }
        updates.first_name = body.firstName;
      }
      if (body.middleName !== undefined) updates.middle_name = body.middleName;
      if (body.lastName !== undefined) updates.last_name = body.lastName;
      if (body.title !== undefined) updates.title = body.title;
      if (body.place !== undefined) updates.place = body.place;
      if (body.description !== undefined) updates.description = body.description;
      if (body.notes !== undefined) updates.notes = body.notes;
      if (body.avatar !== undefined) updates.avatar = body.avatar;
      if (body.connections !== undefined) updates.connections = body.connections;
      if (body.position !== undefined) updates.position = body.position;
      if (body.gender !== undefined) updates.gender = body.gender;
      if (body.language !== undefined) updates.language = body.language;
      if (body.timezone !== undefined) updates.timezone = body.timezone;
      if (body.nickname !== undefined) updates.nickname = body.nickname;
      if (body.pgpPublicKey !== undefined) updates.pgp_public_key = body.pgpPublicKey;
      if (body.location !== undefined) updates.location = body.location;
      if (body.lastInteraction !== undefined) updates.last_interaction = body.lastInteraction;

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

      const socialMediaUpdates: Array<{
        platform: Parameters<typeof upsertContactSocialMedia>[3];
        handle: string | null | undefined;
      }> = [];

      if (body.linkedin !== undefined) {
        socialMediaUpdates.push({ platform: "linkedin", handle: body.linkedin });
      }
      if (body.instagram !== undefined) {
        socialMediaUpdates.push({ platform: "instagram", handle: body.instagram });
      }
      if (body.whatsapp !== undefined) {
        socialMediaUpdates.push({ platform: "whatsapp", handle: body.whatsapp });
      }
      if (body.facebook !== undefined) {
        socialMediaUpdates.push({ platform: "facebook", handle: body.facebook });
      }
      if (body.website !== undefined) {
        socialMediaUpdates.push({ platform: "website", handle: body.website });
      }
      if (body.signal !== undefined) {
        socialMediaUpdates.push({ platform: "signal", handle: body.signal });
      }

      updates.updated_at = new Date().toISOString();

      const { error } = await client.from("people").update(updates).eq("id", id);

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      try {
        if (nextPhones !== undefined) {
          await replaceContactPhones(client, user.id, id, nextPhones);
        }

        if (nextEmails !== undefined) {
          await replaceContactEmails(client, user.id, id, nextEmails);
        }

        if (socialMediaUpdates.length > 0) {
          await Promise.all(
            socialMediaUpdates.map((entry) =>
              upsertContactSocialMedia(client, user.id, id, entry.platform, entry.handle),
            ),
          );
        }
      } catch (channelError) {
        const message =
          channelError instanceof Error ? channelError.message : "Unknown channel error";
        return reply.status(500).send({ error: message });
      }

      return { message: "Contact updated successfully" };
    },
  );

  /**
   * POST /api/contacts/:id/photo - Upload contact photo
   */
  fastify.post(
    "/:id/photo",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client, user } = auth;
      const { id: contactId } = request.params;

      // Get uploaded file
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ error: "No file provided" });
      }

      // Validate file
      const { validateImageUpload } = await import("../lib/config.js");
      const validation = validateImageUpload({ type: data.mimetype, size: 0 }); // Size checked by multipart limits
      if (!validation.isValid) {
        return reply.status(400).send({ error: validation.error });
      }

      // Verify contact belongs to user
      const { data: contact, error: contactError } = await client
        .from("people")
        .select("id")
        .eq("id", contactId)
        .eq("user_id", user.id)
        .single();

      if (contactError || !contact) {
        return reply.status(404).send({ error: "Contact not found" });
      }

      // Upload to storage
      const buffer = await data.toBuffer();
      const fileName = `${user.id}/${contactId}.jpg`;

      const { error: uploadError } = await client.storage.from("avatars").upload(fileName, buffer, {
        contentType: data.mimetype,
        upsert: true,
      });

      if (uploadError) {
        return reply.status(500).send({ error: "Failed to upload photo" });
      }

      // Get public URL
      const { data: urlData } = client.storage.from("avatars").getPublicUrl(fileName);

      if (!urlData?.publicUrl) {
        return reply.status(500).send({ error: "Failed to get photo URL" });
      }

      // Add cache-busting parameter
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Update contact
      const { error: updateError } = await client
        .from("people")
        .update({ avatar: avatarUrl })
        .eq("id", contactId);

      if (updateError) {
        return reply.status(500).send({ error: "Failed to update contact" });
      }

      return { success: true, avatarUrl };
    },
  );

  /**
   * DELETE /api/contacts/:id/photo - Delete contact photo
   */
  fastify.delete(
    "/:id/photo",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client, user } = auth;
      const { id: contactId } = request.params;

      // Verify contact belongs to user
      const { data: contact, error: contactError } = await client
        .from("people")
        .select("id, avatar")
        .eq("id", contactId)
        .eq("user_id", user.id)
        .single();

      if (contactError || !contact) {
        return reply.status(404).send({ error: "Contact not found" });
      }

      // Delete from storage
      const fileName = `${user.id}/${contactId}.jpg`;
      await client.storage.from("avatars").remove([fileName]);

      // Update contact
      await client.from("people").update({ avatar: null }).eq("id", contactId);

      return { success: true };
    },
  );

  /**
   * GET /api/contacts/:id/vcard - Export contact as vCard file
   */
  fastify.get(
    "/:id/vcard",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client, user } = auth;
      const { id } = request.params;

      // Fetch contact
      const { data: contact, error } = await client
        .from("people")
        .select(CONTACT_SELECT)
        .eq("id", id)
        .single();

      if (error || !contact) {
        return reply.status(404).send({ error: "Contact not found" });
      }

      let contactWithChannels: Contact;
      try {
        const [mappedContact] = await attachContactChannels(client, user.id, [contact]);
        const [mappedContactWithSocialMedia] = await attachContactSocialMedia(client, user.id, [
          mappedContact,
        ]);
        contactWithChannels = mappedContactWithSocialMedia as Contact;
      } catch (channelError) {
        fastify.log.error(
          { channelError },
          "Failed to attach contact channels/social media for vCard export",
        );
        contactWithChannels = withEmptySocialMedia(
          withEmptyChannels([contact]),
        )[0] as unknown as Contact;
      }

      // Generate vCard
      const vcard = await generateVCard(contactWithChannels);

      console.log("Generated vCard:\n", vcard);

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
