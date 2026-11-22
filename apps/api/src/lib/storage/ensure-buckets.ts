import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  type S3Client,
} from "@aws-sdk/client-s3";
import { AVATARS_BUCKET, LINKEDIN_LOGOS_BUCKET } from "./get-storage.js";
import { createS3Client } from "./s3-client.js";

const TIMEOUT_ECONNREFUSED_ENOTFOUND_ECONNRESET_ETIMEDOUT_FETCH_FA_PATTERN =
  /timeout|ECONNREFUSED|ENOTFOUND|ECONNRESET|ETIMEDOUT|fetch failed/i;

const DEFAULT_MAX_ATTEMPTS = 10;
const DEFAULT_RETRY_DELAY_MS = 2000;

type S3ErrorShape = {
  $metadata?: { httpStatusCode?: number };
  Code?: string;
  cause?: unknown;
  code?: string;
  message?: string;
  name?: string;
};

type HeadBucketClass = "exists" | "forbidden" | "missing" | "notReady";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function asS3Error(error: unknown): S3ErrorShape | null {
  if (!error || typeof error !== "object") {
    return null;
  }
  return error as S3ErrorShape;
}

function getErrorCode(error: S3ErrorShape): string | undefined {
  return error.Code ?? error.name ?? error.code;
}

function getHttpStatus(error: S3ErrorShape): number | undefined {
  return error.$metadata?.httpStatusCode;
}

function isBucketAlreadyExistsError(error: unknown): boolean {
  const record = asS3Error(error);
  if (!record) {
    return false;
  }

  const code = getErrorCode(record);
  return code === "BucketAlreadyOwnedByYou" || code === "BucketAlreadyExists";
}

function isBucketMissingError(error: unknown): boolean {
  const record = asS3Error(error);
  if (!record) {
    return false;
  }

  const code = getErrorCode(record);
  return code === "NotFound" || code === "NoSuchBucket" || getHttpStatus(record) === 404;
}

function isForbiddenError(error: unknown): boolean {
  const record = asS3Error(error);
  if (!record) {
    return false;
  }

  const code = getErrorCode(record);
  return getHttpStatus(record) === 403 || code === "AccessDenied" || code === "Forbidden";
}

const UNREACHABLE_CODES = new Set([
  "EAI_AGAIN",
  "ECONNREFUSED",
  "ECONNRESET",
  "ENOTFOUND",
  "EPIPE",
  "ETIMEDOUT",
  "NetworkingError",
]);

function isNotReadyError(error: unknown): boolean {
  let current: unknown = error;

  while (current) {
    const record = asS3Error(current);
    if (!record) {
      return false;
    }

    if (record.name === "UnknownError" || record.message === "UnknownError") {
      return true;
    }

    const status = getHttpStatus(record);
    if (typeof status === "number" && status >= 500) {
      return true;
    }

    if (
      record.name === "AbortError" ||
      record.name === "TimeoutError" ||
      record.name === "TimeoutErrorException"
    ) {
      return true;
    }

    const code = getErrorCode(record);
    if (code && UNREACHABLE_CODES.has(code)) {
      return true;
    }

    const message = record.message ?? "";
    if (TIMEOUT_ECONNREFUSED_ENOTFOUND_ECONNRESET_ETIMEDOUT_FETCH_FA_PATTERN.test(message)) {
      return true;
    }

    if (!record.cause) {
      return false;
    }

    current = record.cause;
  }

  return false;
}

function classifyHeadBucketError(error: unknown): Exclude<HeadBucketClass, "exists"> {
  if (isBucketMissingError(error)) {
    return "missing";
  }
  if (isForbiddenError(error)) {
    return "forbidden";
  }
  if (isNotReadyError(error)) {
    return "notReady";
  }
  throw error;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Poll HeadBucket until the outcome is classified. CreateBucket only after a
 * missing (404) result — never on UnknownError / 5xx / timeout warmup noise.
 */
async function waitForHeadBucket(
  client: S3Client,
  bucket: string,
  maxAttempts: number,
  retryDelayMs: number,
): Promise<"exists" | "missing"> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await client.send(new HeadBucketCommand({ Bucket: bucket }));
      return "exists";
    } catch (error) {
      const classification = classifyHeadBucketError(error);
      if (classification === "missing") {
        return "missing";
      }
      if (classification === "forbidden") {
        throw error;
      }

      lastError = error;
      if (attempt < maxAttempts) {
        console.warn(
          `ensureStorageBuckets(${bucket}) HeadBucket attempt ${attempt} not ready, retrying…`,
          error,
        );
        await sleep(retryDelayMs);
      }
    }
  }

  throw new Error(
    `ensureStorageBuckets(${bucket}) HeadBucket not ready after ${maxAttempts} attempts`,
    { cause: lastError },
  );
}

async function ensureBucket(
  client: S3Client,
  bucket: string,
  maxAttempts: number,
  retryDelayMs: number,
): Promise<void> {
  const head = await waitForHeadBucket(client, bucket, maxAttempts, retryDelayMs);

  if (head === "missing") {
    try {
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
      console.log(`Created bucket: ${bucket}`);
    } catch (createError) {
      if (!isBucketAlreadyExistsError(createError)) {
        throw createError;
      }
      console.log(`Bucket exists: ${bucket}`);
    }
  } else {
    console.log(`Bucket exists: ${bucket}`);
  }

  await ensureBucketPublicReadPolicy(client, bucket);
}

function buildPublicReadBucketPolicy(bucket: string): string {
  return JSON.stringify({
    Statement: [
      {
        Action: ["s3:GetObject"],
        Effect: "Allow",
        Principal: "*",
        Resource: [`arn:aws:s3:::${bucket}/*`],
      },
    ],
    Version: "2012-10-17",
  });
}

/** SeaweedFS requires per-bucket policy for anonymous GetObject (global anonymous_actions is not enough). */
async function ensureBucketPublicReadPolicy(client: S3Client, bucket: string): Promise<void> {
  await client.send(
    new PutBucketPolicyCommand({
      Bucket: bucket,
      Policy: buildPublicReadBucketPolicy(bucket),
    }),
  );
  console.log(`Public read policy applied: ${bucket}`);
}

export const STORAGE_BUCKETS = [AVATARS_BUCKET, LINKEDIN_LOGOS_BUCKET] as const;

export function createStorageAdminClient(): S3Client {
  return createS3Client({
    accessKeyId: requireEnv("BONDERY_PRIVATE_S3_ACCESS_KEY_ID"),
    endpoint: requireEnv("BONDERY_PRIVATE_S3_ENDPOINT"),
    region: requireEnv("BONDERY_PRIVATE_S3_REGION"),
    secretAccessKey: requireEnv("BONDERY_PRIVATE_S3_SECRET_ACCESS_KEY"),
  });
}

export type EnsureStorageBucketsOptions = {
  buckets?: readonly string[];
  client?: S3Client;
  maxAttempts?: number;
  retryDelayMs?: number;
};

export async function ensureStorageBuckets(
  options: EnsureStorageBucketsOptions = {},
): Promise<void> {
  const client = options.client ?? createStorageAdminClient();
  const buckets = options.buckets ?? STORAGE_BUCKETS;
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const failures: Array<{ bucket: string; error: unknown }> = [];

  for (const bucket of buckets) {
    try {
      await ensureBucket(client, bucket, maxAttempts, retryDelayMs);
    } catch (error) {
      failures.push({ bucket, error });
    }
  }

  if (failures.length > 0) {
    const summary = failures.map(({ bucket }) => bucket).join(", ");
    throw new Error(`ensureStorageBuckets failed for: ${summary}`, { cause: failures[0]?.error });
  }
}
