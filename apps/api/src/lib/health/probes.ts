import { Redis } from "ioredis";
import type { ServiceProbeResult } from "./types.js";

const DEFAULT_PROBE_TIMEOUT_MS = 5_000;

function normalizeSupabaseBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function supabaseRequestHeaders(publishableKey: string): Record<string, string> {
  return {
    apikey: publishableKey,
    Authorization: `Bearer ${publishableKey}`,
  };
}

function classifyProbeError(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return "timeout";
    }
    if (error.message.includes("fetch failed")) {
      return "unreachable";
    }
    return error.message;
  }
  return "unknown";
}

async function probeHttp(
  url: string,
  init: RequestInit & { timeoutMs?: number; okStatuses?: number[] } = {},
): Promise<ServiceProbeResult> {
  const started = Date.now();
  const timeoutMs = init.timeoutMs ?? DEFAULT_PROBE_TIMEOUT_MS;
  const okStatuses = init.okStatuses ?? [200];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const { okStatuses: _okStatuses, timeoutMs: _timeoutMs, ...fetchInit } = init;
    const response = await fetch(url, {
      ...fetchInit,
      signal: controller.signal,
    });

    const latencyMs = Date.now() - started;
    if (!okStatuses.includes(response.status)) {
      return {
        ok: false,
        latencyMs,
        error: `http_${response.status}`,
      };
    }

    return { ok: true, latencyMs };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - started,
      error: classifyProbeError(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function probeSupabaseAuth(
  supabaseUrl: string,
  publishableKey: string,
): Promise<ServiceProbeResult> {
  const baseUrl = normalizeSupabaseBaseUrl(supabaseUrl);
  return probeHttp(`${baseUrl}/auth/v1/health`, {
    method: "GET",
    headers: supabaseRequestHeaders(publishableKey),
  });
}

export async function probeSupabaseDatabase(
  supabaseUrl: string,
  publishableKey: string,
): Promise<ServiceProbeResult> {
  const baseUrl = normalizeSupabaseBaseUrl(supabaseUrl);
  return probeHttp(`${baseUrl}/rest-admin/v1/live`, {
    method: "GET",
    headers: supabaseRequestHeaders(publishableKey),
  });
}

export async function probeSupabaseStorage(
  supabaseUrl: string,
  publishableKey: string,
): Promise<ServiceProbeResult> {
  const baseUrl = normalizeSupabaseBaseUrl(supabaseUrl);
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_PROBE_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/storage/v1/health`, {
      method: "GET",
      headers: supabaseRequestHeaders(publishableKey),
      signal: controller.signal,
    });

    const latencyMs = Date.now() - started;
    if (!response.ok) {
      return {
        ok: false,
        latencyMs,
        error: `http_${response.status}`,
      };
    }

    try {
      const payload = (await response.json()) as { healthy?: boolean };
      if (payload.healthy === false) {
        return {
          ok: false,
          latencyMs,
          error: "unhealthy",
        };
      }
    } catch {
      return {
        ok: false,
        latencyMs,
        error: "invalid_response",
      };
    }

    return { ok: true, latencyMs };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - started,
      error: classifyProbeError(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function probeRedis(redisUrl: string): Promise<ServiceProbeResult> {
  const trimmed = redisUrl.trim();
  if (!trimmed) {
    return { ok: true, configured: false };
  }

  const started = Date.now();
  const client = new Redis(trimmed, {
    connectTimeout: DEFAULT_PROBE_TIMEOUT_MS,
    maxRetriesPerRequest: 0,
    enableReadyCheck: true,
    lazyConnect: true,
  });

  try {
    await client.connect();
    const pong = await client.ping();
    const latencyMs = Date.now() - started;

    if (pong !== "PONG") {
      return {
        ok: false,
        configured: true,
        latencyMs,
        error: "unexpected_response",
      };
    }

    return { ok: true, configured: true, latencyMs };
  } catch (error) {
    return {
      ok: false,
      configured: true,
      latencyMs: Date.now() - started,
      error: classifyProbeError(error),
    };
  } finally {
    client.disconnect();
  }
}

export function probeConfigured(
  configured: boolean,
  options?: { required?: boolean },
): ServiceProbeResult {
  const required = options?.required ?? false;
  return {
    ok: configured || !required,
    configured,
    ...(configured || required ? {} : { error: "not_configured" }),
  };
}
