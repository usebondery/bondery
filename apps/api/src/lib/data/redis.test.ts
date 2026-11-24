import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getRedisCommands,
  getRedisSubscriber,
  requireRedisCommands,
  resetRedisClientsForTests,
  shutdownRedis,
} from "./redis.js";

const BONDERY_PRIVATE_REDIS_URL_MUST_BE_SET_PATTERN = /BONDERY_PRIVATE_REDIS_URL must be set/;

describe("redis shared clients", () => {
  it("returns undefined when BONDERY_PRIVATE_REDIS_URL is unset", () => {
    const previous = process.env["BONDERY_PRIVATE_REDIS_URL"];
    delete process.env["BONDERY_PRIVATE_REDIS_URL"];
    resetRedisClientsForTests();

    try {
      assert.equal(getRedisCommands(), undefined);
      assert.equal(getRedisSubscriber(), undefined);
    } finally {
      if (previous === undefined) {
        delete process.env["BONDERY_PRIVATE_REDIS_URL"];
      } else {
        process.env["BONDERY_PRIVATE_REDIS_URL"] = previous;
      }
      resetRedisClientsForTests();
    }
  });

  it("requireRedisCommands throws when BONDERY_PRIVATE_REDIS_URL is unset", () => {
    const previous = process.env["BONDERY_PRIVATE_REDIS_URL"];
    delete process.env["BONDERY_PRIVATE_REDIS_URL"];
    resetRedisClientsForTests();

    try {
      assert.throws(() => requireRedisCommands(), BONDERY_PRIVATE_REDIS_URL_MUST_BE_SET_PATTERN);
    } finally {
      if (previous === undefined) {
        delete process.env["BONDERY_PRIVATE_REDIS_URL"];
      } else {
        process.env["BONDERY_PRIVATE_REDIS_URL"] = previous;
      }
      resetRedisClientsForTests();
    }
  });

  it("shutdownRedis is idempotent without open connections", async () => {
    resetRedisClientsForTests();
    await assert.doesNotReject(async () => {
      await shutdownRedis();
      await shutdownRedis();
    });
  });
});
