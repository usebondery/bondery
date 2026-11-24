import { OgTitled } from "@bondery/branding/og";
import docs from "@bondery/translations/locales/en/platform/website/WebsiteDocs.json" with {
  type: "json",
};
import { notFound } from "next/navigation";
import { createOgImageResponse } from "@/lib/og/imageResponse";
import { getPageImage, source } from "@/lib/source";

type RouteContext = {
  params: Promise<{ slug: string[] }>;
};

async function GET(_req: Request, context: RouteContext) {
  const { slug } = await context.params;
  const page = source.getPage(slug.slice(0, -1));
  if (!page) {
    notFound();
  }

  return createOgImageResponse(
    <OgTitled subtype={docs.Og.Subtype} title={page.data.title ?? docs.Og.DefaultTitle} />,
  );
}

function generateStaticParams() {
  return source
    .getPages()
    .map((page) => ({
      slug: getPageImage(page).segments,
    }))
    .filter(({ slug }) => !(slug[0] === "api" && slug[1] === "errors"));
}

export { GET, generateStaticParams };
export const revalidate = false;
