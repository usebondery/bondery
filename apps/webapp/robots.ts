import type { MetadataRoute } from "next";
import { buildWebappRuntimeConfigFromEnv } from "@/lib/platform/runtimeConfig.server";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const { webappUrl } = buildWebappRuntimeConfigFromEnv();

  return {
    rules: {
      disallow: ["/api/", "/app/", "*"],
      userAgent: "*",
    },
    sitemap: `${webappUrl}/sitemap.xml`,
  };
}
