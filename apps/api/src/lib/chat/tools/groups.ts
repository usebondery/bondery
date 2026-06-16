import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@bondery/types/supabase.types";

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
    search_groups: tool({
      description: "Search groups by name. Returns all groups if no query is provided.",
      inputSchema: z.object({
        query: z.string().optional().describe("Free-text search across group names"),
        limit: z.number().min(1).max(25).default(10).describe("Max results to return"),
      }),
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
            id: g.id,
            label: g.label,
            emoji: g.emoji,
            color: g.color,
            contactCount: countMap.get(g.id) ?? 0,
          })),
          totalFound: groups?.length ?? 0,
        };
      },
    }),

    create_group: tool({
      description:
        "Create a new group for organizing contacts. Returns the created group's details.",
      inputSchema: z.object({
        label: z.string().min(1).max(100).describe("Group name"),
        emoji: z.string().optional().describe("Emoji icon for the group (e.g. 🏋️, 🎵)"),
        color: z.string().min(1).describe("Color for the group (e.g. 'blue', 'red', '#3B82F6')"),
      }),
      execute: async ({ label, emoji, color }) => {
        const { data: group, error } = await supabase
          .from("groups")
          .insert({
            user_id: userId,
            label: label.trim(),
            emoji: emoji?.trim() || null,
            color: color.trim(),
          })
          .select("id, label, emoji, color")
          .single();

        if (error || !group) {
          return { error: `Failed to create group: ${error?.message}` };
        }

        return {
          id: group.id,
          label: group.label,
          emoji: group.emoji,
          color: group.color,
          message: `Created group "${group.label}"`,
        };
      },
    }),

    update_group: tool({
      description: "Update an existing group's name, emoji, or color.",
      inputSchema: z.object({
        groupId: z.string().uuid().describe("The UUID of the group to update"),
        label: z.string().min(1).max(100).optional().describe("New group name"),
        emoji: z.string().optional().describe("New emoji icon"),
        color: z.string().optional().describe("New color"),
      }),
      execute: async ({ groupId, label, emoji, color }) => {
        const updates: Record<string, string> = {};
        if (label !== undefined) updates.label = label.trim();
        if (emoji !== undefined) updates.emoji = emoji.trim();
        if (color !== undefined) updates.color = color.trim();

        if (Object.keys(updates).length === 0) {
          return { error: "No fields to update were provided." };
        }

        updates.updated_at = new Date().toISOString();

        const { error } = await supabase.from("groups").update(updates).eq("id", groupId);

        if (error) {
          return { error: `Failed to update group: ${error.message}` };
        }

        return { message: "Group updated successfully.", groupId };
      },
    }),

    delete_group: tool({
      description:
        "Delete a group entirely. This removes the group but does not delete the contacts in it. Ask for confirmation before deleting.",
      inputSchema: z.object({
        groupId: z.string().uuid().describe("The UUID of the group to delete"),
      }),
      execute: async ({ groupId }) => {
        const { data: group } = await supabase
          .from("groups")
          .select("label")
          .eq("id", groupId)
          .single();

        const { error } = await supabase.from("groups").delete().eq("id", groupId);

        if (error) {
          return { error: `Failed to delete group: ${error.message}` };
        }

        return { message: `Deleted group "${group?.label ?? "(unknown)"}"` };
      },
    }),

    add_contacts_to_group: tool({
      description: "Add one or more contacts to a group. Skips contacts that are already members.",
      inputSchema: z.object({
        groupId: z.string().uuid().describe("The UUID of the group"),
        personIds: z.array(z.string().uuid()).min(1).describe("UUIDs of the contacts to add"),
      }),
      execute: async ({ groupId, personIds }) => {
        const memberships = personIds.map((personId) => ({
          person_id: personId,
          group_id: groupId,
          user_id: userId,
        }));

        const { error } = await supabase.from("people_groups").upsert(memberships, {
          onConflict: "person_id,group_id",
          ignoreDuplicates: true,
        });

        if (error) {
          return { error: `Failed to add contacts to group: ${error.message}` };
        }

        const { data: people } = await supabase
          .from("people")
          .select("first_name, last_name")
          .in("id", personIds);

        const names =
          people?.map((p) => [p.first_name, p.last_name].filter(Boolean).join(" ")).join(", ") ??
          "unknown";

        return { message: `Added ${names} to the group.`, groupId };
      },
    }),

    remove_contacts_from_group: tool({
      description:
        "Remove one or more contacts from a group. Does not delete the contacts themselves.",
      inputSchema: z.object({
        groupId: z.string().uuid().describe("The UUID of the group"),
        personIds: z.array(z.string().uuid()).min(1).describe("UUIDs of the contacts to remove"),
      }),
      execute: async ({ groupId, personIds }) => {
        const { error } = await supabase
          .from("people_groups")
          .delete()
          .eq("group_id", groupId)
          .in("person_id", personIds);

        if (error) {
          return { error: `Failed to remove contacts from group: ${error.message}` };
        }

        const { data: people } = await supabase
          .from("people")
          .select("first_name, last_name")
          .in("id", personIds);

        const names =
          people?.map((p) => [p.first_name, p.last_name].filter(Boolean).join(" ")).join(", ") ??
          "unknown";

        return { message: `Removed ${names} from the group.`, groupId };
      },
    }),
  };
}
