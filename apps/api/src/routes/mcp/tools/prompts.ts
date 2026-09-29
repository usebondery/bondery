import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

function userText(text: string) {
  return {
    messages: [
      {
        content: { text, type: "text" as const },
        role: "user" as const,
      },
    ],
  };
}

/**
 * User-facing MCP prompt templates. Names are intents, not CRUD verbs.
 */
export function registerMcpPrompts(server: McpServer): void {
  server.registerPrompt(
    "catch_up_on_contact",
    {
      argsSchema: z.object({
        name: z.string().min(1).max(200).describe("The person's name as you know it"),
      }),
      description: "Summarize who someone is and your recent history with them.",
      title: "Catch up on a contact",
    },
    ({ name }) =>
      userText(`Catch me up on ${name} in my Bondery CRM.

1. Call search_contacts with search set to that name (at most a few matches).
2. If several people match, ask which one before continuing.
3. Call get_contact with their personId.
4. Call get_important_dates, get_interactions, and get_contact_linkedin with that personId.
5. Summarize who they are, how we know each other, recent interactions, important dates, LinkedIn history if present, and anything I should remember before we next talk.
Do not dump the full address book.`),
  );

  server.registerPrompt(
    "brief_before_meeting",
    {
      argsSchema: z.object({
        name: z.string().min(1).max(200).describe("Who you are about to meet"),
      }),
      description: "Prepare a short briefing before you meet or call someone.",
      title: "Brief me before a meeting",
    },
    ({ name }) =>
      userText(`I am about to meet ${name}. Prepare a short briefing from my Bondery CRM.

Use search_contacts, then get_contact, get_interactions, and get_contact_linkedin.
Cover: who they are, last time we interacted, open threads from notes, and one suggested talking point.
Keep it brief.`),
  );

  server.registerPrompt(
    "save_new_contact",
    {
      argsSchema: z.object({
        firstName: z.string().min(1).max(50).describe("Given name"),
        headline: z.string().max(100).optional().describe("How you know them, or their role"),
        lastName: z.string().max(50).optional().describe("Family name"),
        notes: z.string().max(500).optional().describe("Anything to remember"),
      }),
      description: "Add someone you just met as a contact. Needs Full access.",
      title: "Save a new contact",
    },
    ({ firstName, lastName, headline, notes }) => {
      const lines = [
        `Add this person to my Bondery CRM as a new contact.`,
        `firstName: ${firstName}`,
      ];
      if (lastName) {
        lines.push(`lastName: ${lastName}`);
      }
      if (headline) {
        lines.push(`headline: ${headline}`);
      }
      if (notes) {
        lines.push(`notes: ${notes}`);
      }
      lines.push(
        `Call create_contact with those fields. You may also set phones, emails, addresses, and social handles on create_contact or update_contact ([] clears a list). Birthdays and other dates use update_important_dates. If a similar name already exists, call search_contacts first and ask whether to update the existing person (update_contact) instead of creating a duplicate.`,
        `This requires Full access (mcp:write).`,
      );
      return userText(lines.join("\n"));
    },
  );

  server.registerPrompt(
    "record_interaction",
    {
      argsSchema: z.object({
        date: z.string().describe("When it happened (YYYY-MM-DD)"),
        name: z.string().min(1).max(200).describe("Who you talked with"),
        notes: z.string().max(1000).optional().describe("What you talked about"),
        type: z
          .string()
          .max(80)
          .optional()
          .describe("Kind of interaction, e.g. Call, Coffee, Meeting, Email"),
      }),
      description: "Save a conversation, meeting, or note against a contact. Needs Full access.",
      title: "Record an interaction",
    },
    ({ name, date, type, notes }) =>
      userText(`Record an interaction in my Bondery CRM.

Person: ${name}
Date: ${date}
${type ? `Type: ${type}` : "Type: pick the closest of Call, Coffee, Email, Meal, Meeting, Networking event, Note, Other, Party/Social, Text/Messaging, Competition/Hackathon, Custom"}
${notes ? `Notes: ${notes}` : "Notes: none given — ask me if needed"}

Find them with search_contacts, then create_interaction with participantIds (their personId in an array), date, type, and optional title/description.
If several people match, ask which one. This requires Full access (mcp:write).`),
  );

  server.registerPrompt(
    "reach_out_today",
    {
      argsSchema: z.object({}),
      description: "See who is due for keep-in-touch and prepare a short outreach plan.",
      title: "Reach out today",
    },
    () =>
      userText(`Who should I reach out to today in my Bondery CRM?

1. Call get_keep_in_touch_count.
2. Call get_keep_in_touch_contacts (at most 25 people with a cadence).
3. For anyone I should contact, call get_contact and get_interactions.
4. Suggest a short outreach plan from notes and recent history.
Do not dump the full address book. Do not delete people or interactions.`),
  );

  server.registerPrompt(
    "organize_contact",
    {
      argsSchema: z.object({
        name: z.string().min(1).max(200).describe("The person's name as you know it"),
      }),
      description: "Find someone and add them to groups or tags. Needs Full access.",
      title: "Organize a contact",
    },
    ({ name }) =>
      userText(`Organize ${name} in my Bondery CRM.

1. Call search_contacts with search set to that name (at most a few matches).
2. If several people match, ask which one before continuing.
3. Call search_groups and/or search_tags to find existing labels.
4. Call create_group_membership and/or create_tag_membership with their personId.
If no matching group or tag exists, ask before create_group or create_tag.
This requires Full access (mcp:write).
Do not dump the full address book. Do not delete people or interactions.`),
  );
}
