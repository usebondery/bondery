/**
 * Contacts API Routes
 * Handles CRUD operations for contacts
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireAuth } from "../lib/supabase.js";
import type {
  Contact,
  CreateContactInput,
  UpdateContactInput,
  DeleteContactsRequest,
} from "@bondery/types";

// Contact fields selection query for Supabase
const CONTACT_SELECT = `
  id,
  firstName:first_name,
  middleName:middle_name,
  lastName:last_name,
  title,
  place,
  description,
  notes,
  avatarColor:avatar_color,
  avatar,
  lastInteraction:last_interaction,
  createdAt:created_at,
  connections,
  phone,
  email,
  linkedin,
  instagram,
  whatsapp,
  facebook,
  website,
  signal,
  birthdate,
  notifyBirthday:notify_birthday,
  importantDates:important_dates,
  myself,
  position
`;

export async function contactRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/contacts - List all contacts
   */
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) return;

    const { client } = auth;

    const { data: contacts, error } = await client
      .from("people")
      .select(CONTACT_SELECT)
      .eq("myself", false);

    if (error) {
      return reply.status(500).send({ error: error.message });
    }

    return {
      contacts,
      totalCount: contacts.length,
    };
  });

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
        avatar_color: "blue",
        last_interaction: new Date().toISOString(),
        myself: false,
      };

      // Add optional fields
      if (body.linkedin) {
        insertData.linkedin = body.linkedin.trim();
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

      const { client } = auth;
      const { id } = request.params;

      const { data: contact, error } = await client
        .from("people")
        .select(CONTACT_SELECT)
        .eq("id", id)
        .single();

      if (error) {
        return reply.status(404).send({ error: error.message });
      }

      return { contact };
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

      const { client } = auth;
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
      if (body.avatarColor !== undefined) updates.avatar_color = body.avatarColor;
      if (body.avatar !== undefined) updates.avatar = body.avatar;
      if (body.connections !== undefined) updates.connections = body.connections;
      if (body.phone !== undefined) updates.phone = body.phone;
      if (body.email !== undefined) updates.email = body.email;
      if (body.linkedin !== undefined) updates.linkedin = body.linkedin;
      if (body.instagram !== undefined) updates.instagram = body.instagram;
      if (body.whatsapp !== undefined) updates.whatsapp = body.whatsapp;
      if (body.facebook !== undefined) updates.facebook = body.facebook;
      if (body.website !== undefined) updates.website = body.website;
      if (body.signal !== undefined) updates.signal = body.signal;
      if (body.birthdate !== undefined) updates.birthdate = body.birthdate;
      if (body.notifyBirthday !== undefined) updates.notify_birthday = body.notifyBirthday;
      if (body.importantDates !== undefined) updates.important_dates = body.importantDates;
      if (body.position !== undefined) updates.position = body.position;

      updates.updated_at = new Date().toISOString();

      const { error } = await client.from("people").update(updates).eq("id", id);

      if (error) {
        return reply.status(500).send({ error: error.message });
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
}
