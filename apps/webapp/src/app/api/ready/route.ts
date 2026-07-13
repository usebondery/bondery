import { validateWebappRuntimeConfigAtStartup } from "@/lib/platform/runtimeConfig.server";

/** Readiness probe — validates runtime config; does not call upstream API. */
export async function GET() {
  try {
    validateWebappRuntimeConfigAtStartup();
    return Response.json(
      { ok: true },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid runtime config";
    return Response.json(
      { error: message, ok: false },
      {
        headers: { "Cache-Control": "no-store" },
        status: 503,
      },
    );
  }
}
