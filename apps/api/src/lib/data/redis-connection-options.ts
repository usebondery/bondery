/**
 * Resolves how the API authenticates to Redis and verifies its TLS certificate.
 *
 * Secrets can come from the URL (`rediss://:password@host:6379`) or from files, which suits
 * Docker volumes and Docker secrets:
 *
 * - `BONDERY_PRIVATE_REDIS_PASSWORD_FILE`: file that holds the Redis password.
 * - `BONDERY_PRIVATE_REDIS_TLS_CA_FILE`: PEM certificate(s) to trust for the Redis TLS connection.
 *
 * The bundled Compose stack sets both files (see `deploy/bondery/docker-compose.yml`).
 */

import { readFileSync } from "node:fs";

import type { RedisOptions } from "ioredis";

export const REDIS_PASSWORD_FILE_ENV = "BONDERY_PRIVATE_REDIS_PASSWORD_FILE";
export const REDIS_TLS_CA_FILE_ENV = "BONDERY_PRIVATE_REDIS_TLS_CA_FILE";

export type RedisConnectionEnv = Partial<
  Record<typeof REDIS_PASSWORD_FILE_ENV | typeof REDIS_TLS_CA_FILE_ENV, string>
>;

export type RedisConnectionOptions = Pick<RedisOptions, "password" | "tls">;

export type RedisSecurityPosture = {
  authenticated: boolean;
  tls: boolean;
};

type ReadTextFile = (path: string) => string;

function readTextFileUtf8(path: string): string {
  return readFileSync(path, "utf8");
}

function parseRedisUrl(redisUrl: string): URL {
  try {
    return new URL(redisUrl);
  } catch (error) {
    throw new Error(
      "BONDERY_PRIVATE_REDIS_URL is not a valid URL (expected redis:// or rediss://)",
      { cause: error },
    );
  }
}

function readSecretFile(envName: string, path: string, readTextFile: ReadTextFile): string {
  let contents: string;
  try {
    contents = readTextFile(path);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`${envName} points to a file the API cannot read (${path}): ${reason}`, {
      cause: error,
    });
  }
  const trimmed = contents.trim();
  if (!trimmed) {
    throw new Error(`${envName} points to an empty file (${path})`);
  }
  return trimmed;
}

/** Reports whether a Redis URL plus env uses TLS and a password. Never reads secret files. */
export function describeRedisSecurity(
  redisUrl: string,
  env: RedisConnectionEnv = process.env,
): RedisSecurityPosture {
  const url = parseRedisUrl(redisUrl);
  return {
    authenticated: Boolean(url.password) || Boolean(env[REDIS_PASSWORD_FILE_ENV]?.trim()),
    tls: url.protocol === "rediss:",
  };
}

/**
 * Builds ioredis options for the password and TLS trust that the URL alone cannot carry.
 * Explicit options override what ioredis parses from the URL.
 */
export function resolveRedisConnectionOptions(
  redisUrl: string,
  env: RedisConnectionEnv = process.env,
  readTextFile: ReadTextFile = readTextFileUtf8,
): RedisConnectionOptions {
  const url = parseRedisUrl(redisUrl);
  const options: RedisConnectionOptions = {};

  const passwordFile = env[REDIS_PASSWORD_FILE_ENV]?.trim();
  if (passwordFile) {
    if (url.password) {
      throw new Error(
        `Set the Redis password in BONDERY_PRIVATE_REDIS_URL or ${REDIS_PASSWORD_FILE_ENV}, not both`,
      );
    }
    options.password = readSecretFile(REDIS_PASSWORD_FILE_ENV, passwordFile, readTextFile);
  }

  const caFile = env[REDIS_TLS_CA_FILE_ENV]?.trim();
  if (caFile) {
    if (url.protocol !== "rediss:") {
      throw new Error(
        `${REDIS_TLS_CA_FILE_ENV} is set, but BONDERY_PRIVATE_REDIS_URL does not use TLS. Use rediss://`,
      );
    }
    options.tls = { ca: readSecretFile(REDIS_TLS_CA_FILE_ENV, caFile, readTextFile) };
  }

  return options;
}
