import { verifyPostgres } from "../data/postgres.js";
import { verifyRedis } from "../data/redis.js";
import { verifyObjectStorage } from "../storage/init-storage.js";
import type { ServiceProbeResult } from "./types.js";

type ReadinessLike = {
  configured: boolean;
  error?: string;
  latencyMs?: number;
  ok: boolean;
};

function readinessToProbeResult(readiness: ReadinessLike): ServiceProbeResult {
  if (!readiness.configured) {
    return {
      configured: false,
      ok: readiness.ok,
      ...(readiness.error ? { error: readiness.error } : {}),
    };
  }

  return {
    configured: true,
    error: readiness.error,
    latencyMs: readiness.latencyMs,
    ok: readiness.ok,
  };
}

export { probeSmtp } from "./probe-smtp.js";

/** Prisma ping against the app's primary Postgres database. */
export async function probePostgres(): Promise<ServiceProbeResult> {
  const readiness = await verifyPostgres();
  return readinessToProbeResult(readiness);
}

export type StorageProbeConfig = {
  accessKeyId: string;
  endpoint: string;
  region: string;
  secretAccessKey: string;
};

/** Required-bucket signed HeadBucket checks. Does not call SeaweedFS `/status` and never creates buckets. */
export async function probeObjectStorage(config: StorageProbeConfig): Promise<ServiceProbeResult> {
  const readiness = await verifyObjectStorage(config);
  return readinessToProbeResult(readiness);
}

export async function probeRedis(redisUrl: string): Promise<ServiceProbeResult> {
  const readiness = await verifyRedis(redisUrl);
  return readinessToProbeResult(readiness);
}

export function probeConfigured(
  configured: boolean,
  options?: { required?: boolean },
): ServiceProbeResult {
  const required = options?.required ?? false;
  return {
    configured,
    ok: configured || !required,
    ...(configured || required ? {} : { error: "not_configured" }),
  };
}
