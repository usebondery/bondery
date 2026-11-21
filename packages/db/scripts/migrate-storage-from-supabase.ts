#!/usr/bin/env tsx
/**
 * One-time migration: Supabase Storage objects → Bondery storage backend.
 *
 * Prerequisites:
 * - `DATABASE_URL` for file metadata tables (when applicable)
 * - Source bucket path or S3-compatible credentials for Supabase Storage
 * - `BONDERY_STORAGE_DRIVER` / `BONDERY_PRIVATE_STORAGE_LOCAL_PATH` (or S3 vars) set for the target
 *
 * Mapping sketch (implement when running production cutover):
 * - `storage.objects` rows → local filesystem or S3 keys under the new layout
 * - Rewrite public URLs from Supabase domain to `BONDERY_PUBLIC_STORAGE_URL`
 *
 * Usage:
 *   DATABASE_URL=... BONDERY_STORAGE_DRIVER=local tsx scripts/migrate-storage-from-supabase.ts
 *
 * See packages/db/README.md for the full migration runbook (TODO).
 */
console.error("migrate-storage-from-supabase: not implemented yet");
process.exitCode = 1;
