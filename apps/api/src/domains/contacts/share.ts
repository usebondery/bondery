import { ShareContactEmail } from "@bondery/emails";
import {
  buildShareableFieldPreviews,
  type ShareableFieldPreviewSource,
} from "@bondery/helpers/contact";
import type { ContactSharePreviewResponse, ShareableField } from "@bondery/schemas";
import { attachContactExtras, type FullContactExtras } from "../../lib/contacts/enrichment.js";
import { contactDetailSelect, mapContactDetailRecord } from "../../lib/data/prisma-mappers.js";
import { emailDocumentProps } from "../../lib/notifications/email-chrome.js";
import { buildShareContactCopy } from "../../lib/notifications/email-copy-builders.js";
import { formatEmailFrom } from "../../lib/notifications/email-from.js";
import {
  loadEmailNamespace,
  readCopyString,
  resolveEmailLocale,
} from "../../lib/notifications/email-i18n.js";
import { renderEmailParts } from "../../lib/notifications/render-email.js";
import {
  isEmailConfigured,
  requireEmailConfig,
  sendRenderedEmail,
} from "../../lib/notifications/transporter.js";
import { internal, notFound } from "../../lib/platform/errors/http-errors.js";
import { resolveContactAvatarUrl } from "../../lib/storage/avatar-urls.js";
import type { DomainContext } from "../_shared/context.js";
import { domainDb } from "../_shared/domain-db.js";

export type ShareContactInput = {
  message?: string;
  personId: string;
  recipientEmails: string[];
  selectedFields: ShareableField[];
  sendCopy?: boolean;
};

type ShareContext = Pick<DomainContext, "db" | "user">;

type EnrichedContact = FullContactExtras & {
  firstName?: string | null;
  headline?: string | null;
  lastName?: string | null;
  location?: string | null;
  notes?: string | null;
};

function unnamedContactFallback(): string {
  return "Unnamed contact";
}

export function buildContactSharePreview(
  personId: string,
  source: ShareableFieldPreviewSource,
): ContactSharePreviewResponse {
  const contactName =
    [source.firstName, source.lastName].filter(Boolean).join(" ") || unnamedContactFallback();
  return {
    availableFields: buildShareableFieldPreviews(source),
    contactId: personId,
    contactName,
  };
}

function sharePreviewSource(
  enriched: EnrichedContact,
  importantDates: { date: string; type: string }[],
): ShareableFieldPreviewSource {
  return {
    addresses: enriched.addresses,
    avatar: enriched.avatar,
    emails: enriched.emails,
    facebook: enriched.facebook,
    firstName: enriched.firstName,
    headline: enriched.headline,
    importantDates,
    instagram: enriched.instagram,
    lastName: enriched.lastName,
    linkedin: enriched.linkedin,
    location: enriched.location,
    notes: enriched.notes,
    phones: enriched.phones,
    signal: enriched.signal,
    website: enriched.website,
    whatsapp: enriched.whatsapp,
  };
}

async function loadEnrichedShareContact(ctx: ShareContext, personId: string) {
  const { user } = ctx;
  const db = domainDb(ctx as DomainContext);

  const contactRow = await db.people.findFirst({
    select: contactDetailSelect,
    where: { id: personId, userId: user.id },
  });

  if (!contactRow) {
    throw notFound("Contact not found", "contact_not_found");
  }

  const mappedContact = mapContactDetailRecord(contactRow);

  const enriched = await attachContactExtras(db, user.id, [mappedContact], {
    addresses: true,
  })
    .then(([result]) => result)
    .catch(() => null);

  if (!enriched) {
    throw internal("contact_share_failed");
  }

  const importantDatesRaw = await db.peopleImportantDate.findMany({
    select: { date: true, type: true },
    where: { personId, userId: user.id },
  });

  const importantDates = importantDatesRaw.map((entry) => ({
    date: entry.date.toISOString().slice(0, 10),
    type: entry.type,
  }));

  return { enriched, importantDates };
}

/**
 * Returns an enriched preview of a contact's shareable fields.
 */
export async function getContactSharingPreview(
  ctx: ShareContext,
  personId: string,
): Promise<ContactSharePreviewResponse> {
  const { enriched, importantDates } = await loadEnrichedShareContact(ctx, personId);
  return buildContactSharePreview(personId, sharePreviewSource(enriched, importantDates));
}

/**
 * Sends a contact share email to one or more recipients.
 * Reads SMTP configuration from environment variables.
 */
export async function shareContact(
  ctx: ShareContext,
  input: ShareContactInput,
): Promise<{ success: true }> {
  const { user } = ctx;
  const db = domainDb(ctx as DomainContext);
  const { personId, recipientEmails, message, selectedFields } = input;

  const myselfContact = await db.people.findFirst({
    select: {
      firstName: true,
      hasAvatar: true,
      lastName: true,
      middleName: true,
      updatedAt: true,
    },
    where: { myself: true, userId: user.id },
  });
  const senderName =
    [myselfContact?.firstName, myselfContact?.middleName, myselfContact?.lastName]
      .filter(Boolean)
      .join(" ") || user.email;

  const { enriched, importantDates } = await loadEnrichedShareContact(ctx, personId);

  const contactName =
    [enriched.firstName || "", enriched.lastName || ""].filter(Boolean).join(" ") ||
    unnamedContactFallback();

  const has = (field: ShareableField) => field === "headline" || selectedFields.includes(field);
  const phones = has("phones") && Array.isArray(enriched.phones) ? enriched.phones : undefined;
  const emails = has("emails") && Array.isArray(enriched.emails) ? enriched.emails : undefined;

  const emailProps = {
    addresses: has("addresses")
      ? enriched.addresses
          ?.filter((address) => address.addressFormatted)
          .map((address) => ({ formatted: address.addressFormatted ?? undefined }))
      : undefined,
    contactAvatarUrl: enriched.avatar ?? undefined,
    contactName,
    emails: emails?.map((email) => ({
      type: email.type || undefined,
      value: email.value,
    })),
    facebook: has("facebook") ? (enriched.facebook ?? undefined) : undefined,
    headline: has("headline") ? (enriched.headline ?? undefined) : undefined,
    importantDates:
      has("importantDates") && importantDates.length > 0
        ? importantDates.map((entry) => ({
            date: entry.date,
            label: entry.type,
            type: entry.type,
          }))
        : undefined,
    instagram: has("instagram") ? (enriched.instagram ?? undefined) : undefined,
    linkedin: has("linkedin") ? (enriched.linkedin ?? undefined) : undefined,
    location: has("location") ? (enriched.location ?? undefined) : undefined,
    message: message || undefined,
    notes: has("notes") ? (enriched.notes ?? undefined) : undefined,
    phones: phones?.map((phone) => ({
      prefix: phone.prefix || undefined,
      type: phone.type || undefined,
      value: phone.value,
    })),
    recipientEmail: recipientEmails[0],
    senderAvatarUrl:
      resolveContactAvatarUrl(user.id, {
        hasAvatar: myselfContact?.hasAvatar ?? false,
        id: user.id,
        updatedAt: myselfContact?.updatedAt?.toISOString(),
      }) ?? undefined,
    senderEmail: user.email,
    senderName,
    signal: has("signal") ? (enriched.signal ?? undefined) : undefined,
    website: has("website") ? (enriched.website ?? undefined) : undefined,
    whatsapp: has("whatsapp") ? (enriched.whatsapp ?? undefined) : undefined,
  };

  const lng = await resolveEmailLocale(user.id);
  const bundle = loadEmailNamespace(lng, "ShareContactEmailBody");
  const copy = buildShareContactCopy(bundle);
  const subject = readCopyString(bundle, "subject", {
    contactName,
    senderName,
  });

  if (!isEmailConfigured()) {
    throw internal("email_service_not_configured");
  }

  const config = requireEmailConfig();

  let html: string;
  let text: string;
  try {
    ({ html, text } = await renderEmailParts(
      ShareContactEmail({
        ...emailDocumentProps(lng, subject),
        ...emailProps,
        copy,
      }),
    ));
  } catch {
    throw internal("contact_share_email_render_failed");
  }

  try {
    await sendRenderedEmail({
      cc: user.email,
      from: formatEmailFrom(config.fromAddress),
      html,
      replyTo: user.email,
      subject,
      text,
      to: recipientEmails.join(", "),
    });
  } catch {
    throw internal("contact_share_email_send_failed");
  }

  return { success: true };
}
