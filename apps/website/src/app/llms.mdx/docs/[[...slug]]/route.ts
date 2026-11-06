import { notFound } from "next/navigation";
import { connection } from "next/server";
import { isPublishedDocsPage } from "@/lib/docs-visibility";
import { docsLlms } from "@/lib/get-llm-text";
import { source } from "@/lib/source";

/**
 * Serve `/docs/<slug>.md` as Markdown.
 *
 * `next.config.ts` rewrites `/docs/:path*.md` to the internal `/llms.mdx/docs`
 * route with a trailing `content.md` segment. Strip that segment, then map
 * `/docs/index.md` onto the root page.
 */
type RouteContext = {
  params: Promise<{ slug?: string[] }>;
};

export async function GET(_req: Request, { params }: RouteContext) {
  // Pages embed the public origin, which the build only knows as a placeholder.
  await connection();

  const { slug } = await params;
  const segments = (slug ?? []).slice(0, -1);
  if (segments.at(-1) === "index") {
    segments.pop();
  }

  const page = source.getPage(segments);
  if (!page || !isPublishedDocsPage(page)) {
    notFound();
  }

  return new Response(await docsLlms.page(page), {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}

export function generateStaticParams() {
  return source
    .getPages()
    .filter(isPublishedDocsPage)
    .map((page) => ({ slug: [...page.slugs, "content.md"] }));
}
