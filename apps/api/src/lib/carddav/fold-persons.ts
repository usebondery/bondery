import type { Prisma, PrismaClient } from "@bondery/db";
import { generateId } from "@bondery/helpers/ids";
import { type CardProjection, projectCard, projectionEtag } from "@bondery/vcard";
import { parseStoredExtras, photoVersionOf, toCardInput } from "./person-input.js";

/** `myself` is nullable, and `NOT (myself = true)` would drop the NULL rows. */
const NOT_MYSELF = [{ myself: false }, { myself: null }];

const WRITE_BATCH_SIZE = 1000;

const PERSON_SELECT = {
  addresses: {
    select: {
      addressCity: true,
      addressCountry: true,
      addressLine1: true,
      addressLine2: true,
      addressPostalCode: true,
      addressState: true,
      label: true,
      type: true,
    },
  },
  avatarUpdatedAt: true,
  emails: { select: { preferred: true, sortOrder: true, type: true, value: true } },
  firstName: true,
  hasAvatar: true,
  headline: true,
  id: true,
  importantDates: { select: { date: true, note: true, type: true } },
  lastName: true,
  middleName: true,
  phones: { select: { preferred: true, prefix: true, sortOrder: true, type: true, value: true } },
  socials: { select: { handle: true, platform: true } },
  vcardExtras: { select: { properties: true } },
} as const;

/** The address-book row a fold writes under. The caller holds its lock. */
interface FoldBook {
  id: string;
  revision: bigint;
}

interface CardUpdate {
  data: Prisma.CarddavCardUpdateInput;
  id: string;
}

interface VersionRow {
  cardId: string;
  etag: string;
  projection: CardProjection;
}

interface CardWrites {
  creates: Prisma.CarddavCardCreateManyInput[];
  revision: bigint;
  updates: CardUpdate[];
  versions: VersionRow[];
}

function toJson(projection: CardProjection): Prisma.InputJsonValue {
  // `CardProjection` is plain JSON data. The cast only drops its interface type.
  return projection as unknown as Prisma.InputJsonValue;
}

/**
 * Decides which cards to create, update or tombstone for `sortedIds`. Cards change only when
 * the ETag changes (or a tombstone comes back to life), and each change takes the next revision.
 */
async function planCardWrites(
  tx: PrismaClient,
  userId: string,
  book: FoldBook,
  sortedIds: string[],
): Promise<CardWrites> {
  const people = await tx.people.findMany({
    select: PERSON_SELECT,
    where: { id: { in: sortedIds }, OR: NOT_MYSELF, userId },
  });
  const peopleById = new Map(people.map((person) => [person.id, person]));
  const existing = await tx.carddavCard.findMany({
    select: { deletedAt: true, etag: true, id: true, personId: true },
    where: { addressBookId: book.id, personId: { in: sortedIds } },
  });
  const cardByPerson = new Map(existing.map((card) => [card.personId, card]));

  const writes: CardWrites = { creates: [], revision: book.revision, updates: [], versions: [] };
  const now = new Date();

  for (const personId of sortedIds) {
    const person = peopleById.get(personId);
    const card = cardByPerson.get(personId);

    if (!person) {
      if (card && card.deletedAt === null) {
        writes.revision += 1n;
        writes.updates.push({ data: { deletedAt: now, revision: writes.revision }, id: card.id });
      }
      continue;
    }

    const projection = projectCard(toCardInput(person));
    const extras = parseStoredExtras(person.vcardExtras?.properties ?? null);
    const etag = projectionEtag(projection, extras, "3.0");
    const photoVersion = photoVersionOf(person);

    if (!card) {
      writes.revision += 1n;
      const id = generateId();
      writes.creates.push({
        addressBookId: book.id,
        etag,
        href: `${personId}.vcf`,
        id,
        kind: "person",
        personId,
        photoVersion,
        projection: toJson(projection),
        revision: writes.revision,
        uid: `urn:uuid:${personId}`,
        userId,
      });
      writes.versions.push({ cardId: id, etag, projection });
    } else if (card.etag !== etag || card.deletedAt !== null) {
      writes.revision += 1n;
      writes.updates.push({
        data: {
          deletedAt: null,
          etag,
          photoVersion,
          projection: toJson(projection),
          revision: writes.revision,
        },
        id: card.id,
      });
      writes.versions.push({ cardId: card.id, etag, projection });
    }
  }
  return writes;
}

async function applyCardWrites(tx: PrismaClient, writes: CardWrites): Promise<void> {
  for (const update of writes.updates) {
    await tx.carddavCard.update({ data: update.data, where: { id: update.id } });
  }
  for (let index = 0; index < writes.creates.length; index += WRITE_BATCH_SIZE) {
    await tx.carddavCard.createMany({
      data: writes.creates.slice(index, index + WRITE_BATCH_SIZE),
    });
  }
  for (let index = 0; index < writes.versions.length; index += WRITE_BATCH_SIZE) {
    await tx.carddavCardVersion.createMany({
      data: writes.versions.slice(index, index + WRITE_BATCH_SIZE).map((version) => ({
        cardId: version.cardId,
        etag: version.etag,
        projection: toJson(version.projection),
      })),
      skipDuplicates: true,
    });
  }
}

/**
 * Renders the cards of `personIds` and writes what changed. A person that is gone or is
 * `myself` gets a tombstone when a live card exists. Every query filters on `userId`.
 *
 * @returns The address-book revision after the writes.
 */
async function foldPersons(
  tx: PrismaClient,
  userId: string,
  book: FoldBook,
  personIds: string[],
): Promise<bigint> {
  const sortedIds = [...personIds].sort((a, b) => (a < b ? -1 : 1));
  const writes = await planCardWrites(tx, userId, book, sortedIds);
  await applyCardWrites(tx, writes);
  return writes.revision;
}

export type { FoldBook };
export { foldPersons, NOT_MYSELF };
