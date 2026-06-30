import { z } from "zod";
import { CONTACT_FIELD_MAX_LENGTHS, CONTACT_LIMITS } from "../constants/index.js";
import { nullableTrimmedStringSchema } from "./_shared.js";
export const contactAddressTypeSchema = z.enum(["home", "work", "other"]);
export const contactAddressGranularitySchema = z.enum(["address", "city", "state", "country"]);
export const contactAddressGeocodeSourceSchema = z.enum(["mapy.com", "manual"]);
export const contactAddressConfidenceSchema = z.enum(["verified", "unverifiable"]);
const optionalTrimmedString = nullableTrimmedStringSchema();
const addressCoreInputSchema = z.object({
    value: z.string().trim().min(1, { error: "Address is required" }),
    type: contactAddressTypeSchema,
    label: z
        .string()
        .trim()
        .max(CONTACT_FIELD_MAX_LENGTHS.addressLabel, {
        error: `Label must be at most ${CONTACT_FIELD_MAX_LENGTHS.addressLabel} characters`,
    })
        .transform((value) => value || null),
});
export const contactAddressSheetSchema = addressCoreInputSchema;
export const contactAddressEntrySchema = addressCoreInputSchema.extend({
    label: optionalTrimmedString,
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
    addressLine1: optionalTrimmedString,
    addressLine2: optionalTrimmedString,
    addressCity: optionalTrimmedString,
    addressPostalCode: optionalTrimmedString,
    addressState: optionalTrimmedString,
    addressStateCode: optionalTrimmedString,
    addressCountry: optionalTrimmedString,
    addressCountryCode: optionalTrimmedString,
    addressGranularity: contactAddressGranularitySchema,
    addressFormatted: optionalTrimmedString,
    addressGeocodeSource: contactAddressGeocodeSourceSchema.nullable(),
    geocodeConfidence: contactAddressConfidenceSchema.nullable(),
    timezone: optionalTrimmedString,
});
export const geocodeSuggestAddressSchema = contactAddressEntrySchema;
export const geocodeSuggestResponseSchema = z.object({
    addresses: z.array(geocodeSuggestAddressSchema),
});
export const geocodeTimezoneResponseSchema = z.object({
    timezone: nullableTrimmedStringSchema(),
});
export const replaceAddressesSchema = z
    .array(contactAddressEntrySchema)
    .max(CONTACT_LIMITS.maxAddresses, {
    error: `Maximum of ${CONTACT_LIMITS.maxAddresses} addresses allowed`,
});
