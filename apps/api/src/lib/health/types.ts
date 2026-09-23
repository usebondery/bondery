export type ServiceProbeResult = {
  ok: boolean;
  latencyMs?: number;
  error?: string;
  configured?: boolean;
};

export type HealthServices = {
  postgres: ServiceProbeResult;
  storage: ServiceProbeResult;
  redis: ServiceProbeResult;
  smtp: ServiceProbeResult;
  anthropic: ServiceProbeResult;
  stripe: ServiceProbeResult;
  mapy: ServiceProbeResult;
};

export type HealthStatus = "ok" | "degraded" | "unhealthy";

export type HealthReport = {
  status: HealthStatus;
  timestamp: string;
  cached: boolean;
  cacheExpiresAt: string;
  services: HealthServices;
};

export type HealthCheckConfig = {
  storageS3Endpoint: string;
  storageS3Region: string;
  storageS3AccessKeyId: string;
  storageS3SecretAccessKey: string;
  redisUrl: string;
  anthropicApiKey: string;
  stripeSecretKey: string;
  stripePriceIdMonthly: string;
  stripePriceIdAnnual: string;
  stripeWebhookSecret: string;
  mapsApiKey: string;
};
