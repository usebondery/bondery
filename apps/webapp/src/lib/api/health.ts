import { clientApiFetch } from "@/lib/api/client";

export type HealthReportStatus = "ok" | "degraded" | "unhealthy";

export type ServiceProbeResult = {
  ok: boolean;
  latencyMs?: number;
  error?: string;
  configured?: boolean;
};

export type HealthReport = {
  status: HealthReportStatus;
  timestamp: string;
  cached: boolean;
  cacheExpiresAt: string;
  services: {
    supabase?: {
      auth?: ServiceProbeResult;
      database?: ServiceProbeResult;
      storage?: ServiceProbeResult;
    };
    redis?: ServiceProbeResult;
    smtp?: ServiceProbeResult;
    anthropic?: ServiceProbeResult;
    polar?: ServiceProbeResult;
    mapy?: ServiceProbeResult;
    posthog?: ServiceProbeResult;
  };
};

export type HealthCheckResult =
  | { reachable: true; status: number; report: HealthReport | null }
  | { reachable: false; status: number | null };

/** Fetches the BFF readiness report. Does not apply transport outage policy. */
export async function fetchApiHealthReport(): Promise<HealthCheckResult> {
  try {
    const response = await clientApiFetch("/api/health");
    let report: HealthReport | null = null;

    if (response.headers.get("Content-Type")?.includes("application/json")) {
      try {
        report = (await response.json()) as HealthReport;
      } catch {
        report = null;
      }
    }

    return { reachable: true, status: response.status, report };
  } catch {
    return { reachable: false, status: null };
  }
}
