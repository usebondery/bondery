/** Liveness probe for container orchestrators. Does not validate env. */
export async function GET() {
  return Response.json(
    { ok: true },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
