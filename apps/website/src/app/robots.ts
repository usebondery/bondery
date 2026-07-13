import type { MetadataRoute } from "next";
import { WEBSITE_URL } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      allow: "/",
      userAgent: "*",
    },
    sitemap: `${WEBSITE_URL}/sitemap.xml`,
  };
}
