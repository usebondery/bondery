import type { ShareableField } from "@bondery/schemas";

export const SHAREABLE_FIELDS: ShareableField[] = [
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

export type ShareableFieldPreviewSource = {
  addresses?: Array<{ addressFormatted?: string | null }> | null;
  avatar?: string | null;
  emails?: Array<{ type?: string | null; value?: string | null }> | null;
  facebook?: string | null;
  firstName?: string | null;
  headline?: string | null;
  importantDates?: Array<{ date?: string | null; type?: string | null }> | null;
  instagram?: string | null;
  lastName?: string | null;
  linkedin?: string | null;
  location?: string | null;
  notes?: string | null;
  phones?: Array<{ prefix?: string | null; type?: string | null; value?: string | null }> | null;
  signal?: string | null;
  website?: string | null;
  whatsapp?: string | null;
};

export type ShareableFieldPreview = {
  field: ShareableField;
  preview: string;
};

function previewForField(
  field: ShareableField,
  source: ShareableFieldPreviewSource,
): string | null {
  switch (field) {
    case "name":
      return [source.firstName, source.lastName].filter(Boolean).join(" ") || null;
    case "avatar":
      return source.avatar ? "Yes" : null;
    case "headline":
      return source.headline ?? null;
    case "phones":
      if (!Array.isArray(source.phones) || source.phones.length === 0) {
        return null;
      }
      return source.phones
        .map((phone) =>
          [phone.prefix, phone.value, phone.type ? `(${phone.type})` : ""]
            .filter(Boolean)
            .join(" "),
        )
        .join(", ");
    case "emails":
      if (!Array.isArray(source.emails) || source.emails.length === 0) {
        return null;
      }
      return source.emails
        .map((email) =>
          [email.value, email.type ? `(${email.type})` : ""].filter(Boolean).join(" "),
        )
        .join(", ");
    case "location":
      return source.location ?? null;
    case "linkedin":
      return source.linkedin ?? null;
    case "instagram":
      return source.instagram ?? null;
    case "facebook":
      return source.facebook ?? null;
    case "website":
      return source.website ?? null;
    case "whatsapp":
      return source.whatsapp ?? null;
    case "signal":
      return source.signal ?? null;
    case "addresses":
      if (!Array.isArray(source.addresses) || source.addresses.length === 0) {
        return null;
      }
      return (
        source.addresses
          .filter((address) => address.addressFormatted)
          .map((address) => address.addressFormatted)
          .join("; ") || null
      );
    case "notes":
      if (!source.notes) {
        return null;
      }
      return source.notes.length > 80 ? `${source.notes.substring(0, 80)}…` : source.notes;
    case "importantDates":
      return source.importantDates && source.importantDates.length > 0
        ? `${source.importantDates.length} date(s)`
        : null;
    default:
      return null;
  }
}

/** Which shareable fields have values, with a short preview string for each. */
export function buildShareableFieldPreviews(
  source: ShareableFieldPreviewSource,
): ShareableFieldPreview[] {
  return SHAREABLE_FIELDS.flatMap((field) => {
    const preview = previewForField(field, source);
    return preview ? [{ field, preview }] : [];
  });
}
