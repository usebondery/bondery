export { attachMedia, createDataUriAttachment, createMediaAttachment } from "./attachments";
export { contactToVCard, vCardToContactDraft } from "./contact-mapping";
export { parseVCard, parseVCards } from "./parse";
export { serializeVCard } from "./serialize";
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
} from "./model";
