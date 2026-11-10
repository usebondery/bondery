import { z } from "zod";
import { CONTACT_LIMITS } from "#constants/index.js";
import { channelTypeSchema } from "#primitives/channel/schema.js";
import { emailAddressSchema } from "#primitives/email/schema.js";
import type {
  EmailEntry,
  EmailEntryInput,
  PhoneEntry,
  PhoneEntryInput,
  ShareContactEmailInput,
} from "./types.js";

const SHARE_CONTACT_EMAIL_MAX_RECIPIENTS = 10;
const SHARE_CONTACT_EMAIL_MAX_MESSAGE_LENGTH = 2000;

function refinePhoneEntryDigits(
  data: { value: string },
  context: z.core.$RefinementCtx<{ value: string }>,
) {
  if (data.value.replace(/\D/g, "").length === 0) {
    context.addIssue({
      code: "custom",
      message: "Phone number is required",
      path: ["value"],
    });
  }
}

export const phoneEntryEntitySchema = z.object({
  preferred: z.boolean().describe("True when this is the contact's primary phone number"),
  prefix: z
    .string()
    .trim()
    .min(1, { error: "Country code is required" })
    .describe("Country calling code, digits only"),
  type: channelTypeSchema.describe("Phone category, such as home or work"),
  value: z
    .string()
    .trim()
    .min(1, { error: "Phone number is required" })
    .describe("Phone number in local or international form"),
}) satisfies z.ZodType<PhoneEntry>;

const phoneEntryBaseSchema = phoneEntryEntitySchema.omit({ preferred: true });
const phoneEntryOptionalPreferredSchema = phoneEntryBaseSchema.extend({
  preferred: z
    .boolean()
    .optional()
    .describe("True when this is the contact's primary phone number"),
});

export const emailEntryEntitySchema = z.object({
  preferred: z.boolean().describe("True when this is the contact's primary email address"),
  type: channelTypeSchema.describe("Email category, such as home or work"),
  value: z.string().trim().min(1, { error: "Email is required" }).describe("Email address"),
}) satisfies z.ZodType<EmailEntry>;

const emailEntryBaseSchema = emailEntryEntitySchema.omit({ preferred: true });
const emailEntryOptionalPreferredSchema = emailEntryBaseSchema.extend({
  preferred: z
    .boolean()
    .optional()
    .describe("True when this is the contact's primary email address"),
});

/** Mobile phone sheet — subset of phone fields; pick must run before refinements. */
export const phoneEntrySheetSchema = phoneEntryOptionalPreferredSchema
  .pick({ prefix: true, type: true, value: true })
  .superRefine(refinePhoneEntryDigits);

/** Single phone row before PATCH /api/contacts/:id phones array. */
export const phoneEntryInputSchema =
  phoneEntryOptionalPreferredSchema.superRefine(refinePhoneEntryDigits);

export const phoneEntrySchema = phoneEntryInputSchema.transform((value) => ({
  ...value,
  preferred: value.preferred ?? false,
  prefix: value.prefix.trim(),
  value: value.value.replace(/\D/g, ""),
})) satisfies z.ZodType<PhoneEntryInput>;

/** Single email row before PATCH /api/contacts/:id emails array. */
export const emailEntryInputSchema = z.object({
  ...emailEntryOptionalPreferredSchema.shape,
  value: emailAddressSchema,
});

export const emailEntrySchema = emailEntryInputSchema.transform((value) => ({
  ...value,
  preferred: value.preferred ?? false,
  value: value.value.toLowerCase(),
})) satisfies z.ZodType<EmailEntryInput>;

export const replacePhonesSchema = z.array(phoneEntrySchema).max(CONTACT_LIMITS.maxPhones, {
  error: `Maximum of ${CONTACT_LIMITS.maxPhones} phone numbers allowed`,
});

export const replaceEmailsSchema = z.array(emailEntrySchema).max(CONTACT_LIMITS.maxEmails, {
  error: `Maximum of ${CONTACT_LIMITS.maxEmails} email addresses allowed`,
});

export const shareContactEmailSchema = z.object({
  message: z
    .string()
    .trim()
    .max(SHARE_CONTACT_EMAIL_MAX_MESSAGE_LENGTH, {
      error: `Message must be at most ${SHARE_CONTACT_EMAIL_MAX_MESSAGE_LENGTH} characters`,
    })
    .transform((value) => value || undefined)
    .optional()
    .describe("Optional note included in the share email"),
  recipients: z
    .array(emailAddressSchema)
    .min(1, { error: "At least one recipient is required" })
    .max(SHARE_CONTACT_EMAIL_MAX_RECIPIENTS, {
      error: `Maximum of ${SHARE_CONTACT_EMAIL_MAX_RECIPIENTS} recipients allowed`,
    })
    .superRefine((recipients, context) => {
      const unique = new Set(recipients);
      if (unique.size !== recipients.length) {
        context.addIssue({
          code: "custom",
          message: "Duplicate recipient emails are not allowed",
        });
      }
    })
    .describe("Email addresses that receive the shared contact"),
}) satisfies z.ZodType<ShareContactEmailInput>;
