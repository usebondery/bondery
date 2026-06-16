import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TablesUpdate } from "@bondery/types/supabase.types";
import { INTERACTION_TYPES } from "@bondery/helpers";

/**
 * Creates interaction-related tools for the AI chat agent.
 * All queries are scoped to the authenticated user via RLS.
 *
 * @param supabase - Authenticated Supabase client (RLS-enforced).
 * @param userId - The authenticated user's ID.
 * @returns An object of AI SDK tools for interaction operations.
 */
export function createInteractionTools(supabase: SupabaseClient<Database>, userId: string) {
  return {
    log_interaction: tool({
      description:
        "Log a new interaction with one or more contacts. Automatically updates last_interaction on each participant.",
      inputSchema: z.object({
        title: z.string().max(200).optional().describe("Short title or summary of the interaction"),
        type: z.enum(INTERACTION_TYPES).describe("Type of interaction"),
        description: z
          .string()
          .max(1000)
          .optional()
          .describe("Longer description or notes about the interaction"),
        date: z
          .string()
          .describe(
            "Date of the interaction in ISO format (YYYY-MM-DD). Use today if not specified.",
          ),
        participantIds: z
          .array(z.string().uuid())
          .min(1)
          .describe("UUIDs of the contacts who participated"),
      }),
      execute: async ({ title, type, description, date, participantIds }) => {
        const { data: interaction, error: interactionError } = await supabase
          .from("interactions")
          .insert({
            title: title ?? null,
            type,
            description: description ?? null,
            date,
            user_id: userId,
          })
          .select("id")
          .single();

        if (interactionError || !interaction) {
          return {
            error: `Failed to log interaction: ${interactionError?.message}`,
          };
        }

        const participantRows = participantIds.map((personId) => ({
          interaction_id: interaction.id,
          person_id: personId,
        }));

        const { error: participantError } = await supabase
          .from("interaction_participants")
          .insert(participantRows);

        if (participantError) {
          return {
            error: `Interaction created but failed to link participants: ${participantError.message}`,
          };
        }

        const updatePromises = participantIds.map((personId) =>
          supabase
            .from("people")
            .update({
              last_interaction: date,
              last_interaction_activity_id: interaction.id,
            })
            .eq("id", personId),
        );

        await Promise.all(updatePromises);

        const { data: participants } = await supabase
          .from("people")
          .select("first_name, last_name")
          .in("id", participantIds);

        const names =
          participants
            ?.map((p) => [p.first_name, p.last_name].filter(Boolean).join(" "))
            .join(", ") ?? "unknown";

        return {
          id: interaction.id,
          type,
          date,
          participants: names,
          message: `Logged ${type} interaction on ${date} with ${names}`,
        };
      },
    }),

    search_interactions: tool({
      description:
        "Search past interactions, optionally filtering by contact, type, or date range.",
      inputSchema: z.object({
        contactId: z
          .string()
          .uuid()
          .optional()
          .describe("Filter to interactions involving this contact"),
        type: z.enum(INTERACTION_TYPES).optional().describe("Filter by interaction type"),
        dateFrom: z.string().optional().describe("Start date filter (YYYY-MM-DD)"),
        dateTo: z.string().optional().describe("End date filter (YYYY-MM-DD)"),
        limit: z.number().min(1).max(25).default(10).describe("Max results to return"),
      }),
      execute: async ({ contactId, type, dateFrom, dateTo, limit }) => {
        let query = supabase
          .from("interactions")
          .select(
            `
            id, title, type, description, date, created_at,
            interaction_participants ( person_id, people ( first_name, last_name ) )
          `,
          )
          .order("date", { ascending: false })
          .limit(limit);

        if (type) {
          query = query.eq("type", type);
        }

        if (dateFrom) {
          query = query.gte("date", dateFrom);
        }

        if (dateTo) {
          query = query.lte("date", dateTo);
        }

        const { data: interactions, error } = await query;

        if (error) {
          return { error: `Failed to search interactions: ${error.message}` };
        }

        let results = interactions ?? [];

        if (contactId) {
          results = results.filter((i: any) =>
            i.interaction_participants?.some((p: any) => p.person_id === contactId),
          );
        }

        return {
          interactions: results.map((i: any) => ({
            id: i.id,
            title: i.title,
            type: i.type,
            description: i.description,
            date: i.date,
            participants:
              i.interaction_participants
                ?.map((p: any) =>
                  [p.people?.first_name, p.people?.last_name].filter(Boolean).join(" "),
                )
                .filter(Boolean) ?? [],
          })),
          totalFound: results.length,
        };
      },
    }),

    add_participants_to_interaction: tool({
      description:
        "Add one or more contacts to an existing interaction. Use this when the user says 'add X to the event/meeting/interaction' or wants to include someone in an already-logged interaction. Do NOT create a new interaction in this case.",
      inputSchema: z.object({
        interactionId: z
          .string()
          .uuid()
          .describe("The UUID of the existing interaction to add participants to"),
        participantIds: z.array(z.string().uuid()).min(1).describe("UUIDs of the contacts to add"),
      }),
      execute: async ({ interactionId, participantIds }) => {
        // Fetch interaction to get date for updating last_interaction
        const { data: interaction, error: interactionError } = await supabase
          .from("interactions")
          .select("id, date, title, type")
          .eq("id", interactionId)
          .single();

        if (interactionError || !interaction) {
          return { error: "Interaction not found" };
        }

        // Skip already-linked participants
        const { data: existing } = await supabase
          .from("interaction_participants")
          .select("person_id")
          .eq("interaction_id", interactionId);

        const existingIds = new Set(existing?.map((p: any) => p.person_id) ?? []);
        const newIds = participantIds.filter((id) => !existingIds.has(id));

        if (newIds.length === 0) {
          return { message: "All specified contacts are already part of this interaction." };
        }

        const { error: insertError } = await supabase
          .from("interaction_participants")
          .insert(
            newIds.map((personId) => ({ interaction_id: interactionId, person_id: personId })),
          );

        if (insertError) {
          return { error: `Failed to add participants: ${insertError.message}` };
        }

        // Update last_interaction on newly added people
        await Promise.all(
          newIds.map((personId) =>
            supabase
              .from("people")
              .update({
                last_interaction: interaction.date,
                last_interaction_activity_id: interactionId,
              })
              .eq("id", personId),
          ),
        );

        const { data: participants } = await supabase
          .from("people")
          .select("first_name, last_name")
          .in("id", newIds);

        const names =
          participants
            ?.map((p) => [p.first_name, p.last_name].filter(Boolean).join(" "))
            .join(", ") ?? "unknown";

        return {
          message: `Added ${names} to the interaction.`,
          interactionId,
          participantsAdded: names,
        };
      },
    }),

    update_interaction: tool({
      description:
        "Update an existing interaction's details such as title, type, date, or description. Use this when the user wants to edit or change information about a previously logged interaction.",
      inputSchema: z.object({
        interactionId: z.string().uuid().describe("The UUID of the interaction to update"),
        title: z.string().max(200).optional().describe("New title or summary"),
        type: z.enum(INTERACTION_TYPES).optional().describe("New interaction type"),
        date: z.string().optional().describe("New date in ISO format (YYYY-MM-DD)"),
        description: z.string().max(1000).optional().describe("New description or notes"),
      }),
      execute: async ({ interactionId, title, type, date, description }) => {
        const updates: TablesUpdate<"interactions"> = {};
        if (title !== undefined) updates.title = title;
        if (type !== undefined) updates.type = type;
        if (date !== undefined) updates.date = date;
        if (description !== undefined) updates.description = description;

        if (Object.keys(updates).length === 0) {
          return { error: "No fields to update were provided." };
        }

        const { data: interaction, error } = await supabase
          .from("interactions")
          .update(updates)
          .eq("id", interactionId)
          .select("id, title, type, date, description")
          .single();

        if (error || !interaction) {
          return { error: `Failed to update interaction: ${error?.message ?? "not found"}` };
        }

        // If the date changed, update last_interaction on all participants
        if (date !== undefined) {
          const { data: participants } = await supabase
            .from("interaction_participants")
            .select("person_id")
            .eq("interaction_id", interactionId);

          if (participants && participants.length > 0) {
            await Promise.all(
              participants.map((p) =>
                supabase
                  .from("people")
                  .update({
                    last_interaction: date,
                    last_interaction_activity_id: interactionId,
                  })
                  .eq("id", p.person_id)
                  .eq("last_interaction_activity_id", interactionId),
              ),
            );
          }
        }

        return {
          id: interaction.id,
          title: interaction.title,
          type: interaction.type,
          date: interaction.date,
          description: interaction.description,
          message: `Updated interaction successfully.`,
        };
      },
    }),

    remove_participants_from_interaction: tool({
      description:
        "Remove one or more contacts from an existing interaction. Use this when the user says 'remove X from the meeting' or wants to exclude someone from an already-logged interaction.",
      inputSchema: z.object({
        interactionId: z
          .string()
          .uuid()
          .describe("The UUID of the interaction to remove participants from"),
        participantIds: z
          .array(z.string().uuid())
          .min(1)
          .describe("UUIDs of the contacts to remove"),
      }),
      execute: async ({ interactionId, participantIds }) => {
        // Verify interaction exists
        const { data: interaction, error: interactionError } = await supabase
          .from("interactions")
          .select("id, title, type")
          .eq("id", interactionId)
          .single();

        if (interactionError || !interaction) {
          return { error: "Interaction not found" };
        }

        const { error: deleteError } = await supabase
          .from("interaction_participants")
          .delete()
          .eq("interaction_id", interactionId)
          .in("person_id", participantIds);

        if (deleteError) {
          return { error: `Failed to remove participants: ${deleteError.message}` };
        }

        const { data: people } = await supabase
          .from("people")
          .select("first_name, last_name")
          .in("id", participantIds);

        const names =
          people?.map((p) => [p.first_name, p.last_name].filter(Boolean).join(" ")).join(", ") ??
          "unknown";

        return {
          message: `Removed ${names} from the interaction.`,
          interactionId,
          participantsRemoved: names,
        };
      },
    }),

    delete_interaction: tool({
      description:
        "Delete an interaction entirely. Use this when the user wants to remove a logged interaction. This will also remove all participant links. Ask for confirmation before deleting.",
      inputSchema: z.object({
        interactionId: z.string().uuid().describe("The UUID of the interaction to delete"),
      }),
      execute: async ({ interactionId }) => {
        // Fetch the interaction first so we can report what was deleted
        const { data: interaction, error: fetchError } = await supabase
          .from("interactions")
          .select("id, title, type, date")
          .eq("id", interactionId)
          .single();

        if (fetchError || !interaction) {
          return { error: "Interaction not found" };
        }

        // Delete participant links first
        await supabase
          .from("interaction_participants")
          .delete()
          .eq("interaction_id", interactionId);

        // Delete the interaction
        const { error: deleteError } = await supabase
          .from("interactions")
          .delete()
          .eq("id", interactionId);

        if (deleteError) {
          return { error: `Failed to delete interaction: ${deleteError.message}` };
        }

        return {
          message: `Deleted ${interaction.type} interaction "${interaction.title ?? "(untitled)"}" from ${interaction.date}.`,
        };
      },
    }),
  };
}
