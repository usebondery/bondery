import "server-only";

import { readBuildMetadata } from "@bondery/helpers/infra/build-metadata";
import { trustInternalApiCa } from "@/lib/platform/internalApiTls.server";
import { validateWebappRuntimeConfigAtStartup } from "@/lib/platform/runtimeConfig.server";

/** Node-only startup validation (throws on failure — never import from Edge). */
export function validateWebappStartup(): void {
  try {
    validateWebappRuntimeConfigAtStartup();
    // Before the server takes requests: every server-side call to the API needs the trust.
    const internalApiTls = trustInternalApiCa();
    if (internalApiTls.caFile) {
      // biome-ignore lint/suspicious/noConsole: fail-fast boot diagnostics before logger exists
      console.info("[webapp] Internal API TLS: trusting the CA in", internalApiTls.caFile);
    }
    if (internalApiTls.warning) {
      // biome-ignore lint/suspicious/noConsole: fail-fast boot diagnostics before logger exists
      console.warn("[webapp]", internalApiTls.warning);
    }
    const { gitSha, version } = readBuildMetadata();
    // biome-ignore lint/suspicious/noConsole: fail-fast boot diagnostics before logger exists
    console.info("[webapp] Runtime config valid", { gitSha, version });
  } catch (error) {
    // biome-ignore lint/suspicious/noConsole: fail-fast boot diagnostics before logger exists
    console.error("[webapp] Runtime config validation failed:", error);
    process.exitCode = 1;
    throw error;
  }
}
