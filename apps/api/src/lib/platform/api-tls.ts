/**
 * TLS for the API's only listener (docs/deploy/configuration.mdx#internal-api-tls).
 *
 * The API serves HTTPS and nothing else, on API_PORT (default 26642), with TLS 1.3 and a
 * certificate from the stack's private API CA. Every caller reaches it over TLS: Traefik or
 * another reverse proxy (all public traffic), the webapp's server side, the container
 * healthcheck, and in local development Portless and `tailscale serve`. Requests carry bearer
 * tokens, cookies, the webapp's OAuth client secret, and user data, and the Docker network is
 * shared with other stacks, so no plain HTTP port is left open.
 *
 * Fastify serves HTTPS itself (its `https` option), so its own timeouts, shutdown, and the
 * WebSocket upgrade handling of @fastify/websocket apply unchanged.
 */

import { X509Certificate } from "node:crypto";
import { readFileSync } from "node:fs";

import type { FastifyBaseLogger } from "fastify";

import { logExpiringCertificate } from "./certificate-expiry.js";

const DAY_MS = 24 * 60 * 60 * 1000;

type ApiTlsEnv = Partial<
  Record<typeof API_TLS_CERT_FILE_ENV | typeof API_TLS_KEY_FILE_ENV, string>
>;

type ApiTlsConfig = {
  certFile: string;
  keyFile: string;
};

/** Fastify's `https` option for the API's server. */
type ApiTlsOptions = {
  cert: string;
  key: string;
  minVersion: "TLSv1.3";
};

type ReadTextFile = (path: string) => string;

function readTextFileUtf8(path: string): string {
  return readFileSync(path, "utf8");
}

function readPemFile(envName: string, path: string, readTextFile: ReadTextFile): string {
  let contents: string;
  try {
    contents = readTextFile(path);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `${envName} points to a file the API cannot read (${path}): ${reason}. Local development: pnpm run api:secrets`,
      { cause: error },
    );
  }
  if (!contents.includes("-----BEGIN")) {
    throw new Error(`${envName} points to a file with no PEM data (${path})`);
  }
  return contents;
}

export type { ApiTlsConfig, ApiTlsEnv, ApiTlsOptions };

export const API_TLS_CERT_FILE_ENV = "BONDERY_PRIVATE_API_TLS_CERT_FILE";
export const API_TLS_KEY_FILE_ENV = "BONDERY_PRIVATE_API_TLS_KEY_FILE";

/**
 * The certificate and key files of the API's HTTPS listener. Both are required: the API has no
 * plain HTTP listener to fall back to.
 */
export function resolveApiTlsConfig(env: ApiTlsEnv = process.env): ApiTlsConfig {
  const certFile = env[API_TLS_CERT_FILE_ENV]?.trim();
  const keyFile = env[API_TLS_KEY_FILE_ENV]?.trim();
  if (!(certFile && keyFile)) {
    throw new Error(
      `The API serves HTTPS only. Set ${API_TLS_CERT_FILE_ENV} and ${API_TLS_KEY_FILE_ENV}. Local development: pnpm run api:secrets. Docker Compose sets both for the bundled stack.`,
    );
  }
  return { certFile, keyFile };
}

/**
 * Where the HTTPS listener binds. In development every caller (Portless, the webapp's server
 * side, `tailscale serve` for phones) connects over loopback, so the API stays off the local
 * network. A container listens on all interfaces for Traefik and the webapp.
 */
export function resolveListenAddress(
  config: { API_HOST: string; API_PORT: number },
  environment: string,
): { host: string; port: number } {
  const defaultHost = environment === "development" ? "127.0.0.1" : "0.0.0.0";
  return { host: config.API_HOST || defaultHost, port: config.API_PORT };
}

/** Reads the certificate and key into Fastify's `https` option. TLS 1.3 only. */
export function loadApiTlsOptions(
  config: ApiTlsConfig,
  readTextFile: ReadTextFile = readTextFileUtf8,
): ApiTlsOptions {
  return {
    cert: readPemFile(API_TLS_CERT_FILE_ENV, config.certFile, readTextFile),
    key: readPemFile(API_TLS_KEY_FILE_ENV, config.keyFile, readTextFile),
    minVersion: "TLSv1.3",
  };
}

/** Days until the API's certificate expires, or null when it cannot be read. */
export function apiCertificateDaysLeft(
  config: ApiTlsConfig,
  now: Date = new Date(),
  readTextFile: ReadTextFile = readTextFileUtf8,
): number | null {
  try {
    const expiresAt = Date.parse(new X509Certificate(readTextFile(config.certFile)).validTo);
    return Number.isNaN(expiresAt) ? null : Math.floor((expiresAt - now.getTime()) / DAY_MS);
  } catch {
    return null;
  }
}

/** Log a certificate that expires soon. Returns the level used, for tests. */
export function logApiCertificateExpiry(
  log: Pick<FastifyBaseLogger, "error" | "warn">,
  daysLeft: number | null,
): "error" | "warn" | null {
  return logExpiringCertificate(
    log,
    daysLeft,
    `The certificate of the API's HTTPS listener expires in ${daysLeft} days. On the bundled stack, deploy (the stack-secrets job renews it), then recreate the API: docker compose up -d --force-recreate stack-secrets traefik-transport api webapp. See docs/deploy/secrets.mdx#api_tls_certificate`,
  );
}
