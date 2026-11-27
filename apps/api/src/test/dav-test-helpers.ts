/**
 * Shared helpers for the CardDAV foundation tests. They need a migrated Postgres.
 */
import { randomUUID } from "node:crypto";
import { prisma } from "@bondery/db";
import type { DavGuardRedis } from "../lib/platform/auth/dav-login-guard.js";
import type { DavVerifyCacheRedis } from "../lib/platform/auth/dav-verify-cache.js";

type DavAuthRedis = DavGuardRedis & DavVerifyCacheRedis;

export type FakeRedis = DavAuthRedis & { values: Map<string, string> };

/** Minimal in-memory Redis: the commands the DAV login guard and verify cache use. */
export function createFakeRedis(): FakeRedis {
  const values = new Map<string, string>();
  const ttls = new Map<string, number>();

  return {
    del: async (...keys: string[]) => {
      let removed = 0;
      for (const key of keys) {
        removed += values.delete(key) ? 1 : 0;
      }
      return removed;
    },
    expire: async (key: string, seconds: number) => {
      ttls.set(key, seconds);
      return 1;
    },
    get: async (key: string) => values.get(key) ?? null,
    incr: async (key: string) => {
      const next = Number(values.get(key) ?? 0) + 1;
      values.set(key, String(next));
      return next;
    },
    mget: async (...keys: string[]) => keys.map((key) => values.get(key) ?? null),
    set: async (key: string, value: string) => {
      values.set(key, value);
      return "OK";
    },
    ttl: async (key: string) => ttls.get(key) ?? -1,
    values,
  } as unknown as FakeRedis;
}

/** A Redis whose every command fails, for the fail-open test. */
export function createBrokenRedis(): DavAuthRedis {
  const fail = async () => {
    throw new Error("redis down");
  };
  return {
    del: fail,
    expire: fail,
    get: fail,
    incr: fail,
    mget: fail,
    set: fail,
    ttl: fail,
  } as unknown as DavAuthRedis;
}

export function basicAuth(username: string, password: string): string {
  const encoded = Buffer.from([username, password].join(":")).toString("base64");
  return `Basic ${encoded}`;
}

export async function createTestUser(label: string): Promise<{ email: string; id: string }> {
  const id = randomUUID();
  const email = `${label}-${id}@example.test`;
  await prisma.user.create({ data: { email, emailVerified: true, id, name: label } });
  return { email, id };
}

/** Creates a DAV key under `configId: carddav` and its `carddav_devices` row. */
export async function createDavDevice(
  userId: string,
  name = "Test phone",
): Promise<{ deviceId: string; key: string; keyId: string }> {
  const { auth } = await import("../lib/auth/index.js");
  const created = await auth.api.createApiKey({ body: { configId: "carddav", name, userId } });
  const device = await prisma.carddavDevice.create({
    data: { apiKeyId: created.id, name, userId },
    select: { id: true },
  });
  return { deviceId: device.id, key: created.key, keyId: created.id };
}

/** Creates a REST key (`configId: default`) for the isolation tests. */
export async function createRestKey(userId: string, name = "Test REST key") {
  const { auth } = await import("../lib/auth/index.js");
  const created = await auth.api.createApiKey({ body: { configId: "default", name, userId } });
  return { key: created.key, keyId: created.id };
}

/**
 * Replaces the commands that step-up and Better Auth's secondary storage use on the shared Redis
 * client with an in-memory store, so route tests run without a Redis server and without waiting
 * for connection timeouts. Returns a function that restores the client.
 */
export async function installInMemoryRedisCommands(): Promise<() => void> {
  const { requireRedisCommands } = await import("../lib/data/redis.js");
  const redis = requireRedisCommands();
  const store = new Map<string, string>();
  const original = { del: redis.del, get: redis.get, getdel: redis.getdel, set: redis.set };

  redis.set = (async (key: string, value: string) => {
    store.set(key, value);
    return "OK";
  }) as unknown as typeof redis.set;
  redis.get = (async (key: string) => store.get(key) ?? null) as unknown as typeof redis.get;
  redis.getdel = (async (key: string) => {
    const value = store.get(key) ?? null;
    store.delete(key);
    return value;
  }) as unknown as typeof redis.getdel;
  redis.del = (async (...keys: string[]) => {
    let removed = 0;
    for (const key of keys) {
      removed += store.delete(key) ? 1 : 0;
    }
    return removed;
  }) as unknown as typeof redis.del;

  return () => {
    redis.del = original.del;
    redis.get = original.get;
    redis.getdel = original.getdel;
    redis.set = original.set;
  };
}
