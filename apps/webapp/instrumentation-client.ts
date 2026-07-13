import { webappRuntimeConfigSchema } from "@bondery/schemas";
import posthog from "posthog-js";

if (typeof window !== "undefined") {
  const parsed = webappRuntimeConfigSchema.safeParse(window.__BONDERY_RUNTIME_CONFIG__);
  if (parsed.success && parsed.data.posthogKey) {
    posthog.init(parsed.data.posthogKey, {
      api_host: parsed.data.posthogHost ?? "https://eu.i.posthog.com",
      defaults: "2025-11-30",
    });
  }
}
