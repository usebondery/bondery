import { connection } from "next/server";
import { renderDocsIndex } from "@/lib/get-llm-text";

export const revalidate = false;

export async function GET() {
  // Read the public origin at request time; the build bakes a placeholder URL.
  await connection();

  return new Response(await renderDocsIndex(), {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
