import type { Database } from "@bondery/schemas/supabase.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  deleteContactAvatarAndClearFlag,
  uploadContactAvatarAndSetFlag,
} from "../../lib/contacts/avatar-storage.js";
import { createAdminClient } from "../../lib/data/supabase.js";
import { internal } from "../../lib/platform/errors/http-errors.js";
import { buildPeopleRowChange } from "../../lib/sync/build-changes.js";
import { persistSyncChanges } from "../../lib/sync/persist-changes.js";
import { type DomainContext, DomainError, syncEmitMetaFromContext } from "../_shared/context.js";
import { captureCurrentSyncTxid } from "../_shared/with-txid.js";

async function assertContactExists(
  ctx: DomainContext,
  contactId: string,
): Promise<{ id: string; myself: boolean | null }> {
  const { client, user } = ctx;
  const { data: contact, error } = await client
    .from("people")
    .select("id, myself")
    .eq("id", contactId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw internal("contact_failed", error.message);
  }
  if (!contact) {
    throw new DomainError("Contact not found", 404, "contact_not_found");
  }

  return contact;
}

export async function uploadContactPhoto(
  ctx: DomainContext,
  contactId: string,
  buffer: Buffer,
  mimeType: string,
): Promise<{
  data: { success: true; avatarUrl: string | null };
  txid: string;
  serverSequence: number;
}> {
  await assertContactExists(ctx, contactId);

  const { client, user } = ctx;
  const adminClient = createAdminClient();

  try {
    await uploadContactAvatarAndSetFlag(
      client,
      adminClient as SupabaseClient<Database>,
      user.id,
      contactId,
      buffer,
      mimeType,
    );
  } catch {
    throw internal("contact_failed_to_upload_photo");
  }

  const peopleChange = await buildPeopleRowChange(client, user.id, contactId);
  const changes = peopleChange ? [peopleChange] : [];
  const txid = await captureCurrentSyncTxid(client);
  const serverSequence =
    (await persistSyncChanges(user.id, changes, syncEmitMetaFromContext(ctx))) ?? 0;

  const { resolveContactAvatarUrl } = await import("../../lib/data/supabase.js");
  const avatarUrl = resolveContactAvatarUrl(client, user.id, {
    hasAvatar: true,
    id: contactId,
    updatedAt: new Date().toISOString(),
  });
  const cacheBustedUrl = avatarUrl
    ? `${avatarUrl}${avatarUrl.includes("?") ? "&" : "?"}t=${Date.now()}`
    : avatarUrl;

  return {
    data: { avatarUrl: cacheBustedUrl, success: true },
    serverSequence,
    txid,
  };
}

export async function deleteContactPhoto(
  ctx: DomainContext,
  contactId: string,
): Promise<{ data: { success: true }; txid: string; serverSequence: number }> {
  await assertContactExists(ctx, contactId);

  const { client, user } = ctx;
  const adminClient = createAdminClient();
  await deleteContactAvatarAndClearFlag(
    client,
    adminClient as SupabaseClient<Database>,
    user.id,
    contactId,
  );

  const peopleChange = await buildPeopleRowChange(client, user.id, contactId);
  const changes = peopleChange ? [peopleChange] : [];
  const txid = await captureCurrentSyncTxid(client);
  const serverSequence =
    (await persistSyncChanges(user.id, changes, syncEmitMetaFromContext(ctx))) ?? 0;

  return { data: { success: true }, serverSequence, txid };
}
