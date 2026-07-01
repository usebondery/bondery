import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@bondery/schemas/supabase.types";
import { createSocialUrl } from "@bondery/helpers";
import { resolveContactAvatarUrl } from "../../supabase";
import { searchPeopleIds } from "../../search";

/**
 * Fetches full details for a single contact by ID.
 * Reused by both get_contact_details and get_myself_details tools.
 */
async function fetchContactDetails(
  supabase: SupabaseClient<Database>,
  userId: string,
  contactId: string,
) {
  const [
    { data: person, error: personError },
    { data: phones },
    { data: emails },
    { data: tags },
    { data: addresses },
    { data: socials },
    { data: dates },
    { data: groups },
    { data: linkedin },
  ] = await Promise.all([
    supabase.from("people").select("*").eq("id", contactId).single(),
    supabase
      .from("people_phones")
      .select("prefix, value, type, preferred")
      .eq("person_id", contactId),
    supabase.from("people_emails").select("value, type, preferred").eq("person_id", contactId),
    supabase
      .from("people_tags")
      .select("tag_id, tags ( id, label, color )")
      .eq("person_id", contactId),
    supabase.from("people_addresses").select("*").eq("person_id", contactId),
    supabase.from("people_socials").select("platform, handle").eq("person_id", contactId),
    supabase.from("people_important_dates").select("*").eq("person_id", contactId),
    supabase
      .from("people_groups")
      .select("group_id, groups:groups ( id, label, emoji, color )")
      .eq("person_id", contactId),
    supabase
      .from("people_linkedin")
      .select(
        "bio, updated_at, people_work_history ( company_name, company_linkedin_id, title, employment_type, start_date, end_date, location, description ), people_education_history ( school_name, school_linkedin_id, degree, start_date, end_date, description )",
      )
      .eq("person_id", contactId)
      .maybeSingle(),
  ]);

  if (personError || !person) {
    return { error: "Contact not found" };
  }

  return {
    id: person.id,
    firstName: person.first_name,
    middleName: person.middle_name,
    lastName: person.last_name,
    avatar: resolveContactAvatarUrl(supabase, userId, {
      id: person.id,
      hasAvatar: person.has_avatar,
      updatedAt: person.updated_at,
    }),
    fullName: [person.first_name, person.middle_name, person.last_name].filter(Boolean).join(" "),
    headline: person.headline,
    location: person.location,
    language: person.language,
    timezone: person.timezone,
    notes: person.notes,
    lastInteraction: person.last_interaction,
    keepFrequencyDays: person.keep_frequency_days,
    createdAt: person.created_at,
    phones: phones ?? [],
    emails: emails ?? [],
    tags:
      tags
        ?.map((t: any) => t.tags)
        .filter(Boolean)
        .map((t: any) => ({ id: t.id, label: t.label, color: t.color })) ?? [],
    groups:
      groups
        ?.map((g: any) => g.groups)
        .filter(Boolean)
        .map((g: any) => ({
          id: g.id,
          label: g.label,
          emoji: g.emoji,
          color: g.color,
        })) ?? [],
    addresses: addresses ?? [],
    socials:
      socials?.map((s: any) => ({
        platform: s.platform,
        handle: s.handle,
        url: createSocialUrl(s.platform, s.handle) || null,
      })) ?? [],
    importantDates: dates ?? [],
    linkedin: linkedin
      ? {
          bio: linkedin.bio,
          updatedAt: (linkedin as any).updated_at,
          workHistory:
            (linkedin as any).people_work_history?.map((w: any) => ({
              companyName: w.company_name,
              companyLinkedinId: w.company_linkedin_id,
              title: w.title,
              employmentType: w.employment_type,
              startDate: w.start_date,
              endDate: w.end_date,
              location: w.location,
              description: w.description,
            })) ?? [],
          educationHistory:
            (linkedin as any).people_education_history?.map((e: any) => ({
              schoolName: e.school_name,
              schoolLinkedinId: e.school_linkedin_id,
              degree: e.degree,
              startDate: e.start_date,
              endDate: e.end_date,
              description: e.description,
            })) ?? [],
        }
      : null,
  };
}

/**
 * Creates contact-related tools for the AI chat agent.
 * All queries are scoped to the authenticated user via RLS.
 *
 * @param supabase - Authenticated Supabase client (RLS-enforced).
 * @param userId - The authenticated user's ID, used to build avatar URLs.
 * @returns An object of AI SDK tools for contact operations.
 */
export function createContactTools(supabase: SupabaseClient<Database>, userId: string) {
  return {
    search_contacts: tool({
      description:
        "Search contacts by name, location, tag, language, or headline. Returns up to 10 matches.",
      inputSchema: z.object({
        query: z
          .string()
          .optional()
          .describe("Free-text search across name, headline, location, and notes"),
        tag: z.string().optional().describe("Filter by tag label (exact match)"),
        language: z.string().optional().describe("Filter by language code, e.g. 'es' for Spanish"),
        location: z.string().optional().describe("Filter by location (partial match)"),
        limit: z.number().min(1).max(25).default(10).describe("Max results to return"),
      }),
      execute: async ({ query, tag, language, location, limit }) => {
        // When a free-text query is provided, use the fuzzy search RPC (pg_trgm)
        // for typo-tolerant, accent-insensitive name matching. Then load full data
        // for the matched IDs.
        let matchedIds: string[] | null = null;

        if (query) {
          const { ranked } = await searchPeopleIds(supabase, userId, query, limit);

          if (ranked && ranked.length > 0) {
            matchedIds = ranked.map((r) => r.id);
          } else {
            // Fallback: ilike search across headline, location, notes
            const searchPattern = `%${query}%`;
            const { data: fallback } = await supabase
              .from("people")
              .select("id")
              .eq("myself", false)
              .or(
                `headline.ilike.${searchPattern},location.ilike.${searchPattern},notes.ilike.${searchPattern}`,
              )
              .limit(limit);

            if (fallback && fallback.length > 0) {
              matchedIds = fallback.map((r) => r.id);
            } else {
              matchedIds = [];
            }
          }
        }

        let dbQuery = supabase
          .from("people")
          .select(
            `
            id, first_name, middle_name, last_name, headline, location, language,
            last_interaction, keep_frequency_days, created_at, has_avatar, updated_at,
            people_tags ( tags ( label, color ) )
          `,
          )
          .eq("myself", false)
          .order("first_name", { ascending: true })
          .limit(limit);

        if (matchedIds !== null) {
          if (matchedIds.length === 0) {
            return { contacts: [], totalFound: 0 };
          }
          dbQuery = dbQuery.in("id", matchedIds);
        }

        if (language) {
          dbQuery = dbQuery.eq("language", language);
        }

        if (location) {
          dbQuery = dbQuery.ilike("location", `%${location}%`);
        }

        const { data: contacts, error } = await dbQuery;

        if (error) {
          return { error: `Failed to search contacts: ${error.message}` };
        }

        let results = contacts ?? [];

        if (tag) {
          results = results.filter((c: any) =>
            c.people_tags?.some((pt: any) => pt.tags?.label?.toLowerCase() === tag.toLowerCase()),
          );
        }

        return {
          contacts: results.map((c: any) => ({
            id: c.id,
            firstName: c.first_name,
            middleName: c.middle_name,
            lastName: c.last_name,
            avatar: resolveContactAvatarUrl(supabase, userId, {
              id: c.id,
              hasAvatar: c.has_avatar,
              updatedAt: c.updated_at,
            }),
            fullName: [c.first_name, c.middle_name, c.last_name].filter(Boolean).join(" "),
            headline: c.headline,
            location: c.location,
            language: c.language,
            lastInteraction: c.last_interaction,
            keepFrequencyDays: c.keep_frequency_days,
            tags: c.people_tags?.map((pt: any) => pt.tags?.label).filter(Boolean) ?? [],
          })),
          totalFound: results.length,
        };
      },
    }),

    get_contact_details: tool({
      description:
        "Get full details of a specific contact by ID, including phones, emails, addresses, tags, and social links.",
      inputSchema: z.object({
        contactId: z.string().uuid().describe("The contact's UUID"),
      }),
      execute: async ({ contactId }) => {
        return fetchContactDetails(supabase, userId, contactId);
      },
    }),

    get_myself_details: tool({
      description:
        "Get the full profile of the current user (their own 'myself' contact), including phones, emails, addresses, LinkedIn bio, work history, education, tags, and groups. Use this when the user asks about themselves.",
      inputSchema: z.object({}),
      execute: async () => {
        // people.id === user_id for the myself contact (DB invariant)
        return fetchContactDetails(supabase, userId, userId);
      },
    }),

    create_contact: tool({
      description:
        "Create a new contact. Returns the created contact's ID and a link to their page.",
      inputSchema: z.object({
        firstName: z.string().min(1).max(50).describe("First name (required)"),
        lastName: z.string().max(50).optional().describe("Last name"),
        headline: z.string().max(100).optional().describe("Headline or title"),
        location: z.string().max(100).optional().describe("Location"),
        language: z.string().max(5).optional().describe("Language code, e.g. 'en', 'cs', 'es'"),
        notes: z.string().max(500).optional().describe("Notes about the contact"),
      }),
      execute: async ({ firstName, lastName, headline, location, language, notes }) => {
        const { data, error } = await supabase
          .from("people")
          .insert({
            first_name: firstName,
            last_name: lastName ?? null,
            headline: headline ?? null,
            location: location ?? null,
            language: language ?? null,
            notes: notes ?? null,
            user_id: userId,
          })
          .select("id, first_name, last_name")
          .single();

        if (error) {
          return { error: `Failed to create contact: ${error.message}` };
        }

        const fullName = [data.first_name, data.last_name].filter(Boolean).join(" ");

        return {
          id: data.id,
          fullName,
          message: `Created contact "${fullName}"`,
        };
      },
    }),
  };
}
