import { buildWebappRuntimeConfigFromEnv } from "@/lib/platform/runtimeConfig.server";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = buildWebappRuntimeConfigFromEnv();

  return Response.json(config, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
