import type { PrismaClient } from "@bondery/db";

const ADDRESS_BOOK_SELECT = {
  generation: true,
  id: true,
  projectionVersion: true,
  reconciledThrough: true,
  revision: true,
  tombstoneFloor: true,
  userId: true,
} as const;

/** The address-book row of one user, as the CardDAV code reads it. */
export interface AddressBook {
  generation: string;
  id: string;
  projectionVersion: number;
  reconciledThrough: bigint;
  revision: bigint;
  tombstoneFloor: bigint;
  userId: string;
}

/**
 * Returns the user's CardDAV address book, and creates it on first use. Idempotent: two callers
 * that race both get the one row, because `user_id` is unique and the insert does nothing on a
 * conflict. The database assigns a random `generation`.
 *
 * @param db Root client or a transaction client.
 * @param userId The authenticated user.
 */
export async function ensureAddressBook(db: PrismaClient, userId: string): Promise<AddressBook> {
  return db.carddavAddressBook.upsert({
    create: { userId },
    select: ADDRESS_BOOK_SELECT,
    update: {},
    where: { userId },
  });
}
