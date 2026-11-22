import type { z } from "zod";
import type { Assert, IsEqual } from "#internal/type-equality.js";
import type {
  contactAddressConfidenceSchema,
  contactAddressEntrySchema,
  contactAddressGeocodeSourceSchema,
  contactAddressGranularitySchema,
  contactAddressReadSchema,
  contactAddressSheetSchema,
  contactAddressTypeSchema,
  geocodeSuggestAddressSchema,
  replaceAddressesSchema,
} from "./schema.js";
import type {
  ContactAddressConfidence,
  ContactAddressEntry,
  ContactAddressEntryInput,
  ContactAddressEntryOutput,
  ContactAddressGeocodeSource,
  ContactAddressGranularity,
  ContactAddressRead,
  ContactAddressSheetInput,
  ContactAddressSheetOutput,
  ContactAddressType,
  GeocodeSuggestAddressInput,
  GeocodeSuggestAddressOutput,
  ReplaceAddressesInput,
} from "./types.js";

export type _ContactAddressType = Assert<
  IsEqual<ContactAddressType, z.infer<typeof contactAddressTypeSchema>>
>;
export type _ContactAddressGranularity = Assert<
  IsEqual<ContactAddressGranularity, z.infer<typeof contactAddressGranularitySchema>>
>;
export type _ContactAddressGeocodeSource = Assert<
  IsEqual<ContactAddressGeocodeSource, z.infer<typeof contactAddressGeocodeSourceSchema>>
>;
export type _ContactAddressConfidence = Assert<
  IsEqual<ContactAddressConfidence, z.infer<typeof contactAddressConfidenceSchema>>
>;
export type _ContactAddressRead = Assert<
  IsEqual<ContactAddressRead, z.infer<typeof contactAddressReadSchema>>
>;
export type _ContactAddressSheetInput = Assert<
  IsEqual<ContactAddressSheetInput, z.input<typeof contactAddressSheetSchema>>
>;
export type _ContactAddressSheetOutput = Assert<
  IsEqual<ContactAddressSheetOutput, z.output<typeof contactAddressSheetSchema>>
>;
export type _ContactAddressEntryInput = Assert<
  IsEqual<ContactAddressEntryInput, z.input<typeof contactAddressEntrySchema>>
>;
export type _ContactAddressEntryOutput = Assert<
  IsEqual<ContactAddressEntryOutput, z.output<typeof contactAddressEntrySchema>>
>;
export type _ContactAddressEntry = Assert<
  IsEqual<ContactAddressEntry, z.output<typeof contactAddressEntrySchema>>
>;
export type _GeocodeSuggestAddressInput = Assert<
  IsEqual<GeocodeSuggestAddressInput, z.input<typeof geocodeSuggestAddressSchema>>
>;
export type _GeocodeSuggestAddressOutput = Assert<
  IsEqual<GeocodeSuggestAddressOutput, z.output<typeof geocodeSuggestAddressSchema>>
>;
export type _ReplaceAddressesInput = Assert<
  IsEqual<ReplaceAddressesInput, z.output<typeof replaceAddressesSchema>>
>;
