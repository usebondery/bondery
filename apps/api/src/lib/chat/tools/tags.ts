import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TablesUpdate } from "@bondery/types/supabase.types";

// Fixed color palette for auto-assigning tag colors (matches API route)
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
 * Picks the next tag color by cycling through the palette based on the
 * current count of tags the user already has.
 */
async function pickNextColor(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string> {
  const { count } = await supabase
    .from("tags")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  return TAG_COLORS[(count || 0) % TAG_COLORS.length];
}

/**
 * Creates tag-related tools for the AI chat agent.
 * All queries are scoped to the authenticated user via RLS.
 *
 * @param supabase - Authenticated Supabase client (RLS-enforced).
 * @param userId - The authenticated user's ID.
 * @returns An object of AI SDK tools for tag operations.
 */
export function createTagTools(
  supabase: SupabaseClient<Database>,
  userId: string,
) {
  return {
    search_tags: tool({
      description:
        "Search tags by label. Returns all tags if no query is provided.",
      inputSchema: z.object({
        query: z
          .string()
          .optional()
          .describe("Free-text search across tag labels"),
        limit: z
          .number()
          .min(1)
          .max(25)
          .default(10)
          .describe("Max results to return"),
      }),
      execute: async ({ query, limit }) => {
        let dbQuery = supabase
          .from("tags")
          .select("id, label, color, created_at")
          .order("label", { ascending: true })
          .limit(limit);

        if (query) {
          dbQuery = dbQuery.ilike("label", `%${query}%`);
        }

        const { data: tags, error } = await dbQuery;

        if (error) {
          return { error: `Failed to search tags: ${error.message}` };
        }

        // Get contact counts for each tag
        const tagIds = (tags ?? []).map((t) => t.id);
        const { data: memberships } = await supabase
          .from("people_tags")
          .select("tag_id")
          .in("tag_id", tagIds);

        const countMap = new Map<string, number>();
        for (const m of memberships ?? []) {
          countMap.set(m.tag_id, (countMap.get(m.tag_id) ?? 0) + 1);
        }

        return {
          tags: (tags ?? []).map((t) => ({
            id: t.id,
            label: t.label,
            color: t.color,
            contactCount: countMap.get(t.id) ?? 0,
          })),
          totalFound: tags?.length ?? 0,
        };
      },
    }),

    create_tag: tool({
      description:
        "Create a new tag. A color is automatically assigned from a rotating palette unless provided.",
      inputSchema: z.object({
        label: z.string().min(1).max(100).describe("Tag label"),
        color: z
          .string()
          .optional()
          .describe("Optional hex color override (e.g. '#3B82F6')"),
      }),
      execute: async ({ label, color }) => {
        const tagColor =
          color?.trim() || (await pickNextColor(supabase, userId));

        const { data: tag, error } = await supabase
          .from("tags")
          .insert({
            user_id: userId,
            label: label.trim(),
            color: tagColor,
          })
          .select("id, label, color")
          .single();

        if (error || !tag) {
          return { error: `Failed to create tag: ${error?.message}` };
        }

        return {
          id: tag.id,
          label: tag.label,
          color: tag.color,
          message: `Created tag "${tag.label}"`,
        };
      },
    }),

    update_tag: tool({
      description: "Update an existing tag's label or color.",
      inputSchema: z.object({
        tagId: z.string().uuid().describe("The UUID of the tag to update"),
        label: z.string().min(1).max(100).optional().describe("New tag label"),
        color: z.string().optional().describe("New hex color"),
      }),
      execute: async ({ tagId, label, color }) => {
        const updates: TablesUpdate<"tags"> = {};
        if (label !== undefined) updates.label = label.trim();
        if (color !== undefined) updates.color = color.trim();

        if (Object.keys(updates).length === 0) {
          return { error: "No fields to update were provided." };
        }

        updates.updated_at = new Date().toISOString();

        const { error } = await supabase
          .from("tags")
          .update(updates)
          .eq("id", tagId);

        if (error) {
          return { error: `Failed to update tag: ${error.message}` };
        }

        return { message: "Tag updated successfully.", tagId };
      },
    }),

    delete_tag: tool({
      description:
        "Delete a tag entirely. This removes the tag but does not delete the contacts associated with it. Ask for confirmation before deleting.",
      inputSchema: z.object({
        tagId: z.string().uuid().describe("The UUID of the tag to delete"),
      }),
      execute: async ({ tagId }) => {
        const { data: tag } = await supabase
          .from("tags")
          .select("label")
          .eq("id", tagId)
          .single();

        const { error } = await supabase.from("tags").delete().eq("id", tagId);

        if (error) {
          return { error: `Failed to delete tag: ${error.message}` };
        }

        return { message: `Deleted tag "${tag?.label ?? "(unknown)"}"` };
      },
    }),

    add_tag_to_contacts: tool({
      description:
        "Apply a tag to one or more contacts. Skips contacts that already have the tag.",
      inputSchema: z.object({
        tagId: z.string().uuid().describe("The UUID of the tag"),
        personIds: z
          .array(z.string().uuid())
          .min(1)
          .describe("UUIDs of the contacts to tag"),
      }),
      execute: async ({ tagId, personIds }) => {
        const memberships = personIds.map((personId) => ({
          person_id: personId,
          tag_id: tagId,
          user_id: userId,
        }));

        const { error } = await supabase
          .from("people_tags")
          .upsert(memberships, {
            onConflict: "person_id,tag_id",
            ignoreDuplicates: true,
          });

        if (error) {
          return { error: `Failed to tag contacts: ${error.message}` };
        }

        const { data: people } = await supabase
          .from("people")
          .select("first_name, last_name")
          .in("id", personIds);

        const names =
          people
            ?.map((p) => [p.first_name, p.last_name].filter(Boolean).join(" "))
            .join(", ") ?? "unknown";

        return { message: `Tagged ${names}.`, tagId };
      },
    }),

    remove_tag_from_contacts: tool({
      description:
        "Remove a tag from one or more contacts. Does not delete the tag itself.",
      inputSchema: z.object({
        tagId: z.string().uuid().describe("The UUID of the tag"),
        personIds: z
          .array(z.string().uuid())
          .min(1)
          .describe("UUIDs of the contacts to untag"),
      }),
      execute: async ({ tagId, personIds }) => {
        const { error } = await supabase
          .from("people_tags")
          .delete()
          .eq("tag_id", tagId)
          .in("person_id", personIds);

        if (error) {
          return {
            error: `Failed to remove tag from contacts: ${error.message}`,
          };
        }

        const { data: people } = await supabase
          .from("people")
          .select("first_name, last_name")
          .in("id", personIds);

        const names =
          people
            ?.map((p) => [p.first_name, p.last_name].filter(Boolean).join(" "))
            .join(", ") ?? "unknown";

        return { message: `Removed tag from ${names}.`, tagId };
      },
    }),
  };
}
