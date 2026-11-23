import { getNextRuntime } from "@/lib/env";

export async function register() {
  if (getNextRuntime() !== "nodejs") {
    return;
  }

  const { validateWebsiteStartup } = await import("@/lib/platform/validateWebsiteStartup.node");
  validateWebsiteStartup();
}
