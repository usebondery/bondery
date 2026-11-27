/**
 * The reconciler folds `sync_change_log` into the per-user card table (ADR 0036, "Sync engine").
 *
 * Every pass runs in short transactions of at most `reconcileChunkSize` persons. A transaction
 * takes `FOR UPDATE SKIP LOCKED` on the address-book row, so two reconciles for one user never
 * overlap and a caller that finds the row busy serves the last committed state instead of
 * waiting. Cards change only when their ETag changes, and only a change bumps the revision.
 */
import { type PrismaClient, prisma } from "@bondery/db";
import { CARDDAV_LIMITS } from "@bondery/schemas";
import { ensureAddressBook } from "./address-book.js";
import { getAddressBookState } from "./card-store.js";
import { readLogChunk } from "./change-log.js";
import { foldPersons, NOT_MYSELF } from "./fold-persons.js";

/**
 * Version of the projection mapping. Raise it when `projectCard`, the extras handling or the
 * field mapping changes. The next reconcile of every address book then rebuilds its cards.
 */
const CARDDAV_PROJECTION_VERSION = 1;

/** Transaction limits sized for one chunk of 500 persons with their child rows. */
const CHUNK_TRANSACTION = { maxWait: 5000, timeout: 60_000 } as const;

interface ReconcileOptions {
  /**
   * Persons one call may fold in, for a rebuild and for incremental work alike. It also caps
   * the persons per transaction. A rebuild keeps its cursor on the address-book row, so the next
   * call continues it. Default: no limit.
   */
  maxPersons?: number;
}

interface ReconcileResult {
  /** True when the cards match the change log. False when work remains or the lock is busy. */
  done: boolean;
  /** Last committed revision. */
  revision: bigint;
}

interface LockedBook {
  id: string;
  projectionVersion: number;
  /** Last person a running rebuild folded in. */
  rebuildAfterPersonId: string | null;
  /** Head sequence read before the first person. Null when no rebuild runs. */
  rebuildHead: bigint | null;
  reconciledThrough: bigint;
  revision: bigint;
}

interface LockedBookRow {
  id: string;
  projection_version: number;
  rebuild_after_person_id: string | null;
  rebuild_head: bigint | null;
  reconciled_through: bigint;
  revision: bigint;
}

type ChunkOutcome = { kind: "busy" } | { kind: "done" } | { kind: "progressed"; persons: number };

async function committedRevision(userId: string): Promise<bigint> {
  return (await getAddressBookState(userId))?.revision ?? 0n;
}

/** Locks the user's address-book row. Null when another transaction holds it. */
async function lockAddressBook(tx: PrismaClient, userId: string): Promise<LockedBook | null> {
  const rows = await tx.$queryRaw<LockedBookRow[]>`
    SELECT id, revision, reconciled_through, projection_version, rebuild_head,
           rebuild_after_person_id::text AS rebuild_after_person_id
    FROM carddav_address_books
    WHERE user_id = ${userId}::uuid
    FOR UPDATE SKIP LOCKED
  `;
  const [row] = rows;
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    projectionVersion: row.projection_version,
    rebuildAfterPersonId: row.rebuild_after_person_id,
    rebuildHead: row.rebuild_head,
    reconciledThrough: row.reconciled_through,
    revision: row.revision,
  };
}

async function readHeadSequence(tx: PrismaClient, userId: string): Promise<bigint> {
  const rows = await tx.$queryRaw<{ last_sequence: bigint }[]>`
    SELECT last_sequence FROM sync_user_sequence WHERE user_id = ${userId}::uuid
  `;
  return rows[0]?.last_sequence ?? 0n;
}

async function storeBookState(
  tx: PrismaClient,
  addressBookId: string,
  data: {
    projectionVersion?: number;
    rebuildAfterPersonId?: string | null;
    rebuildHead?: bigint | null;
    reconciledThrough?: bigint;
    revision: bigint;
  },
): Promise<void> {
  await tx.carddavAddressBook.update({ data, where: { id: addressBookId } });
}

async function nextPersonIds(
  tx: PrismaClient,
  userId: string,
  after: string | null,
  limit: number,
): Promise<string[]> {
  const rows = await tx.people.findMany({
    orderBy: { id: "asc" },
    select: { id: true },
    take: limit,
    where: { ...(after ? { id: { gt: after } } : {}), OR: NOT_MYSELF, userId },
  });
  return rows.map((row) => row.id);
}

/** Person ids of live cards whose person is gone or is the `myself` person. */
async function findOrphanCardPersonIds(
  tx: PrismaClient,
  userId: string,
  addressBookId: string,
  limit: number,
): Promise<string[]> {
  const rows = await tx.$queryRaw<{ person_id: string }[]>`
    SELECT c.person_id::text AS person_id
    FROM carddav_cards c
    WHERE c.address_book_id = ${addressBookId}::uuid
      AND c.user_id = ${userId}::uuid
      AND c.kind = 'person'
      AND c.deleted_at IS NULL
      AND c.person_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM people p
        WHERE p.id = c.person_id AND p.user_id = ${userId}::uuid AND p.myself IS NOT TRUE
      )
    ORDER BY c.person_id
    LIMIT ${limit}
  `;
  return rows.map((row) => row.person_id);
}

/**
 * One chunk of a rebuild. The cursor lives on the address-book row, so any caller continues it.
 * The first chunk reads the head sequence and stores it before it reads a person, so a write
 * that commits during the build has a higher sequence and the incremental pass after the
 * rebuild picks it up. Persons go in id order, then live cards of persons that are gone get
 * tombstones. The last step stores the watermark and the mapping version and clears the cursor.
 */
async function rebuildChunk(
  tx: PrismaClient,
  userId: string,
  book: LockedBook,
  chunkLimit: number,
): Promise<ChunkOutcome> {
  const head = book.rebuildHead ?? (await readHeadSequence(tx, userId));

  const personIds = await nextPersonIds(tx, userId, book.rebuildAfterPersonId, chunkLimit);
  if (personIds.length > 0) {
    const revision = await foldPersons(tx, userId, book, personIds);
    await storeBookState(tx, book.id, {
      rebuildAfterPersonId: personIds.at(-1) ?? null,
      rebuildHead: head,
      revision,
    });
    return { kind: "progressed", persons: personIds.length };
  }

  const orphanIds = await findOrphanCardPersonIds(tx, userId, book.id, chunkLimit);
  if (orphanIds.length > 0) {
    const revision = await foldPersons(tx, userId, book, orphanIds);
    await storeBookState(tx, book.id, { rebuildHead: head, revision });
    return { kind: "progressed", persons: orphanIds.length };
  }

  await storeBookState(tx, book.id, {
    projectionVersion: CARDDAV_PROJECTION_VERSION,
    rebuildAfterPersonId: null,
    rebuildHead: null,
    reconciledThrough: head,
    revision: book.revision,
  });
  // The next chunk is incremental: it folds in whatever committed after the stored head.
  return { kind: "progressed", persons: 0 };
}

/** One chunk of whole change-log sequences after the watermark. */
async function incrementalChunk(
  tx: PrismaClient,
  userId: string,
  book: LockedBook,
  chunkLimit: number,
): Promise<ChunkOutcome> {
  const head = await readHeadSequence(tx, userId);
  if (book.reconciledThrough >= head) {
    return { kind: "done" };
  }

  const chunk = await readLogChunk(tx, userId, { after: book.reconciledThrough, head }, chunkLimit);
  const revision =
    chunk.personIds.length > 0
      ? await foldPersons(tx, userId, book, chunk.personIds)
      : book.revision;
  await storeBookState(tx, book.id, { reconciledThrough: chunk.processedThrough, revision });

  return chunk.exhausted
    ? { kind: "done" }
    : { kind: "progressed", persons: chunk.personIds.length };
}

async function runChunk(userId: string, chunkLimit: number): Promise<ChunkOutcome> {
  return prisma.$transaction(async (transaction) => {
    const tx = transaction as unknown as PrismaClient;
    const book = await lockAddressBook(tx, userId);
    if (!book) {
      return { kind: "busy" };
    }
    if (book.projectionVersion < CARDDAV_PROJECTION_VERSION) {
      return rebuildChunk(tx, userId, book, chunkLimit);
    }
    return incrementalChunk(tx, userId, book, chunkLimit);
  }, CHUNK_TRANSACTION);
}

/**
 * Folds the change log into the user's cards. Safe to call on every DAV request.
 *
 * - Returns `done: false` at once when another reconcile holds the address-book lock. The
 *   revision is then the last committed one.
 * - A first build and a mapping upgrade read every person, in chunks that each commit. The
 *   cursor is stored on the address-book row, so a later call continues the same rebuild.
 * - Otherwise each chunk takes whole change-log sequences up to the chunk size and moves
 *   `reconciled_through` to the last sequence it processed.
 *
 * @param userId Authenticated user. Every query filters on it.
 */
async function reconcileAddressBook(
  userId: string,
  opts: ReconcileOptions = {},
): Promise<ReconcileResult> {
  const { maxPersons } = opts;
  const chunkLimit = Math.max(
    1,
    Math.min(maxPersons ?? CARDDAV_LIMITS.reconcileChunkSize, CARDDAV_LIMITS.reconcileChunkSize),
  );
  let budget = maxPersons ?? Number.POSITIVE_INFINITY;

  // A plain read first, so the common case is one cheap select.
  if (!(await getAddressBookState(userId))) {
    await ensureAddressBook(prisma, userId);
  }

  for (;;) {
    const outcome = await runChunk(userId, Math.min(chunkLimit, budget));
    if (outcome.kind === "busy") {
      return { done: false, revision: await committedRevision(userId) };
    }
    if (outcome.kind === "done") {
      return { done: true, revision: await committedRevision(userId) };
    }
    budget -= outcome.persons;
    if (budget <= 0) {
      return { done: false, revision: await committedRevision(userId) };
    }
  }
}

export type { ReconcileOptions, ReconcileResult };
export { CARDDAV_PROJECTION_VERSION, reconcileAddressBook };
