import {
  probeConfigured,
  probeObjectStorage,
  probePostgres,
  probeRedis,
  probeSmtp,
} from "./probes.js";
import type { HealthCheckConfig, HealthReport, HealthServices, HealthStatus } from "./types.js";

const CACHE_TTL_MS = 60_000;

let cachedReport: HealthReport | null = null;
let cacheExpiresAt = 0;

function isStripeConfigured(config: HealthCheckConfig): boolean {
  return Boolean(
    config.stripeSecretKey.trim() &&
      config.stripePriceIdMonthly.trim() &&
      config.stripePriceIdAnnual.trim() &&
      config.stripeWebhookSecret.trim(),
  );
}

function deriveOverallStatus(services: HealthServices): HealthStatus {
  const critical = [services.postgres, services.storage, services.smtp, services.redis];

  if (critical.some((service) => !service.ok)) {
    return "unhealthy";
  }

  const optionalConfigured = [services.anthropic, services.stripe, services.mapy];

  if (optionalConfigured.some((service) => service.configured && !service.ok)) {
    return "degraded";
  }

  return "ok";
}

async function runProbes(config: HealthCheckConfig): Promise<HealthServices> {
  const storageConfig = {
    accessKeyId: config.storageS3AccessKeyId,
    endpoint: config.storageS3Endpoint,
    region: config.storageS3Region,
    secretAccessKey: config.storageS3SecretAccessKey,
  };

  const [postgres, storage, redis, smtp] = await Promise.all([
    probePostgres(),
    probeObjectStorage(storageConfig),
    probeRedis(config.redisUrl),
    probeSmtp(),
  ]);

  return {
    anthropic: probeConfigured(Boolean(config.anthropicApiKey.trim())),
    mapy: probeConfigured(Boolean(config.mapsApiKey.trim())),
    postgres,
    redis,
    smtp,
    storage,
    stripe: probeConfigured(isStripeConfigured(config)),
  };
}

export async function getHealthReport(config: HealthCheckConfig): Promise<HealthReport> {
  const now = Date.now();

  if (cachedReport && now < cacheExpiresAt) {
    return {
      ...cachedReport,
      cached: true,
    };
  }

  const services = await runProbes(config);
  const timestamp = new Date().toISOString();
  cacheExpiresAt = now + CACHE_TTL_MS;

  const report: HealthReport = {
    cached: false,
    cacheExpiresAt: new Date(cacheExpiresAt).toISOString(),
    services,
    status: deriveOverallStatus(services),
    timestamp,
  };

  cachedReport = report;
  return report;
}

/** Clears the in-memory cache — exposed for tests. */
export function resetHealthCheckCache(): void {
  cachedReport = null;
  cacheExpiresAt = 0;
}
