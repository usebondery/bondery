import { prisma } from "@bondery/db";
import { CARDDAV_LIMITS } from "@bondery/schemas";
import { type CardExtras, type CardProjection, emptyCardExtras } from "@bondery/vcard";
import { parseStoredExtras } from "./person-input.js";

/** Prefix of every sync token and CTag the address book reports. */
const SYNC_TOKEN_PREFIX = "https://usebondery.com/ns/sync/";

/** The sync-token state of one address book. Token and CTag are the same string. */
interface AddressBookState {
  addressBookId: string;
  ctag: string;
  generation: string;
  revision: bigint;
  syncToken: string;
}

/** The `carddav_cards` fields a renderer needs, plus the extras of the person. */
interface CardRecord {
  etag: string;
  /** Device-owned properties of a person card. Empty for an opaque card. */
  extras: CardExtras;
  href: string;
  id: string;
  kind: "opaque" | "person";
  personId: string | null;
  /** Avatar timestamp the card photo was built from. Null when the card has no photo. */
  photoVersion: Date | null;
  /** Version-neutral projection of a person card. Null for an opaque card. */
  projection: CardProjection | null;
  /** The vCard exactly as a device sent it. Null for a person card. */
  rawVcard: string | null;
  revision: bigint;
  uid: string;
  userId: string;
}

/** The address-book token for one generation and revision. */
function formatSyncToken(generation: string, revision: bigint): string {
  return `${SYNC_TOKEN_PREFIX}${generation}-${revision}`;
}

/**
 * Reads the committed sync-token state of the user's address book. A plain read never waits for
 * a reconcile that holds the row lock: it sees the last committed revision.
 *
 * @returns Null when the user has no address book yet.
 */
async function getAddressBookState(userId: string): Promise<AddressBookState | null> {
  const book = await prisma.carddavAddressBook.findUnique({
    select: { generation: true, id: true, revision: true },
    where: { userId },
  });
  if (!book) {
    return null;
  }
  const token = formatSyncToken(book.generation, book.revision);
  return {
    addressBookId: book.id,
    ctag: token,
    generation: book.generation,
    revision: book.revision,
    syncToken: token,
  };
}

/**
 * Lists the live cards for a Depth 1 PROPFIND. It selects href and ETag only, so the projection
 * column is never read.
 *
 * @param addressBookId Address book of the authenticated user.
 */
async function listLiveCards(addressBookId: string): Promise<{ etag: string; href: string }[]> {
  return prisma.carddavCard.findMany({
    orderBy: { href: "asc" },
    select: { etag: true, href: true },
    where: { addressBookId, deletedAt: null },
  });
}

/**
 * Loads live cards by href for `addressbook-multiget`. Unknown, deleted and foreign hrefs are
 * left out, so the caller answers 404 for them.
 *
 * @param addressBookId Address book of the authenticated user.
 * @param hrefs Card file names such as `{personId}.vcf`. At most `multigetMaxHrefs`.
 * @throws RangeError When more than `multigetMaxHrefs` hrefs are given.
 */
async function getCardsByHrefs(addressBookId: string, hrefs: string[]): Promise<CardRecord[]> {
  if (hrefs.length > CARDDAV_LIMITS.multigetMaxHrefs) {
    throw new RangeError(
      `At most ${CARDDAV_LIMITS.multigetMaxHrefs} hrefs per request, got ${hrefs.length}`,
    );
  }
  if (hrefs.length === 0) {
    return [];
  }

  const cards = await prisma.carddavCard.findMany({
    orderBy: { revision: "asc" },
    select: {
      etag: true,
      href: true,
      id: true,
      kind: true,
      personId: true,
      photoVersion: true,
      projection: true,
      rawVcard: true,
      revision: true,
      uid: true,
      userId: true,
    },
    where: { addressBookId, deletedAt: null, href: { in: hrefs } },
  });

  const extrasByPerson = await loadExtrasByPerson(cards);
  return cards.map((card) => ({
    etag: card.etag,
    extras: (card.personId && extrasByPerson.get(card.personId)) || emptyCardExtras(),
    href: card.href,
    id: card.id,
    kind: card.kind,
    personId: card.personId,
    photoVersion: card.photoVersion,
    // The column holds the JSON that `projectCard` produced. Nothing else writes it.
    projection: card.projection as CardProjection | null,
    rawVcard: card.rawVcard,
    revision: card.revision,
    uid: card.uid,
    userId: card.userId,
  }));
}

async function loadExtrasByPerson(
  cards: { personId: string | null; userId: string }[],
): Promise<Map<string, CardExtras>> {
  const personIds = cards.flatMap((card) => (card.personId ? [card.personId] : []));
  if (personIds.length === 0) {
    return new Map();
  }
  const userIds = [...new Set(cards.map((card) => card.userId))];
  const rows = await prisma.peopleVcardExtras.findMany({
    select: { personId: true, properties: true },
    where: { personId: { in: personIds }, userId: { in: userIds } },
  });
  return new Map(rows.map((row) => [row.personId, parseStoredExtras(row.properties)]));
}

export type { AddressBookState, CardRecord };
export { formatSyncToken, getAddressBookState, getCardsByHrefs, listLiveCards };
