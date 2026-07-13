import { bffProxyFetch } from "@/lib/api/bffProxy";
import { buildWebappRuntimeConfigFromEnv } from "@/lib/platform/runtimeConfig.server";

/** Liveness + extension version probe (proxied through webapp BFF). */
export async function GET() {
  const apiResponse = await bffProxyFetch("/status", undefined, {
    cache: "no-store",
  });
  const runtimeConfig = buildWebappRuntimeConfigFromEnv();
  const text = await apiResponse.text();

  // Preserve existing API status fields (for clients that rely on them),
  // while attaching safe webapp metadata.
  const contentType = apiResponse.headers.get("Content-Type") ?? "application/json";
  if (contentType.includes("application/json")) {
    try {
      const apiJson = JSON.parse(text) as Record<string, unknown>;
      return Response.json(
        {
          ...apiJson,
          webapp: {
            gitSha: runtimeConfig.gitSha ?? null,
            runtimeConfigVersion: runtimeConfig.runtimeConfigVersion,
            version: runtimeConfig.version ?? null,
          },
        },
        { headers: { "Cache-Control": "no-store" }, status: apiResponse.status },
      );
    } catch {
      // Fall through to raw response
    }
  }

  return new Response(text, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": contentType,
      "x-bondery-runtime-config-version": String(runtimeConfig.runtimeConfigVersion),
      "x-bondery-webapp-git-sha": runtimeConfig.gitSha ?? "",
      "x-bondery-webapp-version": runtimeConfig.version ?? "",
    },
    status: apiResponse.status,
  });
}
