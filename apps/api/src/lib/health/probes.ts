import { Redis } from "ioredis";
import type { ServiceProbeResult } from "./types.js";

const DEFAULT_PROBE_TIMEOUT_MS = 5_000;

function normalizeSupabaseBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function supabaseRequestHeaders(publishableKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${publishableKey}`,
    apikey: publishableKey,
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
        error: `http_${response.status}`,
        latencyMs,
        ok: false,
      };
    }

    return { latencyMs, ok: true };
  } catch (error) {
    return {
      error: classifyProbeError(error),
      latencyMs: Date.now() - started,
      ok: false,
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
    headers: supabaseRequestHeaders(publishableKey),
    method: "GET",
  });
}

export async function probeSupabaseDatabase(
  supabaseUrl: string,
  publishableKey: string,
): Promise<ServiceProbeResult> {
  const baseUrl = normalizeSupabaseBaseUrl(supabaseUrl);
  return probeHttp(`${baseUrl}/rest-admin/v1/ready`, {
    headers: supabaseRequestHeaders(publishableKey),
    method: "GET",
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
      headers: supabaseRequestHeaders(publishableKey),
      method: "GET",
      signal: controller.signal,
    });

    const latencyMs = Date.now() - started;
    if (!response.ok) {
      return {
        error: `http_${response.status}`,
        latencyMs,
        ok: false,
      };
    }

    try {
      const payload = (await response.json()) as { healthy?: boolean };
      if (payload.healthy === false) {
        return {
          error: "unhealthy",
          latencyMs,
          ok: false,
        };
      }
    } catch {
      return {
        error: "invalid_response",
        latencyMs,
        ok: false,
      };
    }

    return { latencyMs, ok: true };
  } catch (error) {
    return {
      error: classifyProbeError(error),
      latencyMs: Date.now() - started,
      ok: false,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function probeRedis(redisUrl: string): Promise<ServiceProbeResult> {
  const trimmed = redisUrl.trim();
  if (!trimmed) {
    return { configured: false, ok: true };
  }

  const started = Date.now();
  const client = new Redis(trimmed, {
    connectTimeout: DEFAULT_PROBE_TIMEOUT_MS,
    enableReadyCheck: true,
    lazyConnect: true,
    maxRetriesPerRequest: 0,
  });

  try {
    await client.connect();
    const pong = await client.ping();
    const latencyMs = Date.now() - started;

    if (pong !== "PONG") {
      return {
        configured: true,
        error: "unexpected_response",
        latencyMs,
        ok: false,
      };
    }

    return { configured: true, latencyMs, ok: true };
  } catch (error) {
    return {
      configured: true,
      error: classifyProbeError(error),
      latencyMs: Date.now() - started,
      ok: false,
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
    configured,
    ok: configured || !required,
    ...(configured || required ? {} : { error: "not_configured" }),
  };
}
