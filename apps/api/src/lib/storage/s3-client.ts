/**
 * The only place the API creates S3 clients. Biome (`noRestrictedImports`) rejects importing
 * `S3Client` anywhere else, so every client gets the same TLS settings.
 *
 * TLS (docs/deploy/configuration.mdx#object-storage-tls):
 * - `https://` endpoint: the server certificate and host name are verified. With
 *   `BONDERY_PRIVATE_S3_TLS_CA_FILE` set, the client trusts only the PEM certificates in that
 *   file. The bundled SeaweedFS uses a private CA, and Compose sets the file. Without it, the
 *   system CAs apply (AWS S3, Cloudflare R2, Backblaze B2).
 * - `http://` endpoint: plaintext. The API warns about it at boot in production.
 */

import { readFileSync } from "node:fs";
import { Agent } from "node:https";

import { S3Client } from "@aws-sdk/client-s3";

export const S3_ENDPOINT_ENV = "BONDERY_PRIVATE_S3_ENDPOINT";
export const S3_TLS_CA_FILE_ENV = "BONDERY_PRIVATE_S3_TLS_CA_FILE";

export type S3ConnectionEnv = Partial<Record<typeof S3_TLS_CA_FILE_ENV, string>>;

export type S3ConnectionConfig = {
  accessKeyId: string;
  endpoint: string;
  region: string;
  secretAccessKey: string;
};

/** Socket limits in milliseconds. The SDK sets none by default. */
export type S3RequestLimits = {
  connectionTimeout?: number;
  requestTimeout?: number;
};

export type S3SecurityPosture = {
  /** The client trusts only the certificates in `BONDERY_PRIVATE_S3_TLS_CA_FILE`. */
  privateCa: boolean;
  tls: boolean;
};

type ReadTextFile = (path: string) => string;

function readTextFileUtf8(path: string): string {
  return readFileSync(path, "utf8");
}

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

function readCaFile(path: string, readTextFile: ReadTextFile): string {
  let contents: string;
  try {
    contents = readTextFile(path);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `${S3_TLS_CA_FILE_ENV} points to a file the API cannot read (${path}): ${reason}`,
      { cause: error },
    );
  }
  if (!contents.includes("-----BEGIN CERTIFICATE-----")) {
    throw new Error(`${S3_TLS_CA_FILE_ENV} points to a file with no PEM certificate (${path})`);
  }
  return contents;
}

/** Reports whether the endpoint uses TLS and a private CA. Never reads files. */
export function describeS3Security(
  endpoint: string,
  env: S3ConnectionEnv = process.env,
): S3SecurityPosture {
  return {
    privateCa: Boolean(env[S3_TLS_CA_FILE_ENV]?.trim()),
    tls: parseS3Endpoint(endpoint).protocol === "https:",
  };
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
  if (parseS3Endpoint(endpoint).protocol !== "https:") {
    throw new Error(
      `${S3_TLS_CA_FILE_ENV} is set, but ${S3_ENDPOINT_ENV} does not use TLS. Use https://`,
    );
  }
  return readCaFile(caFile, readTextFile);
}

export function createS3Client(
  config: S3ConnectionConfig,
  limits: S3RequestLimits = {},
  env: S3ConnectionEnv = process.env,
  readTextFile: ReadTextFile = readTextFileUtf8,
): S3Client {
  const ca = resolveS3TrustedCa(config.endpoint, env, readTextFile);
  return new S3Client({
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    endpoint: config.endpoint,
    // SeaweedFS and most S3-compatible stores need path-style URLs (bucket in the path).
    forcePathStyle: true,
    region: config.region,
    requestHandler: { ...limits, ...(ca ? { httpsAgent: trustingAgent(ca) } : {}) },
  });
}

/**
 * An Agent instance, not agent options. Given options, the SDK builds a fresh agent without them
 * for every request that sends `Expect: 100-continue` (uploads of a few MB), so those requests
 * would drop the CA and fail verification. Keep-alive and the socket cap match the SDK defaults.
 */
function trustingAgent(ca: string): Agent {
  return new Agent({ ca, keepAlive: true, maxSockets: 50 });
}
