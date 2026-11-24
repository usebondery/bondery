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

const contactAddressTypeSchema = z.enum(["home", "work", "other"]).describe("Address category");

const contactAddressGranularitySchema = z.enum(["address", "city", "state", "country"]);

const contactAddressGeocodeSourceSchema = z.enum(["mapy.com", "manual"]);

const contactAddressConfidenceSchema = z.enum(["verified", "unverifiable"]);

const addressCoreInputSchema = z.object({
  label: z
    .string()
    .trim()
    .max(CONTACT_FIELD_MAX_LENGTHS.addressLabel, {
      error: `Label must be at most ${CONTACT_FIELD_MAX_LENGTHS.addressLabel} characters`,
    })
    .transform((value) => value || null)
    .describe("Custom label for the address"),
  type: contactAddressTypeSchema.describe("Address category"),
  value: z
    .string()
    .trim()
    .min(1, { error: "Address is required" })
    .describe("Display value of the address"),
});

const contactAddressSheetSchema =
  addressCoreInputSchema satisfies z.ZodType<ContactAddressSheetOutput>;

/** Read-model address shape (no input transforms — safe for Fastify response serialization). */
const contactAddressReadSchema: z.ZodType<ContactAddressRead> = z.object({
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

const contactAddressEntrySchema = addressCoreInputSchema.extend({
  addressCity: optionalTrimmedString.describe("City name"),
  addressCountry: optionalTrimmedString.describe("Country name"),
  addressCountryCode: optionalTrimmedString.describe("ISO 3166-1 alpha-2 country code"),
  addressFormatted: optionalTrimmedString.describe("Full address on one line"),
  addressGeocodeSource: contactAddressGeocodeSourceSchema
    .nullable()
    .describe("How the coordinates were resolved"),
  addressGranularity: contactAddressGranularitySchema.describe(
    "Most specific part of the address that is known",
  ),
  addressLine1: optionalTrimmedString.describe("Street and house number"),
  addressLine2: optionalTrimmedString.describe("Second address line, such as a unit"),
  addressPostalCode: optionalTrimmedString.describe("Postal or ZIP code"),
  addressState: optionalTrimmedString.describe("State or region name"),
  addressStateCode: optionalTrimmedString.describe("State or region code"),
  geocodeConfidence: contactAddressConfidenceSchema
    .nullable()
    .describe("Whether the geocoder verified this address"),
  label: optionalTrimmedString.describe("Custom label for the address"),
  latitude: z.number().nullable().describe("Latitude in decimal degrees"),
  longitude: z.number().nullable().describe("Longitude in decimal degrees"),
  timezone: optionalTrimmedString.describe("IANA timezone name for this address"),
}) satisfies z.ZodType<ContactAddressEntryOutput>;

const geocodeSuggestAddressSchema = contactAddressEntrySchema;

const replaceAddressesSchema = z.array(contactAddressEntrySchema).max(CONTACT_LIMITS.maxAddresses, {
  error: `Maximum of ${CONTACT_LIMITS.maxAddresses} addresses allowed`,
}) satisfies z.ZodType<ReplaceAddressesInput>;

export {
  contactAddressConfidenceSchema,
  contactAddressEntrySchema,
  contactAddressGeocodeSourceSchema,
  contactAddressGranularitySchema,
  contactAddressReadSchema,
  contactAddressSheetSchema,
  contactAddressTypeSchema,
  geocodeSuggestAddressSchema,
  replaceAddressesSchema,
};
