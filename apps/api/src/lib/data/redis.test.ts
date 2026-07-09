import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getRedisCommands,
  getRedisSubscriber,
  resetRedisClientsForTests,
  shutdownRedis,
} from "./redis.js";

describe("redis shared clients", () => {
  it("returns undefined when PRIVATE_REDIS_URL is unset", () => {
    const previous = process.env.PRIVATE_REDIS_URL;
    delete process.env.PRIVATE_REDIS_URL;
    resetRedisClientsForTests();

    try {
      assert.equal(getRedisCommands(), undefined);
      assert.equal(getRedisSubscriber(), undefined);
    } finally {
      if (previous === undefined) {
        delete process.env.PRIVATE_REDIS_URL;
      } else {
        process.env.PRIVATE_REDIS_URL = previous;
      }
      resetRedisClientsForTests();
    }
  });

  it("shutdownRedis is idempotent without open connections", async () => {
    resetRedisClientsForTests();
    await shutdownRedis();
    await shutdownRedis();
  });
});
