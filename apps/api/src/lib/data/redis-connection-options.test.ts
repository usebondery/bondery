import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  describeRedisSecurity,
  REDIS_PASSWORD_FILE_ENV,
  REDIS_TLS_CA_FILE_ENV,
  resolveRedisConnectionOptions,
} from "./redis-connection-options.js";

const FILES: Record<string, string> = {
  "/secrets/ca.crt": "-----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----\n",
  "/secrets/empty": "  \n",
  "/secrets/password": "s3cret\n",
};

function readFake(path: string): string {
  const contents = FILES[path];
  if (contents === undefined) {
    throw new Error("ENOENT");
  }
  return contents;
}

describe("resolveRedisConnectionOptions", () => {
  it("adds nothing for a plain URL without secret files", () => {
    assert.deepEqual(resolveRedisConnectionOptions("redis://127.0.0.1:26636", {}, readFake), {});
  });

  it("reads the password and pinned CA from files", () => {
    const options = resolveRedisConnectionOptions(
      "rediss://bondery-redis:6379",
      {
        [REDIS_PASSWORD_FILE_ENV]: "/secrets/password",
        [REDIS_TLS_CA_FILE_ENV]: "/secrets/ca.crt",
      },
      readFake,
    );
    assert.equal(options.password, "s3cret");
    assert.deepEqual(options.tls, { ca: readFake("/secrets/ca.crt").trim() });
  });

  it("rejects a CA file on a URL without TLS", () => {
    assert.throws(
      () =>
        resolveRedisConnectionOptions(
          "redis://redis:6379",
          { [REDIS_TLS_CA_FILE_ENV]: "/secrets/ca.crt" },
          readFake,
        ),
      /rediss:\/\//,
    );
  });

  it("rejects a password in both the URL and a file", () => {
    assert.throws(
      () =>
        resolveRedisConnectionOptions(
          "rediss://:inline@redis:6379",
          { [REDIS_PASSWORD_FILE_ENV]: "/secrets/password" },
          readFake,
        ),
      /not both/,
    );
  });

  it("names the variable when a secret file is missing or empty", () => {
    assert.throws(
      () =>
        resolveRedisConnectionOptions(
          "rediss://redis:6379",
          { [REDIS_PASSWORD_FILE_ENV]: "/secrets/missing" },
          readFake,
        ),
      new RegExp(REDIS_PASSWORD_FILE_ENV),
    );
    assert.throws(
      () =>
        resolveRedisConnectionOptions(
          "rediss://redis:6379",
          { [REDIS_PASSWORD_FILE_ENV]: "/secrets/empty" },
          readFake,
        ),
      /empty file/,
    );
  });
});

describe("describeRedisSecurity", () => {
  it("flags plain, unauthenticated Redis", () => {
    assert.deepEqual(describeRedisSecurity("redis://redis:6379", {}), {
      authenticated: false,
      tls: false,
    });
  });

  it("accepts a password from the URL or from a file", () => {
    assert.deepEqual(describeRedisSecurity("rediss://:pw@redis:6379", {}), {
      authenticated: true,
      tls: true,
    });
    assert.deepEqual(
      describeRedisSecurity("rediss://redis:6379", {
        [REDIS_PASSWORD_FILE_ENV]: "/secrets/password",
      }),
      { authenticated: true, tls: true },
    );
  });
});
