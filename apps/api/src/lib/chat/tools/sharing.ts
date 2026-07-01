import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@bondery/schemas/supabase.types";
import { getContactSharingPreview, shareContact } from "../../../routes/contacts/share/lib.js";

/**
 * Creates sharing-related tools for the AI chat agent.
 * All data access is scoped to the authenticated user via RLS.
 *
 * @param supabase - Authenticated Supabase client (RLS-enforced).
 * @param userId - The authenticated user's ID.
 * @param userEmail - The authenticated user's email address, used as sender and reply-to.
 * @returns An object of AI SDK tools for contact sharing.
 */
export function createSharingTools(
  supabase: SupabaseClient<Database>,
  userId: string,
  userEmail: string,
) {
  return {
    prepare_contact_for_sharing: tool({
      description:
        "Fetches a contact's available shareable fields with preview values. Always call this before share_contact — use the results to show the user what data is available and ask which fields and recipients they want.",
      inputSchema: z.object({
        personId: z.string().describe("The UUID of the contact to preview"),
      }),
      execute: async ({ personId }) => {
        return getContactSharingPreview(supabase, userId, personId);
      },
    }),

    share_contact: tool({
      description:
        "Sends a contact card via email to one or more recipients. Only call this after the user has confirmed the recipient emails, selected fields, and whether they want a copy.",
      inputSchema: z.object({
        personId: z.string().describe("The UUID of the contact to share"),
        recipientEmails: z
          .array(z.string().email())
          .min(1)
          .max(10)
          .describe("Email addresses to send the contact to"),
        message: z
          .string()
          .max(2000)
          .optional()
          .describe("Optional personal message to include in the email"),
        selectedFields: z
          .array(
            z.enum([
              "name",
              "avatar",
              "headline",
              "phones",
              "emails",
              "location",
              "linkedin",
              "instagram",
              "facebook",
              "website",
              "whatsapp",
              "signal",
              "addresses",
              "notes",
              "importantDates",
            ]),
          )
          .min(1)
          .describe("Which contact fields to include in the shared email"),
      }),
      execute: async ({ personId, recipientEmails, message, selectedFields }) => {
        return shareContact(
          supabase,
          { id: userId, email: userEmail },
          {
            personId,
            recipientEmails,
            message,
            selectedFields,
          },
        );
      },
    }),
  };
}
