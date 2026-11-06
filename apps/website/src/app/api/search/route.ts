import { createFromSource } from "fumadocs-core/search/server";
import { source } from "@/lib/source";

const { GET: searchDocs } = createFromSource(source, {
  language: "english",
});

export async function GET(request: Request) {
  const response = await searchDocs(request);
  response.headers.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  return response;
}
