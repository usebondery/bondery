import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@bondery/schemas/supabase.types";
import type { ShareableField } from "@bondery/schemas";
import { CONTACT_SELECT } from "../../../lib/queries.js";
import { resolveContactAvatarUrl } from "../../../lib/supabase.js";
import {
  attachContactExtras,
  type FullContactExtras,
} from "../../../lib/contact-enrichment.js";
import nodemailer from "nodemailer";
import { render } from "@react-email/render";
import { ShareContactEmail } from "@bondery/emails";

export type ShareContactInput = {
  personId: string;
  recipientEmails: string[];
  message?: string;
  selectedFields: ShareableField[];
};

export type ShareContactResult =
  | { success: true }
  | { error: string; status: number };

export type ContactSharingPreview =
  | {
      contactId: string;
      contactName: string;
      availableFields: { field: ShareableField; preview: string }[];
    }
  | { error: string; status: number };
/** Combined type of a contact row (from CONTACT_SELECT) plus enrichment extras. */
type EnrichedContact = FullContactExtras & {
  firstName?: string | null;
  lastName?: string | null;
  headline?: string | null;
  location?: string | null;
  notes?: string | null;
};

const ALL_SHAREABLE_FIELDS: ShareableField[] = [
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
];

function buildFieldPreview(
  field: ShareableField,
  enriched: EnrichedContact,
  importantDates: { type: string; date: string }[],
): string | null {
  switch (field) {
    case "name":
      return (
        [enriched.firstName, enriched.lastName].filter(Boolean).join(" ") ||
        null
      );
    case "avatar":
      return enriched.avatar ? "Yes" : null;
    case "headline":
      return enriched.headline ?? null;
    case "phones":
      if (!Array.isArray(enriched.phones) || enriched.phones.length === 0)
        return null;
      return enriched.phones
        .map((p) =>
          [p.prefix, p.value, p.type ? `(${p.type})` : ""]
            .filter(Boolean)
            .join(" "),
        )
        .join(", ");
    case "emails":
      if (!Array.isArray(enriched.emails) || enriched.emails.length === 0)
        return null;
      return enriched.emails
        .map((e) =>
          [e.value, e.type ? `(${e.type})` : ""].filter(Boolean).join(" "),
        )
        .join(", ");
    case "location":
      return enriched.location ?? null;
    case "linkedin":
      return enriched.linkedin ?? null;
    case "instagram":
      return enriched.instagram ?? null;
    case "facebook":
      return enriched.facebook ?? null;
    case "website":
      return enriched.website ?? null;
    case "whatsapp":
      return enriched.whatsapp ?? null;
    case "signal":
      return enriched.signal ?? null;
    case "addresses":
      if (!Array.isArray(enriched.addresses) || enriched.addresses.length === 0)
        return null;
      return (
        enriched.addresses
          .filter((a) => a.addressFormatted)
          .map((a) => a.addressFormatted)
          .join("; ") || null
      );
    case "notes":
      if (!enriched.notes) return null;
      return enriched.notes.length > 80
        ? enriched.notes.substring(0, 80) + "…"
        : enriched.notes;
    case "importantDates":
      return importantDates.length > 0
        ? `${importantDates.length} date(s)`
        : null;
    default:
      return null;
  }
}

/**
 * Returns an enriched preview of a contact's shareable fields.
 * Used by the AI tool to show the user what data can be included before sharing.
 *
 * @param client - Authenticated Supabase client (RLS-enforced).
 * @param userId - The authenticated user's ID.
 * @param personId - The contact to preview.
 */
export async function getContactSharingPreview(
  client: SupabaseClient<Database>,
  userId: string,
  personId: string,
): Promise<ContactSharingPreview> {
  const { data: contactRow, error: contactError } = await client
    .from("people")
    .select(CONTACT_SELECT)
    .eq("id", personId)
    .eq("user_id", userId)
    .single();

  if (contactError || !contactRow) {
    return { error: "Contact not found", status: 404 };
  }

  const enriched = await attachContactExtras(client, userId, [contactRow], {
    addresses: true,
  })
    .then(([result]) => result)
    .catch(() => null);

  if (!enriched) {
    return { error: "Failed to load contact data", status: 500 };
  }

  const { data: importantDatesRaw } = await client
    .from("people_important_dates")
    .select("type, date")
    .eq("person_id", personId)
    .eq("user_id", userId);

  const importantDates = importantDatesRaw ?? [];

  const contactName =
    [enriched.firstName, enriched.lastName].filter(Boolean).join(" ") ||
    "Unnamed contact";

  const availableFields = ALL_SHAREABLE_FIELDS.flatMap((field) => {
    const preview = buildFieldPreview(field, enriched, importantDates);
    return preview ? [{ field, preview }] : [];
  });

  return { contactId: personId, contactName, availableFields };
}

/**
 * Sends a contact share email to one or more recipients.
 * Reads SMTP configuration from environment variables.
 *
 * @param client - Authenticated Supabase client (RLS-enforced).
 * @param user - The authenticated user sending the share.
 * @param input - Share parameters (recipients, fields, etc.).
 * @returns `{ success: true }` on success, or `{ error, status }` on failure.
 */
export async function shareContact(
  client: SupabaseClient<Database>,
  user: { id: string; email: string },
  input: ShareContactInput,
): Promise<ShareContactResult> {
  const { personId, recipientEmails, message, selectedFields } = input;

  // Fetch sender's display name from myself contact
  const { data: myselfContact } = await client
    .from("people")
    .select("first_name, middle_name, last_name, has_avatar, updated_at")
    .eq("user_id", user.id)
    .eq("myself", true)
    .single();
  const senderName =
    [
      myselfContact?.first_name,
      myselfContact?.middle_name,
      myselfContact?.last_name,
    ]
      .filter(Boolean)
      .join(" ") || user.email;

  // Fetch the contact (RLS ensures user can only access their own)
  const { data: contactRow, error: contactError } = await client
    .from("people")
    .select(CONTACT_SELECT)
    .eq("id", personId)
    .eq("user_id", user.id)
    .single();

  if (contactError || !contactRow) {
    return { error: "Contact not found", status: 404 };
  }

  // Enrich with channels, social media, and addresses
  const enriched = await attachContactExtras(client, user.id, [contactRow], {
    addresses: true,
  })
    .then(([result]) => result)
    .catch(() => null);

  if (!enriched) {
    return { error: "Failed to prepare contact data", status: 500 };
  }

  // Fetch important dates
  const { data: importantDatesRaw } = await client
    .from("people_important_dates")
    .select("type, date")
    .eq("person_id", personId)
    .eq("user_id", user.id);

  const importantDates = (importantDatesRaw ?? []).map((d) => ({
    label: d.type,
    date: d.date,
    type: d.type,
  }));

  // Build the contact name
  const contactName =
    [enriched.firstName || "", enriched.lastName || ""]
      .filter(Boolean)
      .join(" ") || "Unnamed contact";

  // Build email props based on selected fields
  const has = (field: ShareableField) =>
    field === "headline" || selectedFields.includes(field);
  const phones =
    has("phones") && Array.isArray(enriched.phones)
      ? enriched.phones
      : undefined;
  const emails =
    has("emails") && Array.isArray(enriched.emails)
      ? enriched.emails
      : undefined;

  const emailProps = {
    senderName,
    senderEmail: user.email,
    recipientEmail: recipientEmails[0],
    senderAvatarUrl:
      resolveContactAvatarUrl(client, user.id, {
        id: user.id,
        hasAvatar: myselfContact?.has_avatar ?? false,
        updatedAt: myselfContact?.updated_at ?? null,
      }) ?? undefined,
    message: message || undefined,
    contactName,
    contactAvatarUrl: enriched.avatar ?? undefined,
    headline: has("headline") ? (enriched.headline ?? undefined) : undefined,
    phones: phones?.map((p) => ({
      value: p.value,
      prefix: p.prefix || undefined,
      type: p.type || undefined,
    })),
    emails: emails?.map((e) => ({
      value: e.value,
      type: e.type || undefined,
    })),
    location: has("location") ? (enriched.location ?? undefined) : undefined,
    linkedin: has("linkedin") ? (enriched.linkedin ?? undefined) : undefined,
    instagram: has("instagram") ? (enriched.instagram ?? undefined) : undefined,
    facebook: has("facebook") ? (enriched.facebook ?? undefined) : undefined,
    website: has("website") ? (enriched.website ?? undefined) : undefined,
    whatsapp: has("whatsapp") ? (enriched.whatsapp ?? undefined) : undefined,
    signal: has("signal") ? (enriched.signal ?? undefined) : undefined,
    addresses: has("addresses")
      ? enriched.addresses
          ?.filter((a) => a.addressFormatted)
          .map((a) => ({ formatted: a.addressFormatted ?? undefined }))
      : undefined,
    notes: has("notes") ? (enriched.notes ?? undefined) : undefined,
    importantDates:
      has("importantDates") && importantDates.length > 0
        ? importantDates
        : undefined,
  };

  // Validate SMTP configuration
  const smtpHost = process.env.PRIVATE_EMAIL_HOST;
  const smtpUser = process.env.PRIVATE_EMAIL_USER;
  const smtpPass = process.env.PRIVATE_EMAIL_PASS;
  const smtpAddress = process.env.PRIVATE_EMAIL_ADDRESS;
  const smtpPort = Number(process.env.PRIVATE_EMAIL_PORT ?? 587);

  if (!smtpHost || !smtpUser) {
    return { error: "Email service is not configured", status: 500 };
  }

  // Render email template
  let emailHtml: string;
  try {
    emailHtml = await render(ShareContactEmail(emailProps));
  } catch {
    return { error: "Failed to render email", status: 500 };
  }

  // Send email
  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: false,
      auth: { user: smtpUser, pass: smtpPass },
      tls: { rejectUnauthorized: false },
    });

    const mailOptions: nodemailer.SendMailOptions = {
      from: `Bondery <${smtpAddress}>`,
      to: recipientEmails.join(", "),
      replyTo: user.email,
      subject: `${senderName} shared a contact with you • ${contactName}`,
      html: emailHtml,
    };

    mailOptions.cc = user.email;

    await transporter.sendMail(mailOptions);
  } catch {
    return { error: "Failed to send email", status: 500 };
  }

  return { success: true };
}
