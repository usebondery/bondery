import type { StorageAdapter, StoragePutOptions } from "../lib/storage/adapter.js";

const LEADING_SLASHES_PATTERN = /^\/+/;

function storageKey(bucket: string, key: string): string {
  return `${bucket}/${key.replace(LEADING_SLASHES_PATTERN, "")}`;
}

export function createMemoryStorage(options?: {
  get?: StorageAdapter["get"];
  listKeys?: StorageAdapter["listKeys"];
}): StorageAdapter & { objects: Map<string, Buffer> } {
  const objects = new Map<string, Buffer>();

  return {
    async delete(bucket, key) {
      objects.delete(storageKey(bucket, key));
    },
    async get(bucket, key) {
      if (options?.get) {
        return options.get(bucket, key);
      }
      return objects.get(storageKey(bucket, key)) ?? null;
    },
    getPublicUrl(bucket, key) {
      return `https://storage.test/${bucket}/${key.replace(LEADING_SLASHES_PATTERN, "")}`;
    },
    async listKeys(bucket, prefix) {
      if (options?.listKeys) {
        return options.listKeys(bucket, prefix);
      }
      const normalized = prefix.replace(/^\/+|\/+$/g, "");
      const listPrefix = normalized ? `${bucket}/${normalized}/` : `${bucket}/`;
      const keys: string[] = [];
      for (const objectKey of objects.keys()) {
        if (!objectKey.startsWith(listPrefix)) {
          continue;
        }
        keys.push(objectKey.slice(bucket.length + 1));
      }
      return keys;
    },
    objects,
    async put(bucket, key, data, _opts?: StoragePutOptions) {
      objects.set(storageKey(bucket, key), data);
    },
  };
}
