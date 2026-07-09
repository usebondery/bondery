import { createGroupSchema, updateGroupSchema } from "@bondery/schemas";
import type { Database } from "@bondery/schemas/supabase.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { tool } from "ai";
import { z } from "zod";
import {
  addGroupMembers,
  createGroup,
  deleteGroup,
  removeGroupMembers,
  updateGroup,
} from "../../../domains/groups/index.js";
import { chatDomainContext, formatToolDomainError } from "../domain-context.js";

/**
 * Creates group-related tools for the AI chat agent.
 * All queries are scoped to the authenticated user via RLS.
 *
 * @param supabase - Authenticated Supabase client (RLS-enforced).
 * @param userId - The authenticated user's ID.
 * @returns An object of AI SDK tools for group operations.
 */
export function createGroupTools(supabase: SupabaseClient<Database>, userId: string) {
  return {
    add_contacts_to_group: tool({
      description: "Add one or more contacts to a group. Skips contacts that are already members.",
      execute: async ({ groupId, personIds }) => {
        const ctx = chatDomainContext(supabase, userId);
        try {
          await addGroupMembers(ctx, groupId, personIds);
        } catch (error) {
          return formatToolDomainError(error, "Failed to add contacts to group");
        }

        const { data: people } = await supabase
          .from("people")
          .select("first_name, last_name")
          .in("id", personIds);

        const names =
          people?.map((p) => [p.first_name, p.last_name].filter(Boolean).join(" ")).join(", ") ??
          "unknown";

        return { groupId, message: `Added ${names} to the group.` };
      },
      inputSchema: z.object({
        groupId: z.string().uuid().describe("The UUID of the group"),
        personIds: z.array(z.string().uuid()).min(1).describe("UUIDs of the contacts to add"),
      }),
    }),

    create_group: tool({
      description:
        "Create a new group for organizing contacts. Returns the created group's details.",
      execute: async ({ label, emoji, color }) => {
        const ctx = chatDomainContext(supabase, userId);
        try {
          const { data } = await createGroup(ctx, { color, emoji, label });
          const group = data.group;
          return {
            color: group.color,
            emoji: group.emoji,
            id: group.id,
            label: group.label,
            message: `Created group "${group.label}"`,
          };
        } catch (error) {
          return formatToolDomainError(error, "Failed to create group");
        }
      },
      inputSchema: createGroupSchema,
    }),

    delete_group: tool({
      description:
        "Delete a group entirely. This removes the group but does not delete the contacts in it. Ask for confirmation before deleting.",
      execute: async ({ groupId }) => {
        const ctx = chatDomainContext(supabase, userId);
        const { data: group } = await supabase
          .from("groups")
          .select("label")
          .eq("id", groupId)
          .single();

        try {
          await deleteGroup(ctx, groupId);
          return { message: `Deleted group "${group?.label ?? "(unknown)"}"` };
        } catch (error) {
          return formatToolDomainError(error, "Failed to delete group");
        }
      },
      inputSchema: z.object({
        groupId: z.string().uuid().describe("The UUID of the group to delete"),
      }),
    }),

    remove_contacts_from_group: tool({
      description:
        "Remove one or more contacts from a group. Does not delete the contacts themselves.",
      execute: async ({ groupId, personIds }) => {
        const ctx = chatDomainContext(supabase, userId);
        try {
          await removeGroupMembers(ctx, groupId, personIds);
        } catch (error) {
          return formatToolDomainError(error, "Failed to remove contacts from group");
        }

        const { data: people } = await supabase
          .from("people")
          .select("first_name, last_name")
          .in("id", personIds);

        const names =
          people?.map((p) => [p.first_name, p.last_name].filter(Boolean).join(" ")).join(", ") ??
          "unknown";

        return { groupId, message: `Removed ${names} from the group.` };
      },
      inputSchema: z.object({
        groupId: z.string().uuid().describe("The UUID of the group"),
        personIds: z.array(z.string().uuid()).min(1).describe("UUIDs of the contacts to remove"),
      }),
    }),
    search_groups: tool({
      description: "Search groups by name. Returns all groups if no query is provided.",
      execute: async ({ query, limit }) => {
        let dbQuery = supabase
          .from("groups")
          .select("id, label, emoji, color, created_at")
          .order("label", { ascending: true })
          .limit(limit);

        if (query) {
          dbQuery = dbQuery.ilike("label", `%${query}%`);
        }

        const { data: groups, error } = await dbQuery;

        if (error) {
          return { error: `Failed to search groups: ${error.message}` };
        }

        // Get contact counts for each group
        const groupIds = (groups ?? []).map((g) => g.id);
        const { data: memberships } = await supabase
          .from("people_groups")
          .select("group_id")
          .in("group_id", groupIds);

        const countMap = new Map<string, number>();
        for (const m of memberships ?? []) {
          countMap.set(m.group_id, (countMap.get(m.group_id) ?? 0) + 1);
        }

        return {
          groups: (groups ?? []).map((g) => ({
            color: g.color,
            contactCount: countMap.get(g.id) ?? 0,
            emoji: g.emoji,
            id: g.id,
            label: g.label,
          })),
          totalFound: groups?.length ?? 0,
        };
      },
      inputSchema: z.object({
        limit: z.number().min(1).max(25).default(10).describe("Max results to return"),
        query: z.string().optional().describe("Free-text search across group names"),
      }),
    }),

    update_group: tool({
      description: "Update an existing group's name, emoji, or color.",
      execute: async ({ groupId, label, emoji, color }) => {
        const ctx = chatDomainContext(supabase, userId);
        try {
          await updateGroup(ctx, groupId, { color, emoji, label });
          return { groupId, message: "Group updated successfully." };
        } catch (error) {
          return formatToolDomainError(error, "Failed to update group");
        }
      },
      inputSchema: updateGroupSchema.extend({
        groupId: z.string().uuid().describe("The UUID of the group to update"),
      }),
    }),
  };
}
