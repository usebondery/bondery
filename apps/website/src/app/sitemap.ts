import { WEBSITE_ROUTES } from "@bondery/helpers";
import type { MetadataRoute } from "next";
import { BLOG_CATEGORIES, getAllPosts } from "@/app/blog/_lib";
import { WEBSITE_URL } from "@/lib/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const blogCategoryEntries: MetadataRoute.Sitemap = BLOG_CATEGORIES.map((cat) => ({
    changeFrequency: "weekly" as const,
    lastModified: now,
    priority: 0.7,
    url: `${WEBSITE_URL}/blog/${cat}`,
  }));

  const blogPostEntries: MetadataRoute.Sitemap = getAllPosts().map((post) => ({
    changeFrequency: "monthly" as const,
    lastModified: new Date(post.date),
    priority: 0.8,
    url: `${WEBSITE_URL}/blog/${post.category}/${post.slug}`,
  }));

  return [
    {
      changeFrequency: "monthly",
      lastModified: now,
      priority: 1,
      url: `${WEBSITE_URL}${WEBSITE_ROUTES.HOME}`,
    },
    {
      changeFrequency: "monthly",
      lastModified: now,
      priority: 0.8,
      url: `${WEBSITE_URL}${WEBSITE_ROUTES.CONTACT}`,
    },
    {
      changeFrequency: "yearly",
      lastModified: now,
      priority: 0.5,
      url: `${WEBSITE_URL}${WEBSITE_ROUTES.PRIVACY}`,
    },
    {
      changeFrequency: "yearly",
      lastModified: now,
      priority: 0.5,
      url: `${WEBSITE_URL}${WEBSITE_ROUTES.TERMS}`,
    },
    ...blogCategoryEntries,
    ...blogPostEntries,
  ];
}
