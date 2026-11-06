import { z } from "zod";
import { CONTACT_FIELD_MAX_LENGTHS, CONTACT_LIMITS } from "#constants/index.js";
import { nullableTrimmedStringSchema } from "../_shared/schema.js";
import type {
  ContactAddressEntryOutput,
  ContactAddressRead,
  ContactAddressSheetOutput,
  ReplaceAddressesInput,
} from "./types.js";

const optionalTrimmedString = nullableTrimmedStringSchema();

export const contactAddressTypeSchema = z.enum(["home", "work", "other"]);

export const contactAddressGranularitySchema = z.enum(["address", "city", "state", "country"]);

export const contactAddressGeocodeSourceSchema = z.enum(["mapy.com", "manual"]);

export const contactAddressConfidenceSchema = z.enum(["verified", "unverifiable"]);

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

export const contactAddressSheetSchema =
  addressCoreInputSchema satisfies z.ZodType<ContactAddressSheetOutput>;

/** Read-model address shape (no input transforms — safe for Fastify response serialization). */
export const contactAddressReadSchema: z.ZodType<ContactAddressRead> = z.object({
  addressCity: z.string().nullable().describe("City name"),
  addressCountry: z.string().nullable().describe("Country name"),
  addressCountryCode: z.string().nullable().describe("ISO 3166-1 alpha-2 country code"),
  addressFormatted: z.string().nullable().describe("Full address on one line"),
  addressGeocodeSource: contactAddressGeocodeSourceSchema
    .nullable()
    .describe("How the coordinates were resolved"),
  addressGranularity: contactAddressGranularitySchema.describe(
    "Most specific part of the address that is known",
  ),
  addressLine1: z.string().nullable().describe("Street and house number"),
  addressLine2: z.string().nullable().describe("Second address line, such as a unit"),
  addressPostalCode: z.string().nullable().describe("Postal or ZIP code"),
  addressState: z.string().nullable().describe("State or region name"),
  addressStateCode: z.string().nullable().describe("State or region code"),
  geocodeConfidence: contactAddressConfidenceSchema
    .nullable()
    .describe("Whether the geocoder verified this address"),
  label: z.string().nullable().describe("Custom label for the address"),
  latitude: z.number().nullable().describe("Latitude in decimal degrees"),
  longitude: z.number().nullable().describe("Longitude in decimal degrees"),
  timezone: z.string().nullable().describe("IANA timezone name for this address"),
  type: contactAddressTypeSchema.describe("Address category"),
  value: z.string().describe("Display value of the address"),
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
}) satisfies z.ZodType<ContactAddressEntryOutput>;

export const geocodeSuggestAddressSchema = contactAddressEntrySchema;

export const replaceAddressesSchema = z
  .array(contactAddressEntrySchema)
  .max(CONTACT_LIMITS.maxAddresses, {
    error: `Maximum of ${CONTACT_LIMITS.maxAddresses} addresses allowed`,
  }) satisfies z.ZodType<ReplaceAddressesInput>;
