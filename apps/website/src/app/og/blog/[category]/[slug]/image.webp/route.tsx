import { OgTitled } from "@bondery/branding/og";
import { notFound } from "next/navigation";
import { getAllSlugs, getPostMeta } from "@/app/(marketing)/blog/_lib";
import { createOgImageResponse } from "@/lib/og/imageResponse";

const revalidate = false;

type RouteContext = {
  params: Promise<{ category: string; slug: string }>;
};

async function GET(_req: Request, context: RouteContext) {
  const { category, slug } = await context.params;
  const meta = getPostMeta(category, slug);
  if (!meta) {
    notFound();
  }

  return createOgImageResponse(<OgTitled subtype="Blog" title={meta.title} />);
}

function generateStaticParams() {
  return getAllSlugs();
}

export { GET, generateStaticParams, revalidate };
