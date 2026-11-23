/**
 * The only place the API creates S3 clients. Biome (`noRestrictedImports`) rejects importing
 * `S3Client` anywhere else, so every client gets the same TLS settings.
 *
 * TLS (docs/deploy/configuration.mdx#object-storage-tls):
 * - `https://` endpoint: the server certificate and host name are verified. With
 *   `BONDERY_PRIVATE_S3_TLS_CA_FILE` set, the client trusts only the PEM certificates in that
 *   file. The bundled SeaweedFS uses a private CA, and Compose sets the file. Without it, the
 *   system CAs apply (AWS S3, Cloudflare R2, Backblaze B2).
 * - With `BONDERY_PRIVATE_S3_TLS_CERT_FILE` and `_KEY_FILE` set, the client also presents that
 *   certificate (mutual TLS). The bundled gateway requires it. An external provider that does not
 *   ask for one keeps working, because neither variable is set.
 * - `http://` endpoint: plaintext. The API warns about it at boot in production.
 */

import { readFileSync } from "node:fs";
import { Agent } from "node:https";

import { S3Client } from "@aws-sdk/client-s3";

type S3ConnectionEnv = Partial<
  Record<
    typeof S3_TLS_CA_FILE_ENV | typeof S3_TLS_CERT_FILE_ENV | typeof S3_TLS_KEY_FILE_ENV,
    string
  >
>;

type S3ConnectionConfig = {
  accessKeyId: string;
  endpoint: string;
  region: string;
  secretAccessKey: string;
};

/** Socket limits in milliseconds. The SDK sets none by default. */
type S3RequestLimits = {
  connectionTimeout?: number;
  requestTimeout?: number;
};

type S3SecurityPosture = {
  /** The client presents a certificate when the server asks for one (mutual TLS). */
  mutualTls: boolean;
  /** The client trusts only the certificates in `BONDERY_PRIVATE_S3_TLS_CA_FILE`. */
  privateCa: boolean;
  tls: boolean;
};

/** A client certificate and its key, ready for the TLS agent. */
type S3ClientCertificate = {
  cert: string;
  key: string;
};

type ReadTextFile = (path: string) => string;

function readTextFileUtf8(path: string): string {
  return readFileSync(path, "utf8");
}

function readPemFile(
  envName: string,
  path: string,
  marker: string,
  noun: string,
  readTextFile: ReadTextFile,
): string {
  let contents: string;
  try {
    contents = readTextFile(path);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`${envName} points to a file the API cannot read (${path}): ${reason}`, {
      cause: error,
    });
  }
  if (!contents.includes(marker)) {
    throw new Error(`${envName} points to a file with no ${noun} (${path})`);
  }
  return contents;
}

/**
 * An Agent instance, not agent options. Given options, the SDK builds a fresh agent without them
 * for every request that sends `Expect: 100-continue` (uploads of a few MB), so those requests
 * would drop the CA and the client certificate, and fail. Keep-alive and the socket cap match the
 * SDK defaults.
 */
function tlsAgent(ca: string | undefined, client: S3ClientCertificate | undefined): Agent {
  return new Agent({
    keepAlive: true,
    maxSockets: 50,
    ...(ca ? { ca } : {}),
    ...(client ? { cert: client.cert, key: client.key } : {}),
  });
}

function assertHttpsEndpoint(endpoint: string, envNames: string): void {
  if (parseS3Endpoint(endpoint).protocol !== "https:") {
    throw new Error(`${envNames} is set, but ${S3_ENDPOINT_ENV} does not use TLS. Use https://`);
  }
}

export type {
  S3ClientCertificate,
  S3ConnectionConfig,
  S3ConnectionEnv,
  S3RequestLimits,
  S3SecurityPosture,
};

export const S3_ENDPOINT_ENV = "BONDERY_PRIVATE_S3_ENDPOINT";
export const S3_TLS_CA_FILE_ENV = "BONDERY_PRIVATE_S3_TLS_CA_FILE";
export const S3_TLS_CERT_FILE_ENV = "BONDERY_PRIVATE_S3_TLS_CERT_FILE";
export const S3_TLS_KEY_FILE_ENV = "BONDERY_PRIVATE_S3_TLS_KEY_FILE";

export function parseS3Endpoint(endpoint: string): URL {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch (error) {
    throw new Error(`${S3_ENDPOINT_ENV} is not a valid URL (expected https:// or http://)`, {
      cause: error,
    });
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`${S3_ENDPOINT_ENV} must start with https:// or http://`);
  }
  return url;
}

/**
 * The CA certificates the client trusts instead of the system CAs, or undefined for the system
 * CAs. Throws when a CA file is set for a plaintext endpoint: that setup looks verified but is not.
 */
export function resolveS3TrustedCa(
  endpoint: string,
  env: S3ConnectionEnv = process.env,
  readTextFile: ReadTextFile = readTextFileUtf8,
): string | undefined {
  const caFile = env[S3_TLS_CA_FILE_ENV]?.trim();
  if (!caFile) {
    return undefined;
  }
  assertHttpsEndpoint(endpoint, S3_TLS_CA_FILE_ENV);
  return readPemFile(
    S3_TLS_CA_FILE_ENV,
    caFile,
    "-----BEGIN CERTIFICATE-----",
    "PEM certificate",
    readTextFile,
  );
}

/**
 * Reports whether the endpoint uses TLS, a private CA, and a client certificate. Reads no files,
 * so it is safe to log and to call when the files may not be mounted.
 */
export function describeS3Security(
  endpoint: string,
  env: S3ConnectionEnv = process.env,
): S3SecurityPosture {
  return {
    mutualTls:
      Boolean(env[S3_TLS_CERT_FILE_ENV]?.trim()) && Boolean(env[S3_TLS_KEY_FILE_ENV]?.trim()),
    privateCa: Boolean(env[S3_TLS_CA_FILE_ENV]?.trim()),
    tls: parseS3Endpoint(endpoint).protocol === "https:",
  };
}

/**
 * The client certificate the API presents for mutual TLS, or undefined when it presents none.
 * The certificate and the key are a pair: a half-configured pair is an error, not a silent
 * downgrade to server-only authentication.
 */
export function resolveS3ClientCertificate(
  endpoint: string,
  env: S3ConnectionEnv = process.env,
  readTextFile: ReadTextFile = readTextFileUtf8,
): S3ClientCertificate | undefined {
  const certFile = env[S3_TLS_CERT_FILE_ENV]?.trim();
  const keyFile = env[S3_TLS_KEY_FILE_ENV]?.trim();
  if (!(certFile || keyFile)) {
    return undefined;
  }
  if (!(certFile && keyFile)) {
    throw new Error(`Set both ${S3_TLS_CERT_FILE_ENV} and ${S3_TLS_KEY_FILE_ENV}, or unset both`);
  }
  assertHttpsEndpoint(endpoint, `${S3_TLS_CERT_FILE_ENV} and ${S3_TLS_KEY_FILE_ENV}`);
  return {
    cert: readPemFile(
      S3_TLS_CERT_FILE_ENV,
      certFile,
      "-----BEGIN CERTIFICATE-----",
      "PEM certificate",
      readTextFile,
    ),
    key: readPemFile(
      S3_TLS_KEY_FILE_ENV,
      keyFile,
      "-----BEGIN PRIVATE KEY-----",
      "PEM private key",
      readTextFile,
    ),
  };
}

export function createS3Client(
  config: S3ConnectionConfig,
  limits: S3RequestLimits = {},
  env: S3ConnectionEnv = process.env,
  readTextFile: ReadTextFile = readTextFileUtf8,
): S3Client {
  const ca = resolveS3TrustedCa(config.endpoint, env, readTextFile);
  const client = resolveS3ClientCertificate(config.endpoint, env, readTextFile);
  return new S3Client({
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    endpoint: config.endpoint,
    // SeaweedFS and most S3-compatible stores need path-style URLs (bucket in the path).
    forcePathStyle: true,
    region: config.region,
    requestHandler: ca || client ? { ...limits, httpsAgent: tlsAgent(ca, client) } : { ...limits },
  });
}
