import { OgTitled } from "@bondery/branding/og";
import { BLOG_CATEGORIES, getBlogCategoryTitle } from "@/lib/blog/categories";
import { createOgImageResponse, OG_IMAGE_CONTENT_TYPE } from "@/lib/og/imageResponse";

const contentType = OG_IMAGE_CONTENT_TYPE;
const size = { height: 630, width: 1200 };

type ImageProps = {
  params: Promise<{ category: string }>;
};

function generateStaticParams() {
  return BLOG_CATEGORIES.map((category) => ({ category }));
}

async function Image({ params }: ImageProps) {
  const { category } = await params;
  const title = getBlogCategoryTitle(category);

  return createOgImageResponse(
    <OgTitled subtype={category === "all" ? undefined : "Blog"} title={title} />,
  );
}

export { contentType, generateStaticParams, size };
export default Image;
