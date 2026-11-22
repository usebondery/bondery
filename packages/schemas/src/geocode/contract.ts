import type { z } from "zod";
import type { contactAddressReadSchema } from "#entities/address/schema.js";
import type { Assert, IsEqual } from "#internal/type-equality.js";
import type {
  geocodeSuggestResponseSchema,
  geocodeTimezoneResponseSchema,
} from "../geocode/schema.js";
import type {
  GeocodeSuggestAddress,
  GeocodeSuggestResponse,
  GeocodeTimezoneResponse,
} from "../geocode/types.js";

export type _GeocodeSuggestAddress = Assert<
  IsEqual<GeocodeSuggestAddress, z.infer<typeof contactAddressReadSchema>>
>;
export type _GeocodeSuggestResponse = Assert<
  IsEqual<GeocodeSuggestResponse, z.infer<typeof geocodeSuggestResponseSchema>>
>;
export type _GeocodeTimezoneResponse = Assert<
  IsEqual<GeocodeTimezoneResponse, z.infer<typeof geocodeTimezoneResponseSchema>>
>;
