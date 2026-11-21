import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  type S3Client,
} from "@aws-sdk/client-s3";
import type { StorageAdapter, StoragePutOptions } from "./adapter.js";
import { createS3Client, type S3ConnectionConfig } from "./s3-client.js";

function isStorageObjectMissingError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const record = error as { Code?: string; name?: string };
  const code = record.Code ?? record.name;
  return code === "NoSuchKey" || code === "NoSuchBucket" || code === "NotFound";
}

async function streamToBuffer(body: unknown): Promise<Buffer> {
  if (!body) {
    return Buffer.alloc(0);
  }
  if (Buffer.isBuffer(body)) {
    return body;
  }
  if (body instanceof Uint8Array) {
    return Buffer.from(body);
  }
  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export type S3StorageConfig = S3ConnectionConfig & {
  publicBaseUrl: string;
};

export class S3Storage implements StorageAdapter {
  private readonly client: S3Client;
  private readonly config: S3StorageConfig;

  constructor(config: S3StorageConfig) {
    this.config = config;
    this.client = createS3Client(config);
  }

  async put(bucket: string, key: string, data: Buffer, opts?: StoragePutOptions): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Body: data,
        Bucket: bucket,
        ContentType: opts?.contentType,
        Key: key.replace(/^\/+/, ""),
      }),
    );
  }

  async get(bucket: string, key: string): Promise<Buffer | null> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: key.replace(/^\/+/, ""),
        }),
      );
      return await streamToBuffer(response.Body);
    } catch (error) {
      if (isStorageObjectMissingError(error)) {
        return null;
      }
      throw error;
    }
  }

  async delete(bucket: string, key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: key.replace(/^\/+/, ""),
        }),
      );
    } catch (error) {
      if (isStorageObjectMissingError(error)) {
        return;
      }
      throw error;
    }
  }

  getPublicUrl(bucket: string, key: string): string {
    const normalizedKey = key.replace(/^\/+/, "");
    return `${this.config.publicBaseUrl.replace(/\/$/, "")}/${bucket}/${normalizedKey}`;
  }

  async listKeys(bucket: string, prefix: string): Promise<string[]> {
    const normalizedPrefix = prefix.replace(/^\/+|\/+$/g, "");
    const listPrefix = normalizedPrefix ? `${normalizedPrefix}/` : "";
    const keys: string[] = [];
    let continuationToken: string | undefined;

    do {
      const response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          ContinuationToken: continuationToken,
          Prefix: listPrefix,
        }),
      );

      for (const object of response.Contents ?? []) {
        if (!object.Key) {
          continue;
        }
        keys.push(object.Key);
      }

      continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
    } while (continuationToken);

    return keys;
  }
}
