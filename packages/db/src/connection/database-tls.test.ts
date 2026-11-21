import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

import pg from "pg";

import {
  describeDatabaseTls,
  pgConnectionConfig,
  prismaCliUrl,
  resolveDatabaseTls,
  stripTlsParams,
} from "./database-tls.js";

const URL_BASE = "postgresql://bondery_app:pw@bondery-db:5432/bondery";

/**
 * A real CA certificate (public part only), so PEM validation runs for real. The resolver only
 * parses it; its validity dates do not matter here.
 */
const PEM = `-----BEGIN CERTIFICATE-----
MIIBcTCCARegAwIBAgIQET7mGaqsswvIbmI41+eXcDAKBggqhkjOPQQDAjAXMRUw
EwYDVQQDEwxVbnJlbGF0ZWQgQ0EwHhcNMjYxMTE3MjE1MjAwWhcNMjYxMjE4MjE1
MjAwWjAXMRUwEwYDVQQDEwxVbnJlbGF0ZWQgQ0EwWTATBgcqhkjOPQIBBggqhkjO
PQMBBwNCAATlVkf2cgpWyUI10m+jRCQZBSGFvzRx4SovdbFGYhi9uk3WKz15whE4
NwgTZpPV01DH5IaEtHvVzDUi0YQh/U+qo0UwQzASBgNVHRMBAf8ECDAGAQH/AgEA
MA4GA1UdDwEB/wQEAwIBBjAdBgNVHQ4EFgQUbXARXoADfg82A/cCsqmdIWt7/y8w
CgYIKoZIzj0EAwIDSAAwRQIhANlM9Y5TOn/kWuITg21lS51gUuINhcas6UsEY54G
6pfHAiAFaGj2JR0+CSgwuYKcwN5rTY1IgAOZPUoQCO1qUkikQA==
-----END CERTIFICATE-----`;

function fixedReader(contents: string): (path: string) => string {
  return () => contents;
}

describe("resolveDatabaseTls", () => {
  it("defaults to verify-full with the system CAs", () => {
    assert.deepEqual(resolveDatabaseTls(URL_BASE, {}), {
      ca: { kind: "system" },
      mode: "verify-full",
    });
  });

  it("reads the mode and CA file from the environment", () => {
    const settings = resolveDatabaseTls(URL_BASE, {
      DATABASE_SSL_MODE: "verify-ca",
      DATABASE_SSL_ROOT_CERT_FILE: "ca.crt",
    });
    assert.equal(settings.mode, "verify-ca");
    assert.deepEqual(settings.ca, { kind: "file", path: resolve("ca.crt") });
  });

  it("takes sslmode and sslrootcert from a provider URL when the environment is silent", () => {
    const settings = resolveDatabaseTls(`${URL_BASE}?sslmode=verify-full&sslrootcert=system`, {});
    assert.deepEqual(settings, { ca: { kind: "system" }, mode: "verify-full" });
  });

  it("rejects a URL sslmode that contradicts DATABASE_SSL_MODE", () => {
    assert.throws(
      () => resolveDatabaseTls(`${URL_BASE}?sslmode=disable`, { DATABASE_SSL_MODE: "verify-full" }),
      /DATABASE_SSL_MODE is verify-full but the database URL has sslmode=disable/,
    );
  });

  it("refuses modes that can silently fall back to plaintext", () => {
    for (const mode of ["prefer", "allow"]) {
      assert.throws(
        () => resolveDatabaseTls(URL_BASE, { DATABASE_SSL_MODE: mode }),
        /falls back to an unencrypted connection/,
      );
    }
  });

  it("refuses an unknown mode", () => {
    assert.throws(
      () => resolveDatabaseTls(URL_BASE, { DATABASE_SSL_MODE: "on" }),
      /must be one of/,
    );
  });

  it("refuses a CA file and an inline CA together", () => {
    assert.throws(
      () =>
        resolveDatabaseTls(URL_BASE, {
          DATABASE_SSL_ROOT_CERT: PEM,
          DATABASE_SSL_ROOT_CERT_FILE: "ca.crt",
        }),
      /not both/,
    );
  });

  it("refuses a CA with a mode that does not check it", () => {
    for (const mode of ["disable", "require"]) {
      assert.throws(
        () =>
          resolveDatabaseTls(URL_BASE, {
            DATABASE_SSL_MODE: mode,
            DATABASE_SSL_ROOT_CERT_FILE: "ca.crt",
          }),
        /does not check it/,
      );
    }
  });

  it("refuses client certificate parameters instead of ignoring them", () => {
    assert.throws(
      () => resolveDatabaseTls(`${URL_BASE}?sslcert=client.crt`, {}),
      /Client certificates/,
    );
  });

  it("refuses a URL CA that differs from the configured one", () => {
    assert.throws(
      () =>
        resolveDatabaseTls(`${URL_BASE}?sslrootcert=other.crt`, {
          DATABASE_SSL_ROOT_CERT_FILE: "ca.crt",
        }),
      /Keep one/,
    );
  });

  it("reads a literal \\n in an inline PEM as a newline", () => {
    const settings = resolveDatabaseTls(URL_BASE, {
      DATABASE_SSL_ROOT_CERT: PEM.replace(/\n/g, "\\n"),
    });
    assert.deepEqual(settings.ca, { kind: "inline", pem: PEM });
  });
});

describe("stripTlsParams", () => {
  it("removes every TLS parameter and keeps the others", () => {
    const stripped = stripTlsParams(
      `${URL_BASE}?sslmode=disable&sslrootcert=x&ssl=true&uselibpqcompat=true&sslaccept=strict&application_name=api`,
    );
    assert.equal(stripped, `${URL_BASE}?application_name=api`);
  });
});

describe("pgConnectionConfig", () => {
  it("never passes a URL sslmode through to pg, which would override the ssl option", () => {
    const config = pgConnectionConfig(`${URL_BASE}?sslmode=verify-full`, {}, fixedReader(PEM));
    assert.ok(!config.connectionString.includes("sslmode"));
  });

  it("verify-full: trusts only the configured CA and checks the hostname", () => {
    const config = pgConnectionConfig(
      URL_BASE,
      { DATABASE_SSL_ROOT_CERT_FILE: "ca.crt" },
      fixedReader(PEM),
    );
    assert.equal(config.enableChannelBinding, true);
    assert.ok(config.ssl);
    assert.equal(config.ssl.rejectUnauthorized, true);
    assert.equal(config.ssl.ca, PEM);
    assert.equal(config.ssl.checkServerIdentity, undefined);
  });

  it("verify-full without a CA uses the system CAs", () => {
    const config = pgConnectionConfig(URL_BASE, {}, fixedReader(""));
    assert.ok(config.ssl);
    assert.equal(config.ssl.ca, undefined);
    assert.equal(config.ssl.rejectUnauthorized, true);
  });

  it("verify-ca: checks the CA but not the hostname", () => {
    const config = pgConnectionConfig(
      URL_BASE,
      { DATABASE_SSL_MODE: "verify-ca", DATABASE_SSL_ROOT_CERT_FILE: "ca.crt" },
      fixedReader(PEM),
    );
    assert.ok(config.ssl);
    assert.equal(config.ssl.rejectUnauthorized, true);
    assert.equal(typeof config.ssl.checkServerIdentity, "function");
  });

  it("require: encrypts without checking the certificate", () => {
    const config = pgConnectionConfig(URL_BASE, { DATABASE_SSL_MODE: "require" });
    assert.deepEqual(config.ssl, { rejectUnauthorized: false });
    assert.equal(config.enableChannelBinding, true);
  });

  it("disable: no TLS and no channel binding", () => {
    const config = pgConnectionConfig(URL_BASE, { DATABASE_SSL_MODE: "disable" });
    assert.equal(config.ssl, false);
    assert.equal(config.enableChannelBinding, false);
  });

  it("names the variable and path when the CA file cannot be read", () => {
    assert.throws(
      () =>
        pgConnectionConfig(URL_BASE, { DATABASE_SSL_ROOT_CERT_FILE: "missing.crt" }, () => {
          throw new Error("ENOENT");
        }),
      /DATABASE_SSL_ROOT_CERT_FILE points to a file that cannot be read \(.*missing\.crt\)/,
    );
  });

  it("rejects a CA file that is not a PEM certificate", () => {
    assert.throws(
      () =>
        pgConnectionConfig(
          URL_BASE,
          { DATABASE_SSL_ROOT_CERT_FILE: "ca.crt" },
          fixedReader("hello"),
        ),
      /does not contain a PEM certificate/,
    );
  });
});

describe("prismaCliUrl", () => {
  it("verify-full: Prisma's own strict mode with an absolute CA path", () => {
    const url = new URL(prismaCliUrl(URL_BASE, { DATABASE_SSL_ROOT_CERT_FILE: "certs/ca.crt" }));
    assert.equal(url.searchParams.get("sslmode"), "require");
    assert.equal(url.searchParams.get("sslaccept"), "strict");
    assert.equal(url.searchParams.get("sslcert"), resolve("certs/ca.crt"));
  });

  it("never forwards libpq's verify-full or sslrootcert, which the schema engine ignores", () => {
    const url = new URL(prismaCliUrl(`${URL_BASE}?sslmode=verify-full&sslrootcert=ca.crt`, {}));
    assert.equal(url.searchParams.get("sslmode"), "require");
    assert.equal(url.searchParams.get("sslrootcert"), null);
    assert.equal(url.searchParams.get("sslcert"), resolve("ca.crt"));
  });

  it("verify-full with system CAs: strict and no sslcert", () => {
    const url = new URL(prismaCliUrl(URL_BASE, {}));
    assert.equal(url.searchParams.get("sslaccept"), "strict");
    assert.equal(url.searchParams.get("sslcert"), null);
  });

  it("verify-ca maps to strict, because Prisma cannot skip only the hostname", () => {
    const url = new URL(prismaCliUrl(URL_BASE, { DATABASE_SSL_MODE: "verify-ca" }));
    assert.equal(url.searchParams.get("sslaccept"), "strict");
  });

  it("require and disable map to Prisma's equivalents", () => {
    const required = new URL(prismaCliUrl(URL_BASE, { DATABASE_SSL_MODE: "require" }));
    assert.equal(required.searchParams.get("sslaccept"), "accept_invalid_certs");
    const disabled = new URL(prismaCliUrl(URL_BASE, { DATABASE_SSL_MODE: "disable" }));
    assert.equal(disabled.searchParams.get("sslmode"), "disable");
  });

  it("writes an inline CA to a file, because Prisma only accepts a path", () => {
    const url = new URL(prismaCliUrl(URL_BASE, { DATABASE_SSL_ROOT_CERT: PEM }));
    const path = url.searchParams.get("sslcert");
    assert.ok(path);
    assert.equal(readFileSync(path, "utf8").trim(), PEM);
  });
});

describe("describeDatabaseTls", () => {
  it("reports what a log line needs and never a certificate", () => {
    const description = describeDatabaseTls(URL_BASE, { DATABASE_SSL_ROOT_CERT: PEM });
    assert.deepEqual(description, {
      authenticated: true,
      ca: "inline",
      encrypted: true,
      mode: "verify-full",
    });
    assert.ok(!JSON.stringify(description).includes("BEGIN CERTIFICATE"));
  });
});

/**
 * Live checks against a Postgres that serves TLS with the bundled CA, such as the dev database
 * (`pnpm run start:postgres`). Set BONDERY_DEV_TLS_TEST_DATABASE_URL (owner URL, host `localhost`) and
 * BONDERY_DEV_TLS_TEST_CA_FILE to run them.
 */
describe("against a TLS Postgres", () => {
  const url = process.env.BONDERY_DEV_TLS_TEST_DATABASE_URL;
  const caFile = process.env.BONDERY_DEV_TLS_TEST_CA_FILE;

  async function query(config: pg.ClientConfig): Promise<Record<string, unknown>> {
    const client = new pg.Client(config);
    await client.connect();
    try {
      const { rows } = await client.query(
        "select ssl, version from pg_stat_ssl where pid = pg_backend_pid()",
      );
      return rows[0];
    } finally {
      await client.end();
    }
  }

  it("connects with verify-full and TLS", { skip: !url || !caFile }, async () => {
    const config = pgConnectionConfig(url as string, { DATABASE_SSL_ROOT_CERT_FILE: caFile });
    const row = await query(config);
    assert.equal(row.ssl, true);
  });

  it("is refused without TLS", { skip: !url || !caFile }, async () => {
    const config = pgConnectionConfig(url as string, { DATABASE_SSL_MODE: "disable" });
    await assert.rejects(query(config), /no encryption/);
  });

  it("refuses a server whose certificate the CA did not sign", {
    skip: !url || !caFile,
  }, async () => {
    const config = pgConnectionConfig(url as string, {}, () => "");
    // System CAs do not include the bundled private CA.
    await assert.rejects(query(config), /certificate/i);
  });
});
