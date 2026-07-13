"use client";

import type { WebappRuntimeConfig } from "@bondery/schemas";
import { WebappRuntimeConfigProvider } from "@/lib/platform/runtimeConfig.client";

export function WebappRuntimeConfigShell({
  config,
  children,
}: {
  config: WebappRuntimeConfig;
  children: React.ReactNode;
}) {
  return <WebappRuntimeConfigProvider config={config}>{children}</WebappRuntimeConfigProvider>;
}
