/**
 * A minimal object storage for the commit tests.
 *
 * The vCard commit step uploads an avatar and sets `hasAvatar`, so it needs a storage adapter.
 * This keeps uploads in memory so a test can assert what was written without a bucket.
 */
import type { StorageAdapter, StoragePutOptions } from "../../lib/storage/adapter.js";

const LEADING_SLASHES = /^\/+/;

function keyOf(bucket: string, key: string): string {
  return `${bucket}/${key.replace(LEADING_SLASHES, "")}`;
}

export function createMemoryStorage(): StorageAdapter & { objects: Map<string, Buffer> } {
  const objects = new Map<string, Buffer>();

  // Each method returns a promise because the adapter interface is asynchronous, even though
  // this stand-in answers immediately.
  return {
    delete: async (bucket, key) => {
      objects.delete(keyOf(bucket, key));
    },
    get: async (bucket, key) => objects.get(keyOf(bucket, key)) ?? null,
    getPublicUrl(bucket, key) {
      return `https://storage.test/${bucket}/${key.replace(LEADING_SLASHES, "")}`;
    },
    listKeys: async (bucket, prefix) => {
      const base = keyOf(bucket, prefix);
      return [...objects.keys()].filter((key) => key.startsWith(base));
    },
    objects,
    put: async (bucket: string, key: string, data: Buffer, _options?: StoragePutOptions) => {
      objects.set(keyOf(bucket, key), Buffer.from(data));
    },
  };
}
