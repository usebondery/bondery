import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { redisStorage } from "@better-auth/redis-storage";
import { BETTER_AUTH_REDIS_KEY_PREFIX, wrapWithResilience } from "./secondary-storage.js";

type RedisSecondaryStorage = ReturnType<typeof redisStorage>;

function createMockStorage(overrides: Partial<RedisSecondaryStorage> = {}): RedisSecondaryStorage {
  return {
    clear: async () => {
      // Default mock: this storage does not persist keys.
    },
    delete: async () => {
      // Default mock: this storage does not persist keys.
    },
    get: async () => null,
    getAndDelete: async () => null,
    increment: async () => 1,
    listKeys: async () => [],
    set: async () => {
      // Default mock: this storage does not persist keys.
    },
    ...overrides,
  };
}

describe("wrapWithResilience", () => {
  it("returns null from get when the underlying storage throws", async () => {
    const storage = wrapWithResilience(
      createMockStorage({
        get: async () => {
          throw new Error("redis down");
        },
      }),
    );

    assert.equal(await storage.get("session-token"), null);
  });

  it("does not throw from set when the underlying storage throws", async () => {
    const storage = wrapWithResilience(
      createMockStorage({
        set: async () => {
          throw new Error("redis down");
        },
      }),
    );

    await assert.doesNotReject(async () => storage.set("session-token", "payload", 60));
  });

  it("does not throw from delete when the underlying storage throws", async () => {
    const storage = wrapWithResilience(
      createMockStorage({
        delete: async () => {
          throw new Error("redis down");
        },
      }),
    );

    await assert.doesNotReject(async () => storage.delete("session-token"));
  });
});

describe("better Auth redis key prefix", () => {
  it("prefixes keys with bondery:auth:", async () => {
    const calls: Array<{ command: string; args: unknown[] }> = [];
    const client = {
      setex: async (key: string, ttl: number, value: string) => {
        calls.push({ args: [key, ttl, value], command: "setex" });
        return "OK";
      },
    };

    const storage = redisStorage({
      client: client as never,
      keyPrefix: BETTER_AUTH_REDIS_KEY_PREFIX,
    });
    await storage.set("session-token", "payload", 60);

    const setCall = calls.find((call) => call.command === "setex");
    assert.ok(setCall);
    assert.equal(setCall.args[0], `${BETTER_AUTH_REDIS_KEY_PREFIX}session-token`);
  });
});
