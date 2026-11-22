import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  describeRedisSecurity,
  REDIS_PASSWORD_FILE_ENV,
  REDIS_TLS_CA_FILE_ENV,
  REDIS_TLS_CERT_FILE_ENV,
  REDIS_TLS_KEY_FILE_ENV,
  resolveRedisConnectionOptions,
} from "./redis-connection-options.js";

const REDISS_PATTERN = /rediss:\/\//;
const NOT_BOTH_PATTERN = /not both/;
const EMPTY_FILE_PATTERN = /empty file/;
const BOTH_CERT_FILES_PATTERN = /Set both/;

const FILES: Record<string, string> = {
  "/secrets/ca.crt": "-----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----\n",
  "/secrets/client.crt": "-----BEGIN CERTIFICATE-----\nclient\n-----END CERTIFICATE-----\n",
  "/secrets/client.key": "-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----\n",
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
    assert.deepEqual(options.tls, {
      ca: readFake("/secrets/ca.crt").trim(),
      minVersion: "TLSv1.2",
      rejectUnauthorized: true,
    });
  });

  it("adds client cert and key when both files are set", () => {
    const options = resolveRedisConnectionOptions(
      "rediss://bondery-redis:6379",
      {
        [REDIS_TLS_CA_FILE_ENV]: "/secrets/ca.crt",
        [REDIS_TLS_CERT_FILE_ENV]: "/secrets/client.crt",
        [REDIS_TLS_KEY_FILE_ENV]: "/secrets/client.key",
      },
      readFake,
    );
    assert.deepEqual(options.tls, {
      ca: readFake("/secrets/ca.crt").trim(),
      cert: readFake("/secrets/client.crt").trim(),
      key: readFake("/secrets/client.key").trim(),
      minVersion: "TLSv1.2",
      rejectUnauthorized: true,
    });
  });

  it("rejects a CA file on a URL without TLS", () => {
    assert.throws(
      () =>
        resolveRedisConnectionOptions(
          "redis://redis:6379",
          { [REDIS_TLS_CA_FILE_ENV]: "/secrets/ca.crt" },
          readFake,
        ),
      REDISS_PATTERN,
    );
  });

  it("rejects client cert files on a URL without TLS", () => {
    assert.throws(
      () =>
        resolveRedisConnectionOptions(
          "redis://redis:6379",
          {
            [REDIS_TLS_CERT_FILE_ENV]: "/secrets/client.crt",
            [REDIS_TLS_KEY_FILE_ENV]: "/secrets/client.key",
          },
          readFake,
        ),
      REDISS_PATTERN,
    );
  });

  it("rejects when only one client cert file is set", () => {
    assert.throws(
      () =>
        resolveRedisConnectionOptions(
          "rediss://redis:6379",
          { [REDIS_TLS_CERT_FILE_ENV]: "/secrets/client.crt" },
          readFake,
        ),
      BOTH_CERT_FILES_PATTERN,
    );
    assert.throws(
      () =>
        resolveRedisConnectionOptions(
          "rediss://redis:6379",
          { [REDIS_TLS_KEY_FILE_ENV]: "/secrets/client.key" },
          readFake,
        ),
      BOTH_CERT_FILES_PATTERN,
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
      NOT_BOTH_PATTERN,
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
      EMPTY_FILE_PATTERN,
    );
  });
});

describe("describeRedisSecurity", () => {
  it("flags plain, unauthenticated Redis", () => {
    assert.deepEqual(describeRedisSecurity("redis://redis:6379", {}), {
      authenticated: false,
      mutualTls: false,
      tls: false,
    });
  });

  it("accepts a password from the URL or from a file", () => {
    assert.deepEqual(describeRedisSecurity("rediss://:pw@redis:6379", {}), {
      authenticated: true,
      mutualTls: false,
      tls: true,
    });
    assert.deepEqual(
      describeRedisSecurity("rediss://redis:6379", {
        [REDIS_PASSWORD_FILE_ENV]: "/secrets/password",
      }),
      { authenticated: true, mutualTls: false, tls: true },
    );
  });

  it("reports mutualTls when both cert file env vars are set", () => {
    assert.deepEqual(
      describeRedisSecurity("rediss://redis:6379", {
        [REDIS_TLS_CERT_FILE_ENV]: "/secrets/client.crt",
        [REDIS_TLS_KEY_FILE_ENV]: "/secrets/client.key",
      }),
      { authenticated: false, mutualTls: true, tls: true },
    );
    assert.deepEqual(
      describeRedisSecurity("rediss://redis:6379", {
        [REDIS_TLS_CERT_FILE_ENV]: "/secrets/client.crt",
      }),
      { authenticated: false, mutualTls: false, tls: true },
    );
  });
});
