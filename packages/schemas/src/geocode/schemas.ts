import { z } from "zod";

const contactAddressTypeSchema = z.enum(["home", "work", "other"]);
const contactAddressGranularitySchema = z.enum(["address", "city", "state", "country"]);
const contactAddressGeocodeSourceSchema = z.enum(["mapy.com", "manual"]);
const contactAddressConfidenceSchema = z.enum(["verified", "unverifiable"]);

const geocodeSuggestAddressWireSchema = z.object({
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

/** Parsed geocode suggest API response (web-safe — no entity barrel imports). */
export const geocodeSuggestResponseSchema = z
  .object({
    addresses: z.array(geocodeSuggestAddressWireSchema),
  })
  .meta({
    example: {
      addresses: [
        {
          addressCity: "London",
          addressCountry: "United Kingdom",
          addressCountryCode: "GB",
          addressFormatted: "10 Downing Street, London SW1A 2AA, UK",
          addressGeocodeSource: "mapy.com",
          addressGranularity: "address",
          addressLine1: "10 Downing Street",
          addressLine2: null,
          addressPostalCode: "SW1A 2AA",
          addressState: null,
          addressStateCode: null,
          geocodeConfidence: "verified",
          label: null,
          latitude: 51.5034,
          longitude: -0.1276,
          timezone: "Europe/London",
          type: "work",
          value: "10 Downing Street, London",
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
