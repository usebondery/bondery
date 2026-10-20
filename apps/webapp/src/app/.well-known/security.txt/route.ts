import { permanentRedirectExternal } from "@/lib/navigation/redirect/external";
import { buildWebappRuntimeConfigFromEnv } from "@/lib/platform/runtimeConfig.server";

export function GET() {
  const origin = buildWebappRuntimeConfigFromEnv().websiteUrl.replace(/\/+$/, "");
  permanentRedirectExternal(`${origin}/.well-known/security.txt`);
}
