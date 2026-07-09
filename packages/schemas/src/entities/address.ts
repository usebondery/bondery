import { z } from "zod";
import { CONTACT_FIELD_MAX_LENGTHS, CONTACT_LIMITS } from "#constants/index.js";
import { nullableTrimmedStringSchema } from "#entities/_shared.js";
export const contactAddressTypeSchema = z.enum(["home", "work", "other"]);
export const contactAddressGranularitySchema = z.enum(["address", "city", "state", "country"]);
export const contactAddressGeocodeSourceSchema = z.enum(["mapy.com", "manual"]);
export const contactAddressConfidenceSchema = z.enum(["verified", "unverifiable"]);

const optionalTrimmedString = nullableTrimmedStringSchema();

const addressCoreInputSchema = z.object({
  label: z
    .string()
    .trim()
    .max(CONTACT_FIELD_MAX_LENGTHS.addressLabel, {
      error: `Label must be at most ${CONTACT_FIELD_MAX_LENGTHS.addressLabel} characters`,
    })
    .transform((value) => value || null),
  type: contactAddressTypeSchema,
  value: z.string().trim().min(1, { error: "Address is required" }),
});

export const contactAddressSheetSchema = addressCoreInputSchema;

/** Read-model address shape (no input transforms — safe for Fastify response serialization). */
export const contactAddressReadSchema = z.object({
  addressCity: z.string().nullable(),
  addressCountry: z.string().nullable(),
  addressCountryCode: z.string().nullable(),
  addressFormatted: z.string().nullable(),
  addressGeocodeSource: contactAddressGeocodeSourceSchema.nullable(),
  addressGranularity: contactAddressGranularitySchema,
  addressLine1: z.string().nullable(),
  addressLine2: z.string().nullable(),
  addressPostalCode: z.string().nullable(),
  addressState: z.string().nullable(),
  addressStateCode: z.string().nullable(),
  geocodeConfidence: contactAddressConfidenceSchema.nullable(),
  label: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  timezone: z.string().nullable(),
  type: contactAddressTypeSchema,
  value: z.string(),
});

export const contactAddressEntrySchema = addressCoreInputSchema.extend({
  addressCity: optionalTrimmedString,
  addressCountry: optionalTrimmedString,
  addressCountryCode: optionalTrimmedString,
  addressFormatted: optionalTrimmedString,
  addressGeocodeSource: contactAddressGeocodeSourceSchema.nullable(),
  addressGranularity: contactAddressGranularitySchema,
  addressLine1: optionalTrimmedString,
  addressLine2: optionalTrimmedString,
  addressPostalCode: optionalTrimmedString,
  addressState: optionalTrimmedString,
  addressStateCode: optionalTrimmedString,
  geocodeConfidence: contactAddressConfidenceSchema.nullable(),
  label: optionalTrimmedString,
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  timezone: optionalTrimmedString,
});

export const geocodeSuggestAddressSchema = contactAddressEntrySchema;

export const replaceAddressesSchema = z
  .array(contactAddressEntrySchema)
  .max(CONTACT_LIMITS.maxAddresses, {
    error: `Maximum of ${CONTACT_LIMITS.maxAddresses} addresses allowed`,
  });

export type ContactAddressType = z.infer<typeof contactAddressTypeSchema>;
export type ContactAddressEntry = z.infer<typeof contactAddressEntrySchema>;
export type ContactAddressSheetInput = z.input<typeof contactAddressSheetSchema>;
export type ContactAddressSheetOutput = z.output<typeof contactAddressSheetSchema>;
export type ContactAddressEntryInput = z.input<typeof contactAddressEntrySchema>;
export type ContactAddressEntryOutput = z.output<typeof contactAddressEntrySchema>;
export type GeocodeSuggestAddressInput = z.input<typeof geocodeSuggestAddressSchema>;
export type GeocodeSuggestAddressOutput = z.output<typeof geocodeSuggestAddressSchema>;
export type ReplaceAddressesInput = z.infer<typeof replaceAddressesSchema>;
