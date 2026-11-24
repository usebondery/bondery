export interface StoragePutOptions {
  contentType?: string;
}

export interface StorageAdapter {
  delete: (bucket: string, key: string) => Promise<void>;
  get: (bucket: string, key: string) => Promise<Buffer | null>;
  getPublicUrl: (bucket: string, key: string) => string;
  /** List object keys under a prefix folder (e.g. `userId` → `userId/contactId.jpg`). */
  listKeys: (bucket: string, prefix: string) => Promise<string[]>;
  put: (bucket: string, key: string, data: Buffer, opts?: StoragePutOptions) => Promise<void>;
}
