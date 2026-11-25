import type { ImportantDateType } from "@bondery/schemas";
import { toImportantDate } from "../../lib/contacts/important-dates.js";
import { conflict, internal } from "../../lib/platform/errors/http-errors.js";
import {
  buildChildTableReplaceChanges,
  listContactChildIds,
} from "../../lib/sync/build-changes.js";
import { persistSyncChanges } from "../../lib/sync/persist-changes.js";
import { type DomainContext, DomainError, syncEmitMetaFromContext } from "../_shared/context.js";
import { domainDb } from "../_shared/domain-db.js";
import { isUniqueViolation, toSyncRow } from "../_shared/prisma-helpers.js";
import { captureCurrentSyncTxid } from "../_shared/with-txid.js";

interface ReplaceImportantDateInput {
  date: string;
  id?: string;
  note?: string | null;
  notifyDaysBefore?: number | null;
  type: ImportantDateType;
}

function toImportantDateFromRow(row: {
  id: string;
  userId: string;
  personId: string;
  type: string;
  date: Date;
  note: string | null;
  notifyOn: Date | null;
  notifyDaysBefore: number | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const sync = toSyncRow(row as unknown as Record<string, unknown>);
  return toImportantDate({
    created_at: String(sync["created_at"]),
    date: String(sync["date"]).slice(0, 10),
    id: String(sync["id"]),
    note: (sync["note"] as string | null) ?? null,
    notify_days_before: (sync["notify_days_before"] as number | null) ?? null,
    notify_on: sync["notify_on"] ? String(sync["notify_on"]).slice(0, 10) : null,
    person_id: String(sync["person_id"]),
    type: String(sync["type"]),
    updated_at: String(sync["updated_at"]),
    user_id: String(sync["user_id"]),
  });
}

export type { ReplaceImportantDateInput };

export async function replaceImportantDates(
  ctx: DomainContext,
  personId: string,
  dates: ReplaceImportantDateInput[],
): Promise<{
  data: { dates: ReturnType<typeof toImportantDate>[] };
  txid: string;
  serverSequence: number;
}> {
  const { user } = ctx;
  const db = domainDb(ctx);

  const person = await db.people.findFirst({
    select: { id: true },
    where: { id: personId, userId: user.id },
  });

  if (!person) {
    throw new DomainError("Contact not found", 404, "contact_not_found");
  }

  const priorIds = await listContactChildIds(user.id, personId, "people_important_dates", db);

  await db.peopleImportantDate.deleteMany({
    where: { personId, userId: user.id },
  });

  if (dates.length === 0) {
    const changes = priorIds.map((id) => ({
      entityId: id,
      operation: "delete" as const,
      table: "people_important_dates" as const,
      value: null,
    }));
    const txid = await captureCurrentSyncTxid();
    const serverSequence =
      (await persistSyncChanges(user.id, changes, syncEmitMetaFromContext(ctx))) ?? 0;
    return { data: { dates: [] }, serverSequence, txid };
  }

  let insertedRows: Array<{
    id: string;
    userId: string;
    personId: string;
    type: string;
    date: Date;
    note: string | null;
    notifyOn: Date | null;
    notifyDaysBefore: number | null;
    createdAt: Date;
    updatedAt: Date;
  }>;

  try {
    insertedRows = await db.$transaction(
      dates.map((event) =>
        db.peopleImportantDate.create({
          data: {
            ...(event.id ? { id: event.id } : {}),
            date: new Date(event.date),
            note: event.note?.trim() ? event.note.trim() : null,
            notifyDaysBefore: event.notifyDaysBefore ?? null,
            personId,
            type: event.type,
            userId: user.id,
          },
        }),
      ),
    );
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict("Duplicate important date", "important_date_duplicate", error);
    }
    throw internal("contact_failed", error instanceof Error ? error.message : "contact_failed");
  }

  insertedRows.sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());

  const changes = await buildChildTableReplaceChanges(
    user.id,
    personId,
    "people_important_dates",
    priorIds,
    db,
  );
  const txid = await captureCurrentSyncTxid();
  const serverSequence =
    (await persistSyncChanges(user.id, changes, syncEmitMetaFromContext(ctx))) ?? 0;

  return {
    data: { dates: insertedRows.map(toImportantDateFromRow) },
    serverSequence,
    txid,
  };
}
