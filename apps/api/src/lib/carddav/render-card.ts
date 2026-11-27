import { serializeCardV3 } from "@bondery/vcard";
import { getContactAvatarStoragePath } from "../contacts/avatar-storage.js";
import { AVATARS_BUCKET, getStorage } from "../storage/get-storage.js";
import type { CardRecord } from "./card-store.js";

/** Photo reads that run at once when a batch of cards is rendered. */
const PHOTO_READ_CONCURRENCY = 8;

interface RenderedCard {
  body: string;
  /** The ETag stored with the card. The body is the one this ETag names. */
  etag: string;
}

/**
 * Renders one card as vCard text. A person card is written from its stored projection and
 * extras, with the stored avatar JPEG as the photo (as stored, never resized). An opaque card
 * returns the text a device sent.
 *
 * @param card Card from `getCardsByHrefs`.
 * @param _vcardVersion Only 3.0 is served until the 4.0 writer ships.
 */
async function renderCard(card: CardRecord, _vcardVersion: "3.0"): Promise<RenderedCard> {
  if (card.kind === "opaque") {
    if (card.rawVcard === null) {
      throw new Error(`Opaque card ${card.id} has no stored vCard`);
    }
    return { body: card.rawVcard, etag: card.etag };
  }
  if (!card.projection) {
    throw new Error(`Person card ${card.id} has no stored projection`);
  }

  const jpegBytes = await readCardPhoto(card);
  const body = serializeCardV3(card.projection, {
    extras: card.extras,
    uid: card.uid,
    ...(jpegBytes ? { photo: { jpegBytes } } : {}),
  });
  return { body, etag: card.etag };
}

/**
 * Renders many cards with at most `PHOTO_READ_CONCURRENCY` storage reads in flight. The result
 * keeps the order of `cards`.
 */
async function renderCards(cards: CardRecord[], vcardVersion: "3.0"): Promise<RenderedCard[]> {
  const rendered: RenderedCard[] = [];
  let next = 0;

  async function worker(): Promise<void> {
    while (next < cards.length) {
      const index = next;
      next += 1;
      const card = cards[index];
      if (card) {
        rendered[index] = await renderCard(card, vcardVersion);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(PHOTO_READ_CONCURRENCY, cards.length) }, () => worker()),
  );
  return rendered;
}

/** The stored avatar bytes for a card that has a photo version. Null when there is no photo. */
async function readCardPhoto(card: CardRecord): Promise<Uint8Array | null> {
  if (!(card.photoVersion && card.personId)) {
    return null;
  }
  return getStorage().get(AVATARS_BUCKET, getContactAvatarStoragePath(card.userId, card.personId));
}

export type { RenderedCard };
export { renderCard, renderCards };
