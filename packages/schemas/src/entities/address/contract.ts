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

type _ContactAddressType = Assert<
  IsEqual<ContactAddressType, z.infer<typeof contactAddressTypeSchema>>
>;
type _ContactAddressGranularity = Assert<
  IsEqual<ContactAddressGranularity, z.infer<typeof contactAddressGranularitySchema>>
>;
type _ContactAddressGeocodeSource = Assert<
  IsEqual<ContactAddressGeocodeSource, z.infer<typeof contactAddressGeocodeSourceSchema>>
>;
type _ContactAddressConfidence = Assert<
  IsEqual<ContactAddressConfidence, z.infer<typeof contactAddressConfidenceSchema>>
>;
type _ContactAddressRead = Assert<
  IsEqual<ContactAddressRead, z.infer<typeof contactAddressReadSchema>>
>;
type _ContactAddressSheetInput = Assert<
  IsEqual<ContactAddressSheetInput, z.input<typeof contactAddressSheetSchema>>
>;
type _ContactAddressSheetOutput = Assert<
  IsEqual<ContactAddressSheetOutput, z.output<typeof contactAddressSheetSchema>>
>;
type _ContactAddressEntryInput = Assert<
  IsEqual<ContactAddressEntryInput, z.input<typeof contactAddressEntrySchema>>
>;
type _ContactAddressEntryOutput = Assert<
  IsEqual<ContactAddressEntryOutput, z.output<typeof contactAddressEntrySchema>>
>;
type _ContactAddressEntry = Assert<
  IsEqual<ContactAddressEntry, z.output<typeof contactAddressEntrySchema>>
>;
type _GeocodeSuggestAddressInput = Assert<
  IsEqual<GeocodeSuggestAddressInput, z.input<typeof geocodeSuggestAddressSchema>>
>;
type _GeocodeSuggestAddressOutput = Assert<
  IsEqual<GeocodeSuggestAddressOutput, z.output<typeof geocodeSuggestAddressSchema>>
>;
type _ReplaceAddressesInput = Assert<
  IsEqual<ReplaceAddressesInput, z.output<typeof replaceAddressesSchema>>
>;
