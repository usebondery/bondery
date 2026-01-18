import { WEBAPP_URL } from "@/lib/config";
import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: ["/api/", "/app/", "*"],
    },
    sitemap: `${WEBAPP_URL}/sitemap.xml`,
  };
}
