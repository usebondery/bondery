/**
 * One-shot backfill: set people.has_avatar = true for contacts with files in storage.
 *
 * Usage (from apps/api):
 *   tsx --env-file=.env.development.local scripts/backfill-has-avatar.ts
 */

import { createAdminClient } from "../src/lib/supabase.js";

const AVATARS_BUCKET = "avatars";
const AVATAR_FILE_PATTERN = /^(.+)\.jpg$/;

type AvatarFileRef = {
  userId: string;
  personId: string;
};

async function listAllAvatarFiles(): Promise<AvatarFileRef[]> {
  const adminClient = createAdminClient();
  const refs: AvatarFileRef[] = [];

  const { data: userFolders, error: listError } = await adminClient.storage
    .from(AVATARS_BUCKET)
    .list("", { limit: 1000 });

  if (listError) {
    throw new Error(`Failed to list avatar user folders: ${listError.message}`);
  }

  for (const folder of userFolders ?? []) {
    if (!folder.name || folder.id === null) {
      continue;
    }

    const userId = folder.name;
    const { data: files, error: filesError } = await adminClient.storage
      .from(AVATARS_BUCKET)
      .list(userId, { limit: 1000 });

    if (filesError) {
      console.warn(`Skipping user folder ${userId}: ${filesError.message}`);
      continue;
    }

    for (const file of files ?? []) {
      const match = AVATAR_FILE_PATTERN.exec(file.name);
      if (!match) {
        continue;
      }

      refs.push({ userId, personId: match[1] });
    }
  }

  return refs;
}

async function main(): Promise<void> {
  const adminClient = createAdminClient();
  const refs = await listAllAvatarFiles();

  console.log(`Found ${refs.length} avatar files in storage.`);

  let updated = 0;
  let orphans = 0;

  for (const { userId, personId } of refs) {
    const { data, error } = await adminClient
      .from("people")
      .update({ has_avatar: true })
      .eq("user_id", userId)
      .eq("id", personId)
      .select("id");

    if (error) {
      console.warn(`Failed to update ${userId}/${personId}: ${error.message}`);
      continue;
    }

    if (!data || data.length === 0) {
      orphans += 1;
      continue;
    }

    updated += 1;
  }

  console.log(`Updated has_avatar=true for ${updated} people.`);
  if (orphans > 0) {
    console.log(`Skipped ${orphans} orphan storage files with no matching person row.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
