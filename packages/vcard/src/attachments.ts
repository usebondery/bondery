import type {
  VCard,
  VCardMedia,
  VCardMediaAttachmentInput,
  VCardMediaPropertyName,
} from "./model.js";

const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function toUint8Array(data: Uint8Array | ArrayBuffer | string): Uint8Array {
  if (typeof data === "string") {
    return new TextEncoder().encode(data);
  }

  if (data instanceof Uint8Array) {
    return data;
  }

  return new Uint8Array(data);
}

function toBase64(data: Uint8Array): string {
  let result = "";

  for (let index = 0; index < data.length; index += 3) {
    const byte1 = data[index] ?? 0;
    const byte2 = data[index + 1] ?? 0;
    const byte3 = data[index + 2] ?? 0;
    const chunk = (byte1 << 16) | (byte2 << 8) | byte3;

    result += BASE64_ALPHABET[(chunk >> 18) & 0x3f];
    result += BASE64_ALPHABET[(chunk >> 12) & 0x3f];
    result += index + 1 < data.length ? BASE64_ALPHABET[(chunk >> 6) & 0x3f] : "=";
    result += index + 2 < data.length ? BASE64_ALPHABET[chunk & 0x3f] : "=";
  }

  return result;
}

/**
 * Converts binary or text input into a data URI suitable for vCard 4.0 URI-valued media properties.
 *
 * @param data Binary payload, a plain string, or an existing data URI.
 * @param mediaType Media type to embed in the data URI.
 * @returns A data URI string.
 */
export function createDataUriAttachment(
  data: Uint8Array | ArrayBuffer | string,
  mediaType: string,
): string {
  if (typeof data === "string" && data.startsWith("data:")) {
    return data;
  }

  return `data:${mediaType};base64,${toBase64(toUint8Array(data))}`;
}

/**
 * Creates a normalized media attachment from a URI or binary payload.
 *
 * @param input Attachment source and metadata.
 * @returns Normalized media entry.
 */
export function createMediaAttachment(input: VCardMediaAttachmentInput): VCardMedia {
  if (!input.uri && !input.data) {
    throw new Error("A media attachment requires either a uri or data payload.");
  }

  const uri =
    input.uri ??
    createDataUriAttachment(input.data!, input.mediaType ?? "application/octet-stream");
  const source = uri.startsWith("data:") ? "data-uri" : "uri";

  return {
    uri,
    mediaType: input.mediaType,
    pref: input.pref,
    types: input.types ?? [],
    source,
  };
}

/**
 * Attaches normalized media to a vCard and returns a new immutable object.
 *
 * @param card Target card.
 * @param property Media property to update.
 * @param input Attachment source and metadata.
 * @returns Updated card.
 */
export function attachMedia(
  card: VCard,
  property: VCardMediaPropertyName,
  input: VCardMediaAttachmentInput,
): VCard {
  const attachment = createMediaAttachment(input);

  switch (property) {
    case "PHOTO":
      return { ...card, photos: [...card.photos, attachment] };
    case "LOGO":
      return { ...card, logos: [...card.logos, attachment] };
    case "SOUND":
      return { ...card, sounds: [...card.sounds, attachment] };
    case "KEY":
      return { ...card, keys: [...card.keys, attachment] };
  }
}
