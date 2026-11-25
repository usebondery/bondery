import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { S3Client } from "@aws-sdk/client-s3";
import { ensureStorageBuckets } from "../lib/storage/ensure-buckets.js";

const ENSURESTORAGEBUCKETS_FAILED_FOR_AVATARS_PATTERN = /ensureStorageBuckets failed for: avatars/u;

const RETRY_OPTIONS = { maxAttempts: 5, retryDelayMs: 0 } as const;

function createMockClient(handlers: {
  head?: (bucket: string) => Promise<void> | void;
  create?: (bucket: string) => Promise<void> | void;
  putPolicy?: (bucket: string) => Promise<void> | void;
}): S3Client {
  return {
    send: async (command: { constructor: { name: string }; input: { Bucket?: string } }) => {
      const bucket = command.input.Bucket;
      if (!bucket) {
        throw new Error("Missing bucket");
      }

      if (command.constructor.name === "HeadBucketCommand") {
        await handlers.head?.(bucket);
        return {};
      }

      if (command.constructor.name === "CreateBucketCommand") {
        await handlers.create?.(bucket);
        return {};
      }

      if (command.constructor.name === "PutBucketPolicyCommand") {
        await handlers.putPolicy?.(bucket);
        return {};
      }

      throw new Error(`Unexpected command: ${command.constructor.name}`);
    },
  } as unknown as S3Client;
}

function notFoundError(): Error {
  const error = new Error("NotFound") as Error & { name: string };
  error.name = "NotFound";
  return error;
}

function unknownError(): Error {
  const error = new Error("UnknownError") as Error & { name: string };
  error.name = "UnknownError";
  return error;
}

function accessDeniedError(): Error {
  const error = new Error("AccessDenied") as Error & {
    $metadata: { httpStatusCode: number };
    name: string;
  };
  error.name = "AccessDenied";
  error.$metadata = { httpStatusCode: 403 };
  return error;
}

describe("ensureStorageBuckets", () => {
  it("creates buckets that are missing", async () => {
    const existing = new Set<string>();
    const created: string[] = [];
    const policies: string[] = [];

    const client = createMockClient({
      create: (bucket) => {
        created.push(bucket);
        existing.add(bucket);
      },
      head: (bucket) => {
        if (!existing.has(bucket)) {
          throw notFoundError();
        }
      },
      putPolicy: (bucket) => {
        policies.push(bucket);
      },
    });

    await ensureStorageBuckets({ buckets: ["avatars", "linkedin-logos"], client });

    assert.deepEqual(created, ["avatars", "linkedin-logos"]);
    assert.deepEqual(policies, ["avatars", "linkedin-logos"]);
  });

  it("skips create when bucket already exists", async () => {
    const created: string[] = [];
    const policies: string[] = [];

    const client = createMockClient({
      create: (bucket) => {
        created.push(bucket);
      },
      head: async () => {
        // HeadBucket succeeds: the bucket already exists.
      },
      putPolicy: (bucket) => {
        policies.push(bucket);
      },
    });

    await ensureStorageBuckets({ buckets: ["avatars"], client });

    assert.deepEqual(created, []);
    assert.deepEqual(policies, ["avatars"]);
  });

  it("creates once after UnknownError then NotFound, without creating on the unknown attempt", async () => {
    const created: string[] = [];
    const headCalls: string[] = [];
    let headAttempt = 0;

    const client = createMockClient({
      create: (bucket) => {
        created.push(bucket);
      },
      head: () => {
        headAttempt += 1;
        headCalls.push(headAttempt === 1 ? "unknown" : "missing");
        if (headAttempt === 1) {
          throw unknownError();
        }
        throw notFoundError();
      },
      putPolicy: async () => {
        // Policy attach is not asserted in this retry case.
      },
    });

    await ensureStorageBuckets({
      buckets: ["avatars"],
      client,
      ...RETRY_OPTIONS,
    });

    assert.deepEqual(headCalls, ["unknown", "missing"]);
    assert.deepEqual(created, ["avatars"]);
  });

  it("rejects 403 AccessDenied immediately without creating, even with retries available", async () => {
    const created: string[] = [];
    let headCalls = 0;

    const client = createMockClient({
      create: (bucket) => {
        created.push(bucket);
      },
      head: () => {
        headCalls += 1;
        throw accessDeniedError();
      },
      putPolicy: async () => {
        // AccessDenied must fail before PutBucketPolicy runs.
      },
    });

    await assert.rejects(
      () =>
        ensureStorageBuckets({
          buckets: ["avatars"],
          client,
          ...RETRY_OPTIONS,
        }),
      ENSURESTORAGEBUCKETS_FAILED_FOR_AVATARS_PATTERN,
    );

    assert.equal(headCalls, 1);
    assert.deepEqual(created, []);
  });

  it("treats BucketAlreadyOwnedByYou as success", async () => {
    const client = createMockClient({
      create: () => {
        const error = new Error("BucketAlreadyOwnedByYou") as Error & { name: string };
        error.name = "BucketAlreadyOwnedByYou";
        throw error;
      },
      head: () => {
        throw notFoundError();
      },
      putPolicy: async () => {
        // Owned-by-you is treated as success without asserting policy.
      },
    });

    await assert.doesNotReject(() => ensureStorageBuckets({ buckets: ["avatars"], client }));
  });

  it("rejects after exhausted UnknownError HeadBucket attempts without creating", async () => {
    const created: string[] = [];

    const client = createMockClient({
      create: (bucket) => {
        created.push(bucket);
      },
      head: () => {
        throw unknownError();
      },
      putPolicy: async () => {
        // Exhausted HeadBucket retries must not reach PutBucketPolicy.
      },
    });

    await assert.rejects(
      () =>
        ensureStorageBuckets({
          buckets: ["avatars"],
          client,
          ...RETRY_OPTIONS,
        }),
      ENSURESTORAGEBUCKETS_FAILED_FOR_AVATARS_PATTERN,
    );

    assert.deepEqual(created, []);
  });
});
