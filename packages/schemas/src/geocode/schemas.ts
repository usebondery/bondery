import { z } from "zod";

const contactAddressTypeSchema = z.enum(["home", "work", "other"]);
const contactAddressGranularitySchema = z.enum(["address", "city", "state", "country"]);
const contactAddressGeocodeSourceSchema = z.enum(["mapy.com", "manual"]);
const contactAddressConfidenceSchema = z.enum(["verified", "unverifiable"]);

const geocodeSuggestAddressWireSchema = z.object({
  value: z.string(),
  type: contactAddressTypeSchema,
  label: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  addressLine1: z.string().nullable(),
  addressLine2: z.string().nullable(),
  addressCity: z.string().nullable(),
  addressPostalCode: z.string().nullable(),
  addressState: z.string().nullable(),
  addressStateCode: z.string().nullable(),
  addressCountry: z.string().nullable(),
  addressCountryCode: z.string().nullable(),
  addressGranularity: contactAddressGranularitySchema,
  addressFormatted: z.string().nullable(),
  addressGeocodeSource: contactAddressGeocodeSourceSchema.nullable(),
  geocodeConfidence: contactAddressConfidenceSchema.nullable(),
  timezone: z.string().nullable(),
});

/** Parsed geocode suggest API response (web-safe — no entity barrel imports). */
export const geocodeSuggestResponseSchema = z
  .object({
    addresses: z.array(geocodeSuggestAddressWireSchema),
  })
  .meta({
    example: {
      addresses: [
        {
          value: "10 Downing Street, London",
          type: "work",
          label: null,
          latitude: 51.5034,
          longitude: -0.1276,
          addressLine1: "10 Downing Street",
          addressLine2: null,
          addressCity: "London",
          addressPostalCode: "SW1A 2AA",
          addressState: null,
          addressStateCode: null,
          addressCountry: "United Kingdom",
          addressCountryCode: "GB",
          addressGranularity: "address",
          addressFormatted: "10 Downing Street, London SW1A 2AA, UK",
          addressGeocodeSource: "mapy.com",
          geocodeConfidence: "verified",
          timezone: "Europe/London",
        },
      ],
    },
  });

export const geocodeTimezoneResponseSchema = z
  .object({
    timezone: z.string().nullable(),
  })
  .meta({ example: { timezone: "Europe/London" } });

export type GeocodeSuggestAddressWire = z.infer<typeof geocodeSuggestAddressWireSchema>;
export type GeocodeSuggestResponse = z.infer<typeof geocodeSuggestResponseSchema>;
export type GeocodeTimezoneResponse = z.infer<typeof geocodeTimezoneResponseSchema>;
