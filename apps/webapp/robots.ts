import type { MetadataRoute } from "next";
import { WEBAPP_URL } from "@/lib/platform/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      disallow: ["/api/", "/app/", "*"],
      userAgent: "*",
    },
    sitemap: `${WEBAPP_URL}/sitemap.xml`,
  };
}
