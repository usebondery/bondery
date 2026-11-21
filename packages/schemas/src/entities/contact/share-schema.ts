import { z } from "zod";
import type {
  ContactShareFieldPreview,
  ContactSharePreviewResponse,
  ShareableField,
} from "./types.js";

export const shareableFieldSchema = z
  .enum([
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
  ])
  .describe("Contact field that can be included in a share") satisfies z.ZodType<ShareableField>;

export const contactShareFieldPreviewSchema = z.object({
  field: shareableFieldSchema,
  preview: z.string().describe("Short preview of this field for the share picker"),
}) satisfies z.ZodType<ContactShareFieldPreview>;

export const contactSharePreviewResponseSchema = z.object({
  availableFields: z
    .array(contactShareFieldPreviewSchema)
    .describe("Fields available to include in the share"),
  contactId: z.string().describe("Contact identifier"),
  contactName: z.string().describe("Display name of the contact"),
}) satisfies z.ZodType<ContactSharePreviewResponse>;
