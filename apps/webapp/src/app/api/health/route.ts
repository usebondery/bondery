import { bffProxyFetch } from "@/lib/api/bffProxy";

/** Readiness probe (proxied through webapp BFF). */
export async function GET() {
  const apiResponse = await bffProxyFetch("/health", undefined, {
    cache: "no-store",
  });
  const body = await apiResponse.text();

  return new Response(body, {
    headers: {
      "Content-Type": apiResponse.headers.get("Content-Type") ?? "application/json",
    },
    status: apiResponse.status,
  });
}
