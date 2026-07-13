/** Liveness probe for container orchestrators. Does not call upstream API. */
export async function GET() {
  return Response.json(
    { ok: true },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
