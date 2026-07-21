import { validateWebsiteRuntimeEnv } from "@/lib/platform/readyEnv";

/** Readiness probe — validates public env; does not call upstream services. */
export async function GET() {
  try {
    validateWebsiteRuntimeEnv();
    return Response.json(
      { ok: true },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid runtime env";
    return Response.json(
      { error: message, ok: false },
      {
        headers: { "Cache-Control": "no-store" },
        status: 503,
      },
    );
  }
}
