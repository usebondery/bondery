import { permanentRedirectExternal } from "@/lib/navigation/redirect/external";
import { buildWebappRuntimeConfigFromEnv } from "@/lib/platform/runtimeConfig.server";

const TRAILING_SLASHES = /\/+$/;

export function GET() {
  const origin = buildWebappRuntimeConfigFromEnv().websiteUrl.replace(TRAILING_SLASHES, "");
  permanentRedirectExternal(`${origin}/.well-known/ard.json`);
}
