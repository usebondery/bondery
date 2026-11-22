import { prisma } from "@bondery/db";
import type { FastifyBaseLogger } from "fastify";
import { classifyProbeError } from "../health/errors.js";
import {
  assertRuntimeDependencyConfigured,
  shouldSkipLiveRuntimeVerify,
} from "../platform/runtime-env.js";
import { isDatabaseConfigured } from "./database-url.js";

type PostgresReadiness = {
  configured: boolean;
  error?: string;
  latencyMs?: number;
  ok: boolean;
  verifiedAt: string;
};

const UNCONFIGURED_READINESS: PostgresReadiness = {
  configured: false,
  ok: true,
  verifiedAt: new Date(0).toISOString(),
};

let postgresReadiness: PostgresReadiness | null = null;

function setUnconfiguredReadiness(): PostgresReadiness {
  postgresReadiness = { ...UNCONFIGURED_READINESS, verifiedAt: new Date().toISOString() };
  return postgresReadiness;
}

function setMissingReadiness(): PostgresReadiness {
  postgresReadiness = {
    configured: false,
    error: "not_configured",
    ok: false,
    verifiedAt: new Date().toISOString(),
  };
  return postgresReadiness;
}

function setSkippedVerifyReadiness(): PostgresReadiness {
  postgresReadiness = {
    configured: true,
    ok: true,
    verifiedAt: new Date().toISOString(),
  };
  return postgresReadiness;
}

async function runPostgresVerify(): Promise<PostgresReadiness> {
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    postgresReadiness = {
      configured: true,
      latencyMs: Date.now() - started,
      ok: true,
      verifiedAt: new Date().toISOString(),
    };
    return postgresReadiness;
  } catch (error) {
    postgresReadiness = {
      configured: true,
      error: classifyProbeError(error),
      latencyMs: Date.now() - started,
      ok: false,
      verifiedAt: new Date().toISOString(),
    };
    return postgresReadiness;
  }
}

export type { PostgresReadiness };

export function getPostgresReadiness(): PostgresReadiness {
  return postgresReadiness ?? UNCONFIGURED_READINESS;
}

/**
 * Eager Postgres verify on startup. Required in development and production; skipped in test.
 */
export async function initPostgres(log?: FastifyBaseLogger): Promise<PostgresReadiness> {
  if (!isDatabaseConfigured()) {
    assertRuntimeDependencyConfigured(false, "DATABASE_URL must be set");
    log?.info("Postgres not configured — skipping verify in test");
    return setUnconfiguredReadiness();
  }

  if (shouldSkipLiveRuntimeVerify()) {
    log?.info("Postgres verify skipped in test environment");
    return setSkippedVerifyReadiness();
  }

  const readiness = await runPostgresVerify();
  if (readiness.ok) {
    log?.info({ latencyMs: readiness.latencyMs }, "Postgres verified");
  } else {
    log?.error(
      { error: readiness.error, latencyMs: readiness.latencyMs },
      "Postgres verify failed",
    );
    throw new Error(`Postgres verify failed: ${readiness.error ?? "unknown"}`);
  }

  return readiness;
}

/** Re-verify Postgres (used by /health/ready when cache is cold). */
export async function verifyPostgres(): Promise<PostgresReadiness> {
  if (!isDatabaseConfigured()) {
    if (shouldSkipLiveRuntimeVerify()) {
      return setUnconfiguredReadiness();
    }

    return setMissingReadiness();
  }

  if (shouldSkipLiveRuntimeVerify()) {
    return setSkippedVerifyReadiness();
  }

  return runPostgresVerify();
}

/** @internal Test-only reset. */
export function resetPostgresReadinessForTests(): void {
  postgresReadiness = null;
}
