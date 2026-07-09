import { INTERACTION_TYPES } from "@bondery/helpers";
import type { Database } from "@bondery/schemas/supabase.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { tool } from "ai";
import { z } from "zod";
import {
  addParticipantsToInteraction,
  deleteInteractionWithSummary,
  logInteraction,
  removeParticipantsFromInteraction,
  updateInteractionDetails,
} from "../../../services/interactions/index.js";
import { chatDomainContext, formatToolDomainError } from "../domain-context.js";

type InteractionParticipantRow = {
  person_id: string;
  people: {
    first_name: string | null;
    last_name: string | null;
  } | null;
};

type InteractionSearchRow = {
  id: string;
  title: string | null;
  type: string;
  description: string | null;
  date: string;
  created_at: string;
  interaction_participants?: InteractionParticipantRow[] | null;
};

/**
 * Creates interaction-related tools for the AI chat agent.
 * Mutations go through services/interactions; reads stay on Supabase (RLS).
 */
export function createInteractionTools(supabase: SupabaseClient<Database>, userId: string) {
  const ctx = () => chatDomainContext(supabase, userId);

  return {
    add_participants_to_interaction: tool({
      description:
        "Add one or more contacts to an existing interaction. Use this when the user says 'add X to the event/meeting/interaction' or wants to include someone in an already-logged interaction. Do NOT create a new interaction in this case.",
      execute: async ({ interactionId, participantIds }) => {
        try {
          return await addParticipantsToInteraction(ctx(), interactionId, participantIds);
        } catch (error) {
          return formatToolDomainError(error, "Failed to add participants");
        }
      },
      inputSchema: z.object({
        interactionId: z
          .string()
          .uuid()
          .describe("The UUID of the existing interaction to add participants to"),
        participantIds: z.array(z.string().uuid()).min(1).describe("UUIDs of the contacts to add"),
      }),
    }),

    delete_interaction: tool({
      description:
        "Delete an interaction entirely. Use this when the user wants to remove a logged interaction. This will also remove all participant links. Ask for confirmation before deleting.",
      execute: async ({ interactionId }) => {
        try {
          return await deleteInteractionWithSummary(ctx(), interactionId);
        } catch (error) {
          return formatToolDomainError(error, "Failed to delete interaction");
        }
      },
      inputSchema: z.object({
        interactionId: z.string().uuid().describe("The UUID of the interaction to delete"),
      }),
    }),
    log_interaction: tool({
      description:
        "Log a new interaction with one or more contacts. Automatically updates last_interaction on each participant.",
      execute: async ({ title, type, description, date, participantIds }) => {
        try {
          return await logInteraction(ctx(), {
            date,
            description,
            participantIds,
            title,
            type,
          });
        } catch (error) {
          return formatToolDomainError(error, "Failed to log interaction");
        }
      },
      inputSchema: z.object({
        date: z
          .string()
          .describe(
            "Date of the interaction in ISO format (YYYY-MM-DD). Use today if not specified.",
          ),
        description: z
          .string()
          .max(1000)
          .optional()
          .describe("Longer description or notes about the interaction"),
        participantIds: z
          .array(z.string().uuid())
          .min(1)
          .describe("UUIDs of the contacts who participated"),
        title: z.string().max(200).optional().describe("Short title or summary of the interaction"),
        type: z.enum(INTERACTION_TYPES).describe("Type of interaction"),
      }),
    }),

    remove_participants_from_interaction: tool({
      description:
        "Remove one or more contacts from an existing interaction. Use this when the user says 'remove X from the meeting' or wants to exclude someone from an already-logged interaction.",
      execute: async ({ interactionId, participantIds }) => {
        try {
          return await removeParticipantsFromInteraction(ctx(), interactionId, participantIds);
        } catch (error) {
          return formatToolDomainError(error, "Failed to remove participants");
        }
      },
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
    }),

    search_interactions: tool({
      description:
        "Search past interactions, optionally filtering by contact, type, or date range.",
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

        let results = (interactions ?? []) as InteractionSearchRow[];

        if (contactId) {
          results = results.filter((i) =>
            i.interaction_participants?.some((p) => p.person_id === contactId),
          );
        }

        return {
          interactions: results.map((i) => ({
            date: i.date,
            description: i.description,
            id: i.id,
            participants:
              i.interaction_participants
                ?.map((p) => [p.people?.first_name, p.people?.last_name].filter(Boolean).join(" "))
                .filter(Boolean) ?? [],
            title: i.title,
            type: i.type,
          })),
          totalFound: results.length,
        };
      },
      inputSchema: z.object({
        contactId: z
          .string()
          .uuid()
          .optional()
          .describe("Filter to interactions involving this contact"),
        dateFrom: z.string().optional().describe("Start date filter (YYYY-MM-DD)"),
        dateTo: z.string().optional().describe("End date filter (YYYY-MM-DD)"),
        limit: z.number().min(1).max(25).default(10).describe("Max results to return"),
        type: z.enum(INTERACTION_TYPES).optional().describe("Filter by interaction type"),
      }),
    }),

    update_interaction: tool({
      description:
        "Update an existing interaction's details such as title, type, date, or description. Use this when the user wants to edit or change information about a previously logged interaction.",
      execute: async ({ interactionId, title, type, date, description }) => {
        try {
          return await updateInteractionDetails(ctx(), interactionId, {
            date,
            description,
            title,
            type,
          });
        } catch (error) {
          return formatToolDomainError(error, "Failed to update interaction");
        }
      },
      inputSchema: z.object({
        date: z.string().optional().describe("New date in ISO format (YYYY-MM-DD)"),
        description: z.string().max(1000).optional().describe("New description or notes"),
        interactionId: z.string().uuid().describe("The UUID of the interaction to update"),
        title: z.string().max(200).optional().describe("New title or summary"),
        type: z.enum(INTERACTION_TYPES).optional().describe("New interaction type"),
      }),
    }),
  };
}
