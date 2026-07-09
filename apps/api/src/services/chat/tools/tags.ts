import type { Database } from "@bondery/schemas/supabase.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { tool } from "ai";
import { z } from "zod";
import {
  addTagMembers,
  createTag,
  deleteTag,
  removeTagMembers,
  updateTag,
} from "../../../domains/tags/index.js";
import { chatDomainContext, formatToolDomainError } from "../domain-context.js";

/**
 * Creates tag-related tools for the AI chat agent.
 * All queries are scoped to the authenticated user via RLS.
 *
 * @param supabase - Authenticated Supabase client (RLS-enforced).
 * @param userId - The authenticated user's ID.
 * @returns An object of AI SDK tools for tag operations.
 */
export function createTagTools(supabase: SupabaseClient<Database>, userId: string) {
  return {
    add_tag_to_contacts: tool({
      description: "Apply a tag to one or more contacts. Skips contacts that already have the tag.",
      execute: async ({ tagId, personIds }) => {
        const ctx = chatDomainContext(supabase, userId);
        try {
          await addTagMembers(ctx, tagId, personIds);
        } catch (error) {
          return formatToolDomainError(error, "Failed to tag contacts");
        }

        const { data: people } = await supabase
          .from("people")
          .select("first_name, last_name")
          .in("id", personIds);

        const names =
          people?.map((p) => [p.first_name, p.last_name].filter(Boolean).join(" ")).join(", ") ??
          "unknown";

        return { message: `Tagged ${names}.`, tagId };
      },
      inputSchema: z.object({
        personIds: z.array(z.string().uuid()).min(1).describe("UUIDs of the contacts to tag"),
        tagId: z.string().uuid().describe("The UUID of the tag"),
      }),
    }),

    create_tag: tool({
      description:
        "Create a new tag. A color is automatically assigned from a rotating palette unless provided.",
      execute: async ({ label, color }) => {
        const ctx = chatDomainContext(supabase, userId);
        try {
          const { data } = await createTag(ctx, { color, label });
          const tag = data.tag;
          return {
            color: tag.color,
            id: tag.id,
            label: tag.label,
            message: `Created tag "${tag.label}"`,
          };
        } catch (error) {
          return formatToolDomainError(error, "Failed to create tag");
        }
      },
      inputSchema: z.object({
        color: z.string().optional().describe("Optional hex color override (e.g. '#3B82F6')"),
        label: z.string().min(1).max(100).describe("Tag label"),
      }),
    }),

    delete_tag: tool({
      description:
        "Delete a tag entirely. This removes the tag but does not delete the contacts associated with it. Ask for confirmation before deleting.",
      execute: async ({ tagId }) => {
        const ctx = chatDomainContext(supabase, userId);
        const { data: tag } = await supabase.from("tags").select("label").eq("id", tagId).single();

        try {
          await deleteTag(ctx, tagId);
          return { message: `Deleted tag "${tag?.label ?? "(unknown)"}"` };
        } catch (error) {
          return formatToolDomainError(error, "Failed to delete tag");
        }
      },
      inputSchema: z.object({
        tagId: z.string().uuid().describe("The UUID of the tag to delete"),
      }),
    }),

    remove_tag_from_contacts: tool({
      description: "Remove a tag from one or more contacts. Does not delete the tag itself.",
      execute: async ({ tagId, personIds }) => {
        const ctx = chatDomainContext(supabase, userId);
        try {
          await removeTagMembers(ctx, tagId, personIds);
        } catch (error) {
          return formatToolDomainError(error, "Failed to remove tag from contacts");
        }

        const { data: people } = await supabase
          .from("people")
          .select("first_name, last_name")
          .in("id", personIds);

        const names =
          people?.map((p) => [p.first_name, p.last_name].filter(Boolean).join(" ")).join(", ") ??
          "unknown";

        return { message: `Removed tag from ${names}.`, tagId };
      },
      inputSchema: z.object({
        personIds: z.array(z.string().uuid()).min(1).describe("UUIDs of the contacts to untag"),
        tagId: z.string().uuid().describe("The UUID of the tag"),
      }),
    }),
    search_tags: tool({
      description: "Search tags by label. Returns all tags if no query is provided.",
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
            color: t.color,
            contactCount: countMap.get(t.id) ?? 0,
            id: t.id,
            label: t.label,
          })),
          totalFound: tags?.length ?? 0,
        };
      },
      inputSchema: z.object({
        limit: z.number().min(1).max(25).default(10).describe("Max results to return"),
        query: z.string().optional().describe("Free-text search across tag labels"),
      }),
    }),

    update_tag: tool({
      description: "Update an existing tag's label or color.",
      execute: async ({ tagId, label, color }) => {
        const ctx = chatDomainContext(supabase, userId);
        try {
          await updateTag(ctx, tagId, { color, label });
          return { message: "Tag updated successfully.", tagId };
        } catch (error) {
          return formatToolDomainError(error, "Failed to update tag");
        }
      },
      inputSchema: z.object({
        color: z.string().optional().describe("New hex color"),
        label: z.string().min(1).max(100).optional().describe("New tag label"),
        tagId: z.string().uuid().describe("The UUID of the tag to update"),
      }),
    }),
  };
}
