import { WEBSITE_ROUTES } from "@bondery/helpers";
import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getAllPosts } from "@/app/blog/_lib";
import { BLOG_CATEGORIES } from "@/lib/blog/categories";
import { getWebsiteUrl } from "@/lib/config";
import { listFolderSlugs } from "@/lib/docs-folders";
import { isPublishedDocsPage } from "@/lib/docs-visibility";
import { getFilteredPageTree, source } from "@/lib/source";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const origin = getWebsiteUrl();
  const now = new Date();

  const blogCategoryEntries: MetadataRoute.Sitemap = BLOG_CATEGORIES.map((cat) => ({
    changeFrequency: "weekly" as const,
    lastModified: now,
    priority: 0.7,
    url: `${origin}/blog/${cat}`,
  }));

  const blogPostEntries: MetadataRoute.Sitemap = getAllPosts().map((post) => ({
    changeFrequency: "monthly" as const,
    lastModified: new Date(post.date),
    priority: 0.8,
    url: `${origin}/blog/${post.category}/${post.slug}`,
  }));

  const docEntries: MetadataRoute.Sitemap = source
    .getPages()
    .filter(isPublishedDocsPage)
    .map((page) => ({
      changeFrequency: "weekly" as const,
      lastModified: now,
      priority: 0.6,
      url: `${origin}${page.url}`,
    }));

  const docPageUrls = new Set(docEntries.map((entry) => entry.url));

  const folderEntries: MetadataRoute.Sitemap = listFolderSlugs(
    getFilteredPageTree().children,
    new Set(source.getPages().map((page) => page.slugs.join("/"))),
  )
    .map((slug) => `${origin}/docs/${slug.join("/")}`)
    .filter((url) => !docPageUrls.has(url))
    .map((url) => ({
      changeFrequency: "weekly" as const,
      lastModified: now,
      priority: 0.6,
      url,
    }));

  return [
    {
      changeFrequency: "monthly",
      lastModified: now,
      priority: 1,
      url: `${origin}${WEBSITE_ROUTES.HOME}`,
    },
    {
      changeFrequency: "monthly",
      lastModified: now,
      priority: 0.8,
      url: `${origin}${WEBSITE_ROUTES.CONTACT}`,
    },
    {
      changeFrequency: "yearly",
      lastModified: now,
      priority: 0.5,
      url: `${origin}${WEBSITE_ROUTES.PRIVACY}`,
    },
    {
      changeFrequency: "yearly",
      lastModified: now,
      priority: 0.5,
      url: `${origin}${WEBSITE_ROUTES.TERMS}`,
    },
    {
      changeFrequency: "yearly",
      lastModified: now,
      priority: 0.5,
      url: `${origin}${WEBSITE_ROUTES.SECURITY}`,
    },
    ...docEntries,
    ...folderEntries,
    ...blogCategoryEntries,
    ...blogPostEntries,
  ];
}
