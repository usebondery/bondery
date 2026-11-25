import type { StorageAdapter } from "./adapter.js";
import { S3Storage } from "./s3.js";

const TRAILING_SLASHES_PATTERN = /\/+$/u;

let storageAdapter: StorageAdapter | null = null;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function createStorageAdapter(): StorageAdapter {
  return new S3Storage({
    accessKeyId: requireEnv("BONDERY_PRIVATE_S3_ACCESS_KEY_ID"),
    endpoint: requireEnv("BONDERY_PRIVATE_S3_ENDPOINT"),
    publicBaseUrl: requireEnv("BONDERY_PUBLIC_STORAGE_URL"),
    region: requireEnv("BONDERY_PRIVATE_S3_REGION"),
    secretAccessKey: requireEnv("BONDERY_PRIVATE_S3_SECRET_ACCESS_KEY"),
  });
}

/** Shared storage adapter — SeaweedFS S3 gateway. */
export function getStorage(): StorageAdapter {
  if (!storageAdapter) {
    storageAdapter = createStorageAdapter();
  }
  return storageAdapter;
}

/** Test hook — inject a storage adapter (pass `null` to clear). */
export function setStorageForTests(adapter: StorageAdapter | null): void {
  storageAdapter = adapter;
}

/** Test hook — reset cached adapter between tests. */
export function resetStorageForTests(): void {
  storageAdapter = null;
}

export function getPublicStorageBaseUrl(): string {
  return requireEnv("BONDERY_PUBLIC_STORAGE_URL").replace(TRAILING_SLASHES_PATTERN, "");
}

export const AVATARS_BUCKET = "avatars";
export const LINKEDIN_LOGOS_BUCKET = "linkedin-logos";

/** Copy a storage object within the same bucket (get + put). */
export async function copyStorageObject(
  bucket: string,
  sourceKey: string,
  destKey: string,
  contentType?: string,
): Promise<void> {
  const storage = getStorage();
  const data = await storage.get(bucket, sourceKey);
  if (!data) {
    return;
  }

  await storage.put(bucket, destKey, data, { contentType });
}

/** Delete multiple storage keys in parallel. */
export async function deleteStorageObjects(bucket: string, keys: string[]): Promise<void> {
  if (keys.length === 0) {
    return;
  }

  const storage = getStorage();
  await Promise.all(keys.map((key) => storage.delete(bucket, key)));
}

/** List storage keys under a prefix folder. */
export async function listStorageKeys(bucket: string, prefix: string): Promise<string[]> {
  return getStorage().listKeys(bucket, prefix);
}
