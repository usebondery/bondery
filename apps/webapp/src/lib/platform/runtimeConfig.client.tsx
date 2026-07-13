"use client";

import { type WebappRuntimeConfig, webappRuntimeConfigSchema } from "@bondery/schemas";
import { createContext, type ReactNode, useContext } from "react";

declare global {
  interface Window {
    __BONDERY_RUNTIME_CONFIG__?: unknown;
  }
}

export const WebappRuntimeConfigContext = createContext<WebappRuntimeConfig | null>(null);

let cachedFromWindow: WebappRuntimeConfig | null = null;

function readWebappRuntimeConfigFromWindow(): WebappRuntimeConfig {
  if (cachedFromWindow) {
    return cachedFromWindow;
  }

  if (typeof window === "undefined") {
    throw new Error("Runtime config is unavailable outside the browser");
  }

  const raw = window.__BONDERY_RUNTIME_CONFIG__;
  if (!raw) {
    throw new Error("Missing window.__BONDERY_RUNTIME_CONFIG__");
  }

  cachedFromWindow = webappRuntimeConfigSchema.parse(raw);
  return cachedFromWindow;
}

export function WebappRuntimeConfigProvider({
  config,
  children,
}: {
  config: WebappRuntimeConfig;
  children: ReactNode;
}) {
  return (
    <WebappRuntimeConfigContext.Provider value={config}>
      {children}
    </WebappRuntimeConfigContext.Provider>
  );
}

/** React hook — safe during SSR when wrapped in WebappRuntimeConfigProvider. */
export function useWebappRuntimeConfig(): WebappRuntimeConfig {
  const fromContext = useContext(WebappRuntimeConfigContext);
  if (fromContext) {
    return fromContext;
  }

  return readWebappRuntimeConfigFromWindow();
}

/** Non-React browser code (event handlers, modules). Requires window config script. */
export function getWebappRuntimeConfigSync(): WebappRuntimeConfig {
  return readWebappRuntimeConfigFromWindow();
}

export async function fetchWebappRuntimeConfig(): Promise<WebappRuntimeConfig> {
  const fromWindow = typeof window !== "undefined" ? window.__BONDERY_RUNTIME_CONFIG__ : undefined;
  if (fromWindow) {
    cachedFromWindow = webappRuntimeConfigSchema.parse(fromWindow);
    return cachedFromWindow;
  }

  const res = await fetch("/runtime-config.json", { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to load runtime config: ${res.status}`);
  }

  const json: unknown = await res.json();
  cachedFromWindow = webappRuntimeConfigSchema.parse(json);
  return cachedFromWindow;
}
