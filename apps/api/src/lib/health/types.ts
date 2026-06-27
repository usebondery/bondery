export type ServiceProbeResult = {
  ok: boolean;
  latencyMs?: number;
  error?: string;
  configured?: boolean;
};

export type SupabaseServiceStatus = {
  auth: ServiceProbeResult;
  database: ServiceProbeResult;
  storage: ServiceProbeResult;
};

export type HealthServices = {
  supabase: SupabaseServiceStatus;
  redis: ServiceProbeResult;
  smtp: ServiceProbeResult;
  anthropic: ServiceProbeResult;
  polar: ServiceProbeResult;
  mapy: ServiceProbeResult;
  posthog: ServiceProbeResult;
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
  supabaseUrl: string;
  supabasePublishableKey: string;
  redisUrl: string;
  smtpHost: string;
  smtpUser: string;
  smtpPass: string;
  smtpAddress: string;
  smtpPort: number;
  anthropicApiKey: string;
  polarAccessToken: string;
  polarProductId: string;
  polarWebhookSecret: string;
  mapsApiKey: string;
  posthogApiSecret: string;
  posthogProjectId: string;
};
