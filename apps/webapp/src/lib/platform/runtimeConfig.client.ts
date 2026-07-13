"use client";

import { type WebappRuntimeConfig, webappRuntimeConfigSchema } from "@bondery/schemas";

declare global {
  interface Window {
    __BONDERY_RUNTIME_CONFIG__?: unknown;
  }
}

let cached: WebappRuntimeConfig | null = null;

export function getWebappRuntimeConfigSync(): WebappRuntimeConfig {
  if (cached) {
    return cached;
  }

  if (typeof window === "undefined") {
    throw new Error("getWebappRuntimeConfigSync() must be called in the browser");
  }

  const raw = window.__BONDERY_RUNTIME_CONFIG__;
  if (!raw) {
    throw new Error("Missing window.__BONDERY_RUNTIME_CONFIG__");
  }

  cached = webappRuntimeConfigSchema.parse(raw);
  return cached;
}

export async function fetchWebappRuntimeConfig(): Promise<WebappRuntimeConfig> {
  if (cached) {
    return cached;
  }

  const res = await fetch("/runtime-config.json", { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to load runtime config: ${res.status}`);
  }

  const json: unknown = await res.json();
  cached = webappRuntimeConfigSchema.parse(json);
  return cached;
}
