import { WEBSITE_URL } from "@/lib/config";
import { WEBSITE_ROUTES } from "@bondery/helpers";
import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: `${WEBSITE_URL}${WEBSITE_ROUTES.HOME}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${WEBSITE_URL}${WEBSITE_ROUTES.LOGIN}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${WEBSITE_URL}${WEBSITE_ROUTES.CONTACT}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
