export { attachMedia, createDataUriAttachment, createMediaAttachment } from "#attachments.js";
export { canonicalJson, projectionEtag } from "#carddav-etag.js";
export type {
  DeviceCardErrorCode,
  DeviceCardParseResult,
  DeviceCardPhoto,
  ParseDeviceCardOptions,
} from "#carddav-parse.js";
export { MAX_CARD_EXTRAS_BYTES, parseDeviceCard } from "#carddav-parse.js";
export type {
  CardAddress,
  CardAddressType,
  CardDate,
  CardDavPersonInput,
  CardEmail,
  CardEmailInputType,
  CardExtras,
  CardFieldGroup,
  CardMessenger,
  CardMessengerPlatform,
  CardPhone,
  CardPhoneInputType,
  CardProfilePlatform,
  CardProjection,
  CardSocialProfile,
} from "#carddav-projection.js";
export {
  CARD_FIELD_GROUPS,
  changedFieldGroups,
  emptyCardExtras,
  joinHeadline,
  projectCard,
  readFieldGroup,
  splitHeadline,
  YEARLESS_SENTINEL_YEAR,
} from "#carddav-projection.js";
export { contactToVCard, vCardToContactDraft } from "#contact-mapping.js";
export type {
  ParsedVCard,
  VCard,
  VCardAddress,
  VCardContactDraft,
  VCardDateValue,
  VCardMedia,
  VCardMediaAttachmentInput,
  VCardMediaPropertyName,
  VCardName,
  VCardParameter,
  VCardParseOptions,
  VCardPhone,
  VCardProperty,
  VCardRaw,
  VCardRelated,
  VCardSerializeOptions,
  VCardTextValue,
  VCardTimezone,
} from "#model.js";
export { parseVCard, parseVCards } from "#parse.js";
export { serializeVCard } from "#serialize.js";
export type { SerializeCardV3Options } from "#serialize-v3.js";
export { CARDDAV_PRODID, serializeCardV3 } from "#serialize-v3.js";
