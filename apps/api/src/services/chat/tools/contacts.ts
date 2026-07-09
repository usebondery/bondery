import { createSocialUrl } from "@bondery/helpers";
import type { Database } from "@bondery/schemas/supabase.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { tool } from "ai";
import { z } from "zod";
import { createContact } from "../../../domains/contacts/index.js";
import { searchPeopleIds } from "../../../lib/data/search.js";
import { resolveContactAvatarUrl } from "../../../lib/data/supabase.js";
import { chatDomainContext, formatToolDomainError } from "../domain-context.js";

type GroupJoinRow = {
  groups: {
    id: string;
    label: string;
    emoji: string | null;
    color: string | null;
  } | null;
};

type TagJoinRow = {
  tags: {
    id: string;
    label: string;
    color: string | null;
  } | null;
};

type LinkedInEducationRow = {
  degree: string | null;
  description: string | null;
  end_date: string | null;
  school_linkedin_id: string | null;
  school_name: string | null;
  start_date: string | null;
};

type LinkedInWorkRow = {
  company_linkedin_id: string | null;
  company_name: string | null;
  description: string | null;
  employment_type: string | null;
  end_date: string | null;
  location: string | null;
  start_date: string | null;
  title: string | null;
};

type LinkedInDetailRow = {
  bio: string | null;
  updated_at: string | null;
  people_education_history?: LinkedInEducationRow[] | null;
  people_work_history?: LinkedInWorkRow[] | null;
};

type SearchContactRow = {
  id: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  headline: string | null;
  location: string | null;
  language: string | null;
  last_interaction: string | null;
  keep_frequency_days: number | null;
  created_at: string | null;
  has_avatar: boolean;
  updated_at: string | null;
  people_tags?: Array<{ tags: { label: string; color: string | null } | null }> | null;
};

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
    addresses: addresses ?? [],
    avatar: resolveContactAvatarUrl(supabase, userId, {
      hasAvatar: person.has_avatar,
      id: person.id,
      updatedAt: person.updated_at,
    }),
    createdAt: person.created_at,
    emails: emails ?? [],
    firstName: person.first_name,
    fullName: [person.first_name, person.middle_name, person.last_name].filter(Boolean).join(" "),
    groups:
      groups
        ?.map((g: GroupJoinRow) => g.groups)
        .filter((g): g is NonNullable<GroupJoinRow["groups"]> => g != null)
        .map((g) => ({
          color: g.color,
          emoji: g.emoji,
          id: g.id,
          label: g.label,
        })) ?? [],
    headline: person.headline,
    id: person.id,
    importantDates: dates ?? [],
    keepFrequencyDays: person.keep_frequency_days,
    language: person.language,
    lastInteraction: person.last_interaction,
    lastName: person.last_name,
    linkedin: linkedin
      ? (() => {
          const linkedinDetail = linkedin as LinkedInDetailRow;
          return {
            bio: linkedin.bio,
            educationHistory:
              linkedinDetail.people_education_history?.map((e) => ({
                degree: e.degree,
                description: e.description,
                endDate: e.end_date,
                schoolLinkedinId: e.school_linkedin_id,
                schoolName: e.school_name,
                startDate: e.start_date,
              })) ?? [],
            updatedAt: linkedinDetail.updated_at,
            workHistory:
              linkedinDetail.people_work_history?.map((w) => ({
                companyLinkedinId: w.company_linkedin_id,
                companyName: w.company_name,
                description: w.description,
                employmentType: w.employment_type,
                endDate: w.end_date,
                location: w.location,
                startDate: w.start_date,
                title: w.title,
              })) ?? [],
          };
        })()
      : null,
    location: person.location,
    middleName: person.middle_name,
    notes: person.notes,
    phones: phones ?? [],
    socials:
      socials?.map((s) => ({
        handle: s.handle,
        platform: s.platform,
        url: createSocialUrl(s.platform, s.handle) || null,
      })) ?? [],
    tags:
      tags
        ?.map((t: TagJoinRow) => t.tags)
        .filter((t): t is NonNullable<TagJoinRow["tags"]> => t != null)
        .map((t) => ({ color: t.color, id: t.id, label: t.label })) ?? [],
    timezone: person.timezone,
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
    create_contact: tool({
      description:
        "Create a new contact. Returns the created contact's ID and a link to their page.",
      execute: async ({ firstName, lastName }) => {
        const ctx = chatDomainContext(supabase, userId);
        try {
          const { data } = await createContact(ctx, {
            firstName,
            lastName,
          });
          const contact = data.contact;
          const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
          return {
            fullName,
            id: data.personId,
            message: `Created contact "${fullName}"`,
          };
        } catch (error) {
          return formatToolDomainError(error, "Failed to create contact");
        }
      },
      inputSchema: z.object({
        firstName: z.string().min(1).max(50).describe("First name (required)"),
        headline: z.string().max(100).optional().describe("Headline or title"),
        language: z.string().max(5).optional().describe("Language code, e.g. 'en', 'cs', 'es'"),
        lastName: z.string().max(50).optional().describe("Last name"),
        location: z.string().max(100).optional().describe("Location"),
        notes: z.string().max(500).optional().describe("Notes about the contact"),
      }),
    }),

    get_contact_details: tool({
      description:
        "Get full details of a specific contact by ID, including phones, emails, addresses, tags, and social links.",
      execute: async ({ contactId }) => {
        return fetchContactDetails(supabase, userId, contactId);
      },
      inputSchema: z.object({
        contactId: z.string().uuid().describe("The contact's UUID"),
      }),
    }),

    get_myself_details: tool({
      description:
        "Get the full profile of the current user (their own 'myself' contact), including phones, emails, addresses, LinkedIn bio, work history, education, tags, and groups. Use this when the user asks about themselves.",
      execute: async () => {
        // people.id === user_id for the myself contact (DB invariant)
        return fetchContactDetails(supabase, userId, userId);
      },
      inputSchema: z.object({}),
    }),
    search_contacts: tool({
      description:
        "Search contacts by name, location, tag, language, or headline. Returns up to 10 matches.",
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

        let results = (contacts ?? []) as SearchContactRow[];

        if (tag) {
          results = results.filter((c) =>
            c.people_tags?.some((pt) => pt.tags?.label?.toLowerCase() === tag.toLowerCase()),
          );
        }

        return {
          contacts: results.map((c) => ({
            avatar: resolveContactAvatarUrl(supabase, userId, {
              hasAvatar: c.has_avatar,
              id: c.id,
              updatedAt: c.updated_at,
            }),
            firstName: c.first_name,
            fullName: [c.first_name, c.middle_name, c.last_name].filter(Boolean).join(" "),
            headline: c.headline,
            id: c.id,
            keepFrequencyDays: c.keep_frequency_days,
            language: c.language,
            lastInteraction: c.last_interaction,
            lastName: c.last_name,
            location: c.location,
            middleName: c.middle_name,
            tags: c.people_tags?.map((pt) => pt.tags?.label).filter(Boolean) ?? [],
          })),
          totalFound: results.length,
        };
      },
      inputSchema: z.object({
        language: z.string().optional().describe("Filter by language code, e.g. 'es' for Spanish"),
        limit: z.number().min(1).max(25).default(10).describe("Max results to return"),
        location: z.string().optional().describe("Filter by location (partial match)"),
        query: z
          .string()
          .optional()
          .describe("Free-text search across name, headline, location, and notes"),
        tag: z.string().optional().describe("Filter by tag label (exact match)"),
      }),
    }),
  };
}
