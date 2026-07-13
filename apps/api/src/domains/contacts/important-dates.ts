import type { ImportantDateType } from "@bondery/schemas";
import { IMPORTANT_DATE_SELECT, toImportantDate } from "../../lib/contacts/important-dates.js";
import { internal } from "../../lib/platform/errors/http-errors.js";
import {
  buildChildTableReplaceChanges,
  listContactChildIds,
} from "../../lib/sync/build-changes.js";
import { persistSyncChanges } from "../../lib/sync/persist-changes.js";
import { type DomainContext, DomainError, syncEmitMetaFromContext } from "../_shared/context.js";
import { captureCurrentSyncTxid } from "../_shared/with-txid.js";

export interface ReplaceImportantDateInput {
  date: string;
  id?: string;
  note?: string | null;
  notifyDaysBefore?: number | null;
  type: ImportantDateType;
}

export async function replaceImportantDates(
  ctx: DomainContext,
  personId: string,
  dates: ReplaceImportantDateInput[],
): Promise<{
  data: { dates: ReturnType<typeof toImportantDate>[] };
  txid: string;
  serverSequence: number;
}> {
  const { client, user } = ctx;

  const { data: person, error: personError } = await client
    .from("people")
    .select("id")
    .eq("id", personId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (personError) {
    throw internal("contact_failed", personError.message);
  }
  if (!person) {
    throw new DomainError("Contact not found", 404, "contact_not_found");
  }

  const priorIds = await listContactChildIds(client, user.id, personId, "people_important_dates");

  const { error: deleteError } = await client
    .from("people_important_dates")
    .delete()
    .eq("user_id", user.id)
    .eq("person_id", personId);

  if (deleteError) {
    throw internal("contact_failed", deleteError.message);
  }

  if (dates.length === 0) {
    const changes = priorIds.map((id) => ({
      entityId: id,
      operation: "delete" as const,
      table: "people_important_dates" as const,
      value: null,
    }));
    const txid = await captureCurrentSyncTxid(client);
    const serverSequence =
      (await persistSyncChanges(user.id, changes, syncEmitMetaFromContext(ctx))) ?? 0;
    return { data: { dates: [] }, serverSequence, txid };
  }

  const replaceRows = dates.map((event) => ({
    ...(event.id ? { id: event.id } : {}),
    date: event.date,
    note: event.note?.trim() ? event.note.trim() : null,
    notify_days_before: event.notifyDaysBefore ?? null,
    person_id: personId,
    type: event.type,
    user_id: user.id,
  }));

  const { data: insertedRows, error: insertError } = await client
    .from("people_important_dates")
    .insert(replaceRows)
    .select(IMPORTANT_DATE_SELECT)
    .order("created_at", { ascending: true });

  if (insertError) {
    if (insertError.code === "23505") {
      throw new DomainError("Duplicate important date", 409, "important_date_duplicate");
    }
    throw internal("contact_failed", insertError.message);
  }

  const changes = await buildChildTableReplaceChanges(
    client,
    user.id,
    personId,
    "people_important_dates",
    priorIds,
  );
  const txid = await captureCurrentSyncTxid(client);
  const serverSequence =
    (await persistSyncChanges(user.id, changes, syncEmitMetaFromContext(ctx))) ?? 0;

  return {
    data: { dates: (insertedRows || []).map(toImportantDate) },
    serverSequence,
    txid,
  };
}
