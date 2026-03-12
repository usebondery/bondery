export { attachMedia, createDataUriAttachment, createMediaAttachment } from "./attachments.js";
export { contactToVCard, vCardToContactDraft } from "./contact-mapping.js";
export { parseVCard, parseVCards } from "./parse.js";
export { serializeVCard } from "./serialize.js";
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
} from "./model.js";
