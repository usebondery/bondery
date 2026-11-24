import "server-only";

import { readBuildMetadata } from "@bondery/helpers/infra/build-metadata";
import { validateWebsiteRuntimeEnv } from "@/lib/platform/readyEnv";

/** Node-only startup validation (throws on failure — never import from Edge). */
export function validateWebsiteStartup(): void {
  try {
    validateWebsiteRuntimeEnv();
    const { gitSha, version } = readBuildMetadata();
    // biome-ignore lint/suspicious/noConsole: fail-fast boot diagnostics before logger exists
    console.info("[website] Runtime env valid", { gitSha, version });
  } catch (error) {
    // biome-ignore lint/suspicious/noConsole: fail-fast boot diagnostics before logger exists
    console.error("[website] Runtime env validation failed:", error);
    process.exitCode = 1;
    throw error;
  }
}
