import { z } from "zod";
import { CONTACT_LIMITS } from "#constants/index.js";
import { channelTypeSchema } from "#primitives/index.js";

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
  preferred: z.boolean(),
  prefix: z.string().trim().min(1, { error: "Country code is required" }),
  type: channelTypeSchema,
  value: z.string().trim().min(1, { error: "Phone number is required" }),
});

const phoneEntryBaseSchema = phoneEntryEntitySchema.omit({ preferred: true });
const phoneEntryOptionalPreferredSchema = phoneEntryBaseSchema.extend({
  preferred: z.boolean().optional(),
});

export const emailEntryEntitySchema = z.object({
  preferred: z.boolean(),
  type: channelTypeSchema,
  value: z.string().trim().min(1, { error: "Email is required" }),
});

const emailEntryBaseSchema = emailEntryEntitySchema.omit({ preferred: true });
const emailEntryOptionalPreferredSchema = emailEntryBaseSchema.extend({
  preferred: z.boolean().optional(),
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
  prefix: value.prefix || "+1",
  value: value.value.replace(/\D/g, ""),
}));

/** Single email row before PATCH /api/contacts/:id emails array. */
export const emailEntryInputSchema = z.object({
  ...emailEntryOptionalPreferredSchema.shape,
  value: emailEntryOptionalPreferredSchema.shape.value.email({
    error: "Enter a valid email address",
  }),
});

export const emailEntrySchema = emailEntryInputSchema.transform((value) => ({
  ...value,
  preferred: value.preferred ?? false,
  value: value.value.toLowerCase(),
}));

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
    .optional(),
  recipients: z
    .array(
      z
        .string()
        .trim()
        .email({ error: "Enter a valid email address" })
        .transform((value) => value.toLowerCase()),
    )
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
    }),
});

export type ContactType = z.infer<typeof channelTypeSchema>;
export type PhoneEntry = z.infer<typeof phoneEntryEntitySchema>;
export type EmailEntry = z.infer<typeof emailEntryEntitySchema>;
export type PhoneEntryInput = z.infer<typeof phoneEntrySchema>;
export type EmailEntryInput = z.infer<typeof emailEntrySchema>;
export type ShareContactEmailInput = z.infer<typeof shareContactEmailSchema>;
