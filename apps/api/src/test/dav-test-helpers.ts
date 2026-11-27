/**
 * Shared helpers for the CardDAV foundation tests. They need a migrated Postgres.
 */
import { randomUUID } from "node:crypto";
import { prisma } from "@bondery/db";
import type { DavGuardRedis } from "../lib/platform/auth/dav-login-guard.js";

export type FakeRedis = DavGuardRedis & { values: Map<string, string> };

/** Minimal in-memory Redis: the five commands the DAV login guard uses. */
export function createFakeRedis(): FakeRedis {
  const values = new Map<string, string>();
  const ttls = new Map<string, number>();

  return {
    expire: async (key: string, seconds: number) => {
      ttls.set(key, seconds);
      return 1;
    },
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
export function createBrokenRedis(): DavGuardRedis {
  const fail = async () => {
    throw new Error("redis down");
  };
  return {
    expire: fail,
    incr: fail,
    mget: fail,
    set: fail,
    ttl: fail,
  } as unknown as DavGuardRedis;
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
