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

/** Client-safe readiness summary — no per-service probe details. */
export type ClientHealthReport = Pick<
  HealthReport,
  "status" | "timestamp" | "cached" | "cacheExpiresAt"
>;

export type HealthCheckResult =
  | { reachable: true; status: number; report: ClientHealthReport | null }
  | { reachable: false; status: number | null };

export type UserHealthStatus = "checking" | "offline" | "degraded" | "online";

const HEALTH_REPORT_STATUSES = new Set<HealthReportStatus>(["ok", "degraded", "unhealthy"]);

/** Returns a parsed readiness summary for the client, or null when the body is not a /health payload. */
export function parseHealthReport(body: unknown): ClientHealthReport | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const candidate = body as HealthReport;
  if (!HEALTH_REPORT_STATUSES.has(candidate.status)) {
    return null;
  }

  if (typeof candidate.timestamp !== "string" || typeof candidate.services !== "object") {
    return null;
  }

  return {
    status: candidate.status,
    timestamp: candidate.timestamp,
    cached: candidate.cached,
    cacheExpiresAt: candidate.cacheExpiresAt,
  };
}

/** Maps a health probe result to a single user-facing status. */
export function deriveUserHealthStatus(
  loading: boolean,
  result: HealthCheckResult | null,
): UserHealthStatus {
  if (loading || !result) {
    return "checking";
  }

  if (!result.reachable || result.status >= 500 || !result.report) {
    return "offline";
  }

  if (result.report.status === "unhealthy") {
    return "offline";
  }

  if (result.report.status === "degraded") {
    return "degraded";
  }

  if (result.status === 200 && result.report.status === "ok") {
    return "online";
  }

  return "offline";
}

/** Fetches the BFF readiness report. Does not apply transport outage policy. */
export async function fetchApiHealthReport(): Promise<HealthCheckResult> {
  try {
    const response = await clientApiFetch("/api/health");
    let report: ClientHealthReport | null = null;

    if (response.headers.get("Content-Type")?.includes("application/json")) {
      try {
        report = parseHealthReport(await response.json());
      } catch {
        report = null;
      }
    }

    return { reachable: true, status: response.status, report };
  } catch {
    return { reachable: false, status: null };
  }
}
