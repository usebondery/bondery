import { serverApiFetch } from "@/lib/api/server";

/** Readiness probe (proxied through webapp BFF). */
export async function GET() {
  const apiResponse = await serverApiFetch("/health", undefined, {
    cache: "no-store",
  });
  const body = await apiResponse.text();

  return new Response(body, {
    status: apiResponse.status,
    headers: {
      "Content-Type": apiResponse.headers.get("Content-Type") ?? "application/json",
    },
  });
}
