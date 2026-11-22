import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import type { S3Client } from "@aws-sdk/client-s3";

import { loadTestEnv } from "./load-test-env.js";

const DATABASE_URL_MUST_BE_SET_PATTERN = /DATABASE_URL must be set/;
const POSTGRES_VERIFY_FAILED_PATTERN = /Postgres verify failed/;
const BONDERY_PRIVATE_S3_MUST_BE_SET_PATTERN = /BONDERY_PRIVATE_S3_\* must be set/;
const OBJECT_STORAGE_VERIFY_FAILED_PATTERN = /Object storage verify failed/;
const BONDERY_PRIVATE_REDIS_URL_MUST_BE_SET_PATTERN = /BONDERY_PRIVATE_REDIS_URL must be set/;

loadTestEnv();

const { prisma } = await import("@bondery/db");
const { initPostgres, resetPostgresReadinessForTests, verifyPostgres } = await import(
  "../lib/data/postgres.js"
);
const { resetDatabaseUrlBindingForTests } = await import("../lib/data/database-url.js");
const { probePostgres, probeRedis } = await import("../lib/health/probes.js");
const { initObjectStorage, resetStorageReadinessForTests, verifyObjectStorage } = await import(
  "../lib/storage/init-storage.js"
);
const { initRedis, resetRedisClientsForTests, resetRedisReadinessForTests, verifyRedis } =
  await import("../lib/data/redis.js");

const storageConfig = {
  accessKeyId: "access",
  endpoint: "http://storage.example.com",
  region: "eu-central-1",
  secretAccessKey: "secret",
};

function createMockHeadBucketClient(head: (bucket: string) => Promise<void> | void): S3Client {
  return {
    send: async (command: { constructor: { name: string }; input: { Bucket?: string } }) => {
      if (command.constructor.name !== "HeadBucketCommand") {
        throw new Error(`Unexpected command: ${command.constructor.name}`);
      }

      const bucket = command.input.Bucket;
      if (!bucket) {
        throw new Error("Missing bucket");
      }

      await head(bucket);
      return {};
    },
  } as unknown as S3Client;
}

type EnvSnapshot = {
  databaseUrl?: string;
  nodeEnv?: string;
  redisUrl?: string;
};

function snapshotEnv(): EnvSnapshot {
  return {
    databaseUrl: process.env.DATABASE_URL,
    nodeEnv: process.env.NODE_ENV,
    redisUrl: process.env.BONDERY_PRIVATE_REDIS_URL,
  };
}

function restoreEnv(snapshot: EnvSnapshot): void {
  const restore = (key: keyof EnvSnapshot, envKey: string) => {
    const value = snapshot[key];
    if (value === undefined) {
      Reflect.deleteProperty(process.env, envKey);
    } else {
      process.env[envKey] = value;
    }
  };

  restore("databaseUrl", "DATABASE_URL");
  restore("nodeEnv", "NODE_ENV");
  restore("redisUrl", "BONDERY_PRIVATE_REDIS_URL");
}

describe("postgres runtime readiness", () => {
  const snapshot = snapshotEnv();
  const originalQueryRaw = prisma.$queryRaw;

  afterEach(() => {
    prisma.$queryRaw = originalQueryRaw;
    resetPostgresReadinessForTests();
    resetDatabaseUrlBindingForTests();
    restoreEnv(snapshot);
  });

  it("initPostgres skips verify when DATABASE_URL is missing in test", async () => {
    process.env.NODE_ENV = "test";
    delete process.env.DATABASE_URL;

    const readiness = await initPostgres();

    assert.equal(readiness.configured, false);
    assert.equal(readiness.ok, true);
  });

  it("initPostgres throws when DATABASE_URL is missing in development", async () => {
    process.env.NODE_ENV = "development";
    delete process.env.DATABASE_URL;

    await assert.rejects(() => initPostgres(), DATABASE_URL_MUST_BE_SET_PATTERN);
  });

  it("initPostgres throws when query fails in development", async () => {
    process.env.NODE_ENV = "development";
    process.env.DATABASE_URL = "postgresql://user:pass@127.0.0.1:5432/bondery";
    prisma.$queryRaw = (async () => {
      throw new Error("connection refused");
    }) as typeof prisma.$queryRaw;

    await assert.rejects(() => initPostgres(), POSTGRES_VERIFY_FAILED_PATTERN);
  });

  it("verifyPostgres returns unhealthy when DATABASE_URL is missing outside test", async () => {
    process.env.NODE_ENV = "development";
    delete process.env.DATABASE_URL;

    const readiness = await verifyPostgres();

    assert.equal(readiness.configured, false);
    assert.equal(readiness.ok, false);
    assert.equal(readiness.error, "not_configured");
  });

  it("probePostgres delegates to verifyPostgres", async () => {
    process.env.NODE_ENV = "test";
    delete process.env.DATABASE_URL;

    const result = await probePostgres();

    assert.deepEqual(result, { configured: false, ok: true });
  });
});

describe("object storage runtime readiness", () => {
  const snapshot = snapshotEnv();

  afterEach(() => {
    resetStorageReadinessForTests();
    restoreEnv(snapshot);
  });

  it("initObjectStorage skips verify when S3 env is incomplete in test", async () => {
    process.env.NODE_ENV = "test";

    const readiness = await initObjectStorage(undefined, {
      ...storageConfig,
      accessKeyId: "",
    });

    assert.equal(readiness.configured, false);
    assert.equal(readiness.ok, true);
  });

  it("initObjectStorage throws when S3 env is incomplete in development", async () => {
    process.env.NODE_ENV = "development";

    await assert.rejects(
      () =>
        initObjectStorage(undefined, {
          ...storageConfig,
          secretAccessKey: "",
        }),
      BONDERY_PRIVATE_S3_MUST_BE_SET_PATTERN,
    );
  });

  it("initObjectStorage throws when HeadBucket fails", async () => {
    process.env.NODE_ENV = "development";
    const client = createMockHeadBucketClient(() => {
      throw new Error("NotFound");
    });

    await assert.rejects(
      () => initObjectStorage(undefined, { ...storageConfig, client }),
      OBJECT_STORAGE_VERIFY_FAILED_PATTERN,
    );
  });

  it("initObjectStorage succeeds when HeadBucket succeeds without a /status server", async () => {
    process.env.NODE_ENV = "development";
    const client = createMockHeadBucketClient(async () => {
      // HeadBucket succeeds: the bucket is already present.
    });

    const readiness = await initObjectStorage(undefined, { ...storageConfig, client });

    assert.equal(readiness.configured, true);
    assert.equal(readiness.ok, true);
  });

  it("verifyObjectStorage succeeds when HeadBucket succeeds without a /status server", async () => {
    process.env.NODE_ENV = "development";
    const client = createMockHeadBucketClient(async () => {
      // HeadBucket succeeds: the bucket is already present.
    });

    const readiness = await verifyObjectStorage({ ...storageConfig, client });

    assert.equal(readiness.configured, true);
    assert.equal(readiness.ok, true);
  });

  it("verifyObjectStorage returns unhealthy when config is incomplete outside test", async () => {
    process.env.NODE_ENV = "development";

    const readiness = await verifyObjectStorage({
      ...storageConfig,
      endpoint: "",
    });

    assert.equal(readiness.configured, false);
    assert.equal(readiness.ok, false);
    assert.equal(readiness.error, "not_configured");
  });
});

describe("prisma pool injection", () => {
  const snapshot = snapshotEnv();

  afterEach(async () => {
    const { resetPrismaForTests } = await import("@bondery/db");
    resetPrismaForTests();
    restoreEnv(snapshot);
  });

  it("initializePrisma wires an explicit pool", async () => {
    process.env.NODE_ENV = "test";
    process.env.DATABASE_URL = "postgresql://user:pass@127.0.0.1:5432/bondery";

    const { createPrismaPool, getPrismaPool, initializePrisma, resetPrismaForTests } = await import(
      "@bondery/db"
    );
    resetPrismaForTests();

    const pool = createPrismaPool(process.env.DATABASE_URL);
    initializePrisma(pool);

    assert.equal(getPrismaPool(), pool);
  });
});
describe("redis runtime readiness", () => {
  const snapshot = snapshotEnv();

  afterEach(() => {
    resetRedisClientsForTests();
    resetRedisReadinessForTests();
    restoreEnv(snapshot);
  });

  it("initRedis skips verify when URL is missing in test", async () => {
    process.env.NODE_ENV = "test";

    const result = await initRedis(undefined, "");

    assert.equal(result.readiness.configured, false);
    assert.equal(result.readiness.ok, true);
    assert.equal(result.clients, null);
  });

  it("initRedis throws when URL is missing in development", async () => {
    process.env.NODE_ENV = "development";

    await assert.rejects(
      () => initRedis(undefined, ""),
      BONDERY_PRIVATE_REDIS_URL_MUST_BE_SET_PATTERN,
    );
  });

  it("verifyRedis returns unhealthy when URL is missing outside test", async () => {
    process.env.NODE_ENV = "development";

    const readiness = await verifyRedis("");

    assert.equal(readiness.configured, false);
    assert.equal(readiness.ok, false);
    assert.equal(readiness.error, "not_configured");
  });

  it("probeRedis delegates to verifyRedis", async () => {
    process.env.NODE_ENV = "test";

    const result = await probeRedis("");

    assert.deepEqual(result, { configured: false, ok: true });
  });
});
