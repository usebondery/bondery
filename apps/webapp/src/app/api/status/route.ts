import { bffProxyFetch } from "@/lib/api/bffProxy";

/** Liveness + extension version probe (proxied through webapp BFF). */
export async function GET() {
  const apiResponse = await bffProxyFetch("/status", undefined, {
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
