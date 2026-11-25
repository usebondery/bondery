import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { pgConnectionConfig } from "@bondery/db";
import pg from "pg";

import {
  inspectDatabaseTls,
  logCertificateExpiry,
  POSTGRES_CERT_ERROR_DAYS,
  POSTGRES_CERT_WARN_DAYS,
  warnOnInsecureProductionPostgres,
} from "./postgres-tls.js";

const TLSV1_PATTERN = /^TLSv1\.[23]$/u;
const NOT_ENCRYPTED_PATTERN = /not encrypted/u;
const FORCE_RECREATE_STACK_SECRETS_DB_API_PATTERN = /--force-recreate stack-secrets db api/u;
const NOT_VERIFIED_PATTERN = /not verified/u;

function recordingLog() {
  const calls: { level: string; message: string }[] = [];
  return {
    calls,
    log: {
      error: (_object: unknown, message: string) => {
        calls.push({ level: "error", message });
      },
      warn: (_object: unknown, message: string) => {
        calls.push({ level: "warn", message });
      },
    },
  };
}

describe("logCertificateExpiry", () => {
  it("stays quiet while the certificate has more than the renewal window left", () => {
    const { calls, log } = recordingLog();
    assert.equal(logCertificateExpiry(log as never, POSTGRES_CERT_WARN_DAYS), null);
    assert.equal(logCertificateExpiry(log as never, null), null);
    assert.equal(calls.length, 0);
  });

  it("warns inside the renewal window and errors in the last days", () => {
    const { calls, log } = recordingLog();
    assert.equal(logCertificateExpiry(log as never, POSTGRES_CERT_WARN_DAYS - 1), "warn");
    assert.equal(logCertificateExpiry(log as never, POSTGRES_CERT_ERROR_DAYS - 1), "error");
    assert.match(calls[0]?.message ?? "", FORCE_RECREATE_STACK_SECRETS_DB_API_PATTERN);
  });
});

describe("warnOnInsecureProductionPostgres", () => {
  const verified = {
    authenticated: true,
    ca: "file",
    encrypted: true,
    mode: "verify-full",
  } as const;
  const encryptedOnly = {
    authenticated: false,
    ca: "system",
    encrypted: true,
    mode: "require",
  } as const;
  const plaintext = {
    authenticated: false,
    ca: "system",
    encrypted: false,
    mode: "disable",
  } as const;

  it("is silent outside production and with verified TLS", () => {
    const { calls, log } = recordingLog();
    assert.equal(warnOnInsecureProductionPostgres(log as never, plaintext, "development"), false);
    assert.equal(warnOnInsecureProductionPostgres(log as never, verified, "production"), false);
    assert.equal(calls.length, 0);
  });

  it("warns in production without a verified server", () => {
    const { calls, log } = recordingLog();
    assert.equal(warnOnInsecureProductionPostgres(log as never, encryptedOnly, "production"), true);
    assert.equal(warnOnInsecureProductionPostgres(log as never, plaintext, "production"), true);
    assert.match(calls[0]?.message ?? "", NOT_VERIFIED_PATTERN);
    assert.match(calls[1]?.message ?? "", NOT_ENCRYPTED_PATTERN);
  });
});

/**
 * Live inspection against a Postgres with the bundled TLS setup. Set BONDERY_DEV_TLS_TEST_DATABASE_URL and
 * BONDERY_DEV_TLS_TEST_CA_FILE (see packages/db/src/connection/database-tls.test.ts) to run it.
 */
describe("inspectDatabaseTls against a TLS Postgres", () => {
  const url = process.env["BONDERY_DEV_TLS_TEST_DATABASE_URL"];
  const caFile = process.env["BONDERY_DEV_TLS_TEST_CA_FILE"];

  it("reports the negotiated TLS session and the certificate expiry", {
    skip: !url || !caFile,
  }, async () => {
    const pool = new pg.Pool({
      ...pgConnectionConfig(url as string, { DATABASE_SSL_ROOT_CERT_FILE: caFile }),
      max: 1,
    });
    try {
      const inspection = await inspectDatabaseTls(pool);
      assert.equal(inspection.ssl, true);
      assert.match(inspection.version ?? "", TLSV1_PATTERN);
      assert.ok(inspection.cipher);
      assert.ok((inspection.certificateDaysLeft ?? 0) > POSTGRES_CERT_WARN_DAYS);
    } finally {
      await pool.end();
    }
  });
});
