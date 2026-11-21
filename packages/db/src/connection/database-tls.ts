/**
 * One place that decides how every Postgres connection uses TLS (see
 * docs/deploy/configuration.mdx#postgres-tls). Every `pg` Pool or Client, pg-boss, and the Prisma
 * CLI get their settings from here; `check:db-connections` fails on a connection that does not.
 *
 * Environment:
 *
 * - `DATABASE_SSL_MODE`: `verify-full` (default), `verify-ca`, `require`, or `disable`.
 * - `DATABASE_SSL_ROOT_CERT_FILE`: PEM file with the CA certificate(s) to trust.
 * - `DATABASE_SSL_ROOT_CERT`: the same PEM inline, for platforms that only take variables
 *   (a literal `\n` is read as a newline). Set at most one of the two. With neither, the
 *   system CAs apply, which suits managed Postgres with public certificates.
 *
 * A provider URL may carry `sslmode` and `sslrootcert`. They are read when the environment does
 * not set the same thing, a conflict is an error, and they are removed from the URL before `pg`
 * sees it: `pg` applies URL parameters after explicit options, so a stray `sslmode=disable`
 * would silently turn TLS off.
 */

import { createHash, X509Certificate } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { ConnectionOptions } from "node:tls";

export const DATABASE_SSL_MODE_ENV = "DATABASE_SSL_MODE";
export const DATABASE_SSL_ROOT_CERT_FILE_ENV = "DATABASE_SSL_ROOT_CERT_FILE";
export const DATABASE_SSL_ROOT_CERT_ENV = "DATABASE_SSL_ROOT_CERT";

export const DATABASE_SSL_MODES = ["verify-full", "verify-ca", "require", "disable"] as const;
export type DatabaseSslMode = (typeof DATABASE_SSL_MODES)[number];

export type DatabaseTlsEnv = Partial<
  Record<
    | typeof DATABASE_SSL_MODE_ENV
    | typeof DATABASE_SSL_ROOT_CERT_FILE_ENV
    | typeof DATABASE_SSL_ROOT_CERT_ENV,
    string
  >
>;

export type DatabaseCaSource =
  | { kind: "file"; path: string }
  | { kind: "inline"; pem: string }
  | { kind: "system" };

export type DatabaseTlsSettings = {
  ca: DatabaseCaSource;
  mode: DatabaseSslMode;
};

/** TLS-related URL parameters understood by libpq, `pg`, or Prisma. All are removed from URLs. */
const URL_TLS_PARAMS = [
  "sslmode",
  "sslrootcert",
  "ssl",
  "uselibpqcompat",
  "sslaccept",
  "sslcert",
  "sslkey",
  "sslidentity",
  "sslpassword",
] as const;

/** Client certificates (mTLS) are not supported; reject them instead of ignoring them. */
const UNSUPPORTED_URL_PARAMS = ["sslcert", "sslkey", "sslidentity", "sslpassword"] as const;

function parseMode(value: string, source: string): DatabaseSslMode {
  const mode = value.trim().toLowerCase();
  if (mode === "prefer" || mode === "allow") {
    throw new Error(
      `${source} is "${mode}", which falls back to an unencrypted connection. Use verify-full (recommended), verify-ca, require, or disable`,
    );
  }
  if (!(DATABASE_SSL_MODES as readonly string[]).includes(mode)) {
    throw new Error(`${source} must be one of: ${DATABASE_SSL_MODES.join(", ")}`);
  }
  return mode as DatabaseSslMode;
}

function parseUrl(databaseUrl: string): URL {
  try {
    return new URL(databaseUrl);
  } catch (error) {
    throw new Error("The database URL is not a valid URL (expected postgresql://…)", {
      cause: error,
    });
  }
}

function normalizeInlinePem(value: string): string {
  return value.replace(/\\n/g, "\n").trim();
}

function caFromEnv(env: DatabaseTlsEnv): DatabaseCaSource | null {
  const file = env[DATABASE_SSL_ROOT_CERT_FILE_ENV]?.trim();
  const inline = env[DATABASE_SSL_ROOT_CERT_ENV]?.trim();
  if (file && inline) {
    throw new Error(
      `Set ${DATABASE_SSL_ROOT_CERT_FILE_ENV} or ${DATABASE_SSL_ROOT_CERT_ENV}, not both`,
    );
  }
  if (file) {
    return { kind: "file", path: resolve(file) };
  }
  if (inline) {
    return { kind: "inline", pem: normalizeInlinePem(inline) };
  }
  return null;
}

function caFromUrl(url: URL): DatabaseCaSource | null {
  const rootCert = url.searchParams.get("sslrootcert")?.trim();
  if (!rootCert) {
    return null;
  }
  // libpq's special value: trust the system CAs.
  return rootCert === "system" ? { kind: "system" } : { kind: "file", path: resolve(rootCert) };
}

function sameCa(left: DatabaseCaSource, right: DatabaseCaSource): boolean {
  if (left.kind !== right.kind) {
    return false;
  }
  if (left.kind === "file" && right.kind === "file") {
    return left.path === right.path;
  }
  return left.kind === "system";
}

/**
 * Resolve the TLS settings for a database URL. Reads no files, so it never fails because a CA
 * file is not there yet; `pgConnectionConfig` reads it when a connection is configured.
 */
export function resolveDatabaseTls(
  databaseUrl: string,
  env: DatabaseTlsEnv = process.env as DatabaseTlsEnv,
): DatabaseTlsSettings {
  const url = parseUrl(databaseUrl);
  for (const param of UNSUPPORTED_URL_PARAMS) {
    if (url.searchParams.has(param)) {
      throw new Error(
        `The database URL sets ${param}. Client certificates are not supported; remove it and use ${DATABASE_SSL_ROOT_CERT_FILE_ENV} for the server CA`,
      );
    }
  }

  const envModeValue = env[DATABASE_SSL_MODE_ENV]?.trim();
  const urlModeValue = url.searchParams.get("sslmode")?.trim();
  const envMode = envModeValue ? parseMode(envModeValue, DATABASE_SSL_MODE_ENV) : null;
  const urlMode = urlModeValue ? parseMode(urlModeValue, "sslmode in the database URL") : null;
  if (envMode && urlMode && envMode !== urlMode) {
    throw new Error(
      `${DATABASE_SSL_MODE_ENV} is ${envMode} but the database URL has sslmode=${urlMode}. Remove sslmode from the URL or make them match`,
    );
  }
  const mode = envMode ?? urlMode ?? "verify-full";

  const envCa = caFromEnv(env);
  const urlCa = caFromUrl(url);
  if (envCa && urlCa && !sameCa(envCa, urlCa)) {
    throw new Error(
      `The database URL has sslrootcert and ${DATABASE_SSL_ROOT_CERT_FILE_ENV} or ${DATABASE_SSL_ROOT_CERT_ENV} is set too. Keep one`,
    );
  }
  const ca = envCa ?? urlCa ?? { kind: "system" };

  if (ca.kind !== "system" && (mode === "disable" || mode === "require")) {
    throw new Error(
      `A CA certificate is configured, but ${DATABASE_SSL_MODE_ENV} is ${mode}, which does not check it. Use verify-full`,
    );
  }
  return { ca, mode };
}

/** The URL without any TLS parameter, so `pg` cannot override the resolved settings. */
export function stripTlsParams(databaseUrl: string): string {
  const url = parseUrl(databaseUrl);
  for (const param of URL_TLS_PARAMS) {
    url.searchParams.delete(param);
  }
  return url.toString();
}

type ReadTextFile = (path: string) => string;

function readCaPem(ca: DatabaseCaSource, readTextFile: ReadTextFile): string | undefined {
  if (ca.kind === "system") {
    return undefined;
  }
  let pem: string;
  if (ca.kind === "inline") {
    pem = ca.pem;
  } else {
    try {
      pem = readTextFile(ca.path).trim();
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(
        `${DATABASE_SSL_ROOT_CERT_FILE_ENV} points to a file that cannot be read (${ca.path}): ${reason}`,
        { cause: error },
      );
    }
  }
  const source =
    ca.kind === "inline" ? DATABASE_SSL_ROOT_CERT_ENV : DATABASE_SSL_ROOT_CERT_FILE_ENV;
  if (!pem.includes("-----BEGIN CERTIFICATE-----")) {
    throw new Error(`${source} does not contain a PEM certificate`);
  }
  let certificate: X509Certificate;
  try {
    certificate = new X509Certificate(pem);
  } catch (error) {
    throw new Error(`${source} does not contain a valid PEM certificate`, { cause: error });
  }
  if (certificate.raw.byteLength === 0) {
    throw new Error(`${source} does not contain a valid PEM certificate`);
  }
  return pem;
}

export type PgConnectionConfig = {
  connectionString: string;
  /** SCRAM-SHA-256-PLUS: binds the password exchange to the TLS session. */
  enableChannelBinding: boolean;
  ssl: false | ConnectionOptions;
};

/**
 * Options for a `pg` Pool or Client, or pg-boss: spread them into the constructor.
 * Reads the CA file, so a missing or invalid file fails here with the variable named.
 */
export function pgConnectionConfig(
  databaseUrl: string,
  env: DatabaseTlsEnv = process.env as DatabaseTlsEnv,
  readTextFile: ReadTextFile = (path) => readFileSync(path, "utf8"),
): PgConnectionConfig {
  const settings = resolveDatabaseTls(databaseUrl, env);
  const connectionString = stripTlsParams(databaseUrl);
  if (settings.mode === "disable") {
    return { connectionString, enableChannelBinding: false, ssl: false };
  }
  if (settings.mode === "require") {
    return { connectionString, enableChannelBinding: true, ssl: { rejectUnauthorized: false } };
  }
  const ca = readCaPem(settings.ca, readTextFile);
  const ssl: ConnectionOptions = {
    rejectUnauthorized: true,
    ...(ca ? { ca } : {}),
    ...(settings.mode === "verify-ca" ? { checkServerIdentity: () => undefined } : {}),
  };
  return { connectionString, enableChannelBinding: true, ssl };
}

/** Hex characters of the CA hash kept in the temp file name. */
const CA_FILE_DIGEST_LENGTH = 16;

/** Write an inline CA to a private temp file once, for tools that only accept a path. */
function inlineCaFile(pem: string): string {
  const digest = createHash("sha256").update(pem).digest("hex").slice(0, CA_FILE_DIGEST_LENGTH);
  const path = join(tmpdir(), `bondery-postgres-ca-${digest}.crt`);
  if (!existsSync(path)) {
    writeFileSync(path, `${pem}\n`, { mode: 0o600 });
  }
  return path;
}

/**
 * The URL for the Prisma CLI (`prisma migrate`, which runs Prisma's native schema engine).
 *
 * The schema engine understands only Prisma's own parameters. It silently ignores libpq's
 * `sslmode=verify-full` and `sslrootcert`, so they must never reach it. `sslaccept=strict`
 * checks the CA and the hostname; Prisma has no mode that skips only the hostname, so
 * verify-ca is stricter here. `sslcert` must be absolute: Prisma resolves a relative path
 * against the `prisma/` folder.
 */
export function prismaCliUrl(
  databaseUrl: string,
  env: DatabaseTlsEnv = process.env as DatabaseTlsEnv,
): string {
  const settings = resolveDatabaseTls(databaseUrl, env);
  const url = new URL(stripTlsParams(databaseUrl));
  if (settings.mode === "disable") {
    url.searchParams.set("sslmode", "disable");
    return url.toString();
  }
  url.searchParams.set("sslmode", "require");
  if (settings.mode === "require") {
    url.searchParams.set("sslaccept", "accept_invalid_certs");
    return url.toString();
  }
  url.searchParams.set("sslaccept", "strict");
  if (settings.ca.kind === "file") {
    url.searchParams.set("sslcert", settings.ca.path);
  } else if (settings.ca.kind === "inline") {
    url.searchParams.set("sslcert", inlineCaFile(settings.ca.pem));
  }
  return url.toString();
}

export type DatabaseTlsDescription = {
  authenticated: boolean;
  ca: DatabaseCaSource["kind"];
  encrypted: boolean;
  mode: DatabaseSslMode;
};

/** Safe to log: never includes a certificate or a path's contents. */
export function describeDatabaseTls(
  databaseUrl: string,
  env: DatabaseTlsEnv = process.env as DatabaseTlsEnv,
): DatabaseTlsDescription {
  const settings = resolveDatabaseTls(databaseUrl, env);
  return {
    authenticated: settings.mode === "verify-full" || settings.mode === "verify-ca",
    ca: settings.ca.kind,
    encrypted: settings.mode !== "disable",
    mode: settings.mode,
  };
}
