import { WEBSITE_URL } from "@/lib/config";
import { WEBSITE_ROUTES } from "@bondery/helpers";
import { getAllPosts, BLOG_CATEGORIES } from "@/app/blog/_lib";
import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const blogCategoryEntries: MetadataRoute.Sitemap = BLOG_CATEGORIES.map((cat) => ({
    url: `${WEBSITE_URL}/blog/${cat}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const blogPostEntries: MetadataRoute.Sitemap = getAllPosts().map((post) => ({
    url: `${WEBSITE_URL}/blog/${post.category}/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [
    {
      url: `${WEBSITE_URL}${WEBSITE_ROUTES.HOME}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${WEBSITE_URL}${WEBSITE_ROUTES.CONTACT}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${WEBSITE_URL}${WEBSITE_ROUTES.PRIVACY}`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${WEBSITE_URL}${WEBSITE_ROUTES.TERMS}`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.5,
    },
    ...blogCategoryEntries,
    ...blogPostEntries,
  ];
}
