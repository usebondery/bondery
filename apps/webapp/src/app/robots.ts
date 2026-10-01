import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { buildWebappRuntimeConfigFromEnv } from "@/lib/platform/runtimeConfig.server";

export default async function robots(): Promise<MetadataRoute.Robots> {
  await connection();
  const { webappUrl } = buildWebappRuntimeConfigFromEnv();

  return {
    rules: {
      disallow: ["/api/", "/app/", "*"],
      userAgent: "*",
    },
    sitemap: `${webappUrl}/sitemap.xml`,
  };
}
