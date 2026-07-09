import type { BlogPosting, WithContext } from "schema-dts";
import type { PostMeta } from "@/app/blog/_lib/types";
import { WEBSITE_URL } from "@/lib/config";
import { ORGANIZATION_ID } from "../constants";

export function buildBlogPostingSchema(
  meta: PostMeta,
  category: string,
  slug: string,
): WithContext<BlogPosting> {
  const url = `${WEBSITE_URL}/blog/${category}/${slug}`;

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    dateModified: meta.modifiedDate ?? meta.date,
    datePublished: meta.date,
    description: meta.description,
    headline: meta.title,
    mainEntityOfPage: {
      "@id": url,
      "@type": "WebPage",
    },
    publisher: {
      "@id": ORGANIZATION_ID,
    },
    url,
    ...(meta.author && {
      author: {
        "@type": "Person",
        name: meta.author,
      },
    }),
    ...(meta.tags && { keywords: meta.tags.join(", ") }),
  };
}
