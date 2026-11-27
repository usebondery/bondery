import type { PrismaClient } from "@bondery/db";
import { generateId } from "@bondery/helpers/ids";

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
 * that race both get the one row. The insert is one `ON CONFLICT (user_id) DO NOTHING`
 * statement, because Prisma's `upsert` reads and then creates here, and two first callers would
 * both try the create. The database assigns a random `generation`.
 *
 * @param db Root client or a transaction client.
 * @param userId The authenticated user.
 */
export async function ensureAddressBook(
  db: Pick<PrismaClient, "$executeRaw" | "carddavAddressBook">,
  userId: string,
): Promise<AddressBook> {
  await db.$executeRaw`
    INSERT INTO carddav_address_books (id, user_id, updated_at)
    VALUES (${generateId()}::uuid, ${userId}::uuid, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id) DO NOTHING
  `;
  return db.carddavAddressBook.findUniqueOrThrow({
    select: ADDRESS_BOOK_SELECT,
    where: { userId },
  });
}
