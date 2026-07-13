import { z } from "zod";
import { contactAddressReadSchema } from "#entities/address/schema.js";
import type { GeocodeSuggestResponse, GeocodeTimezoneResponse } from "../geocode/types.js";

/** Parsed geocode suggest API response (web-safe — no entity barrel imports). */
export const geocodeSuggestResponseSchema: z.ZodType<GeocodeSuggestResponse> = z
  .object({
    addresses: z.array(contactAddressReadSchema),
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

export const geocodeTimezoneResponseSchema: z.ZodType<GeocodeTimezoneResponse> = z
  .object({
    timezone: z.string().nullable(),
  })
  .meta({ example: { timezone: "Europe/London" } });
