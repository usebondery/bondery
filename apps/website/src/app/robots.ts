import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getWebsiteUrl } from "@/lib/config";

/** Search, citation, and user-fetch crawlers we allow to index public marketing/docs content. */
const CITATION_AND_SEARCH_BOTS = [
  "OAI-SearchBot",
  "PerplexityBot",
  "Perplexity-User",
  "ChatGPT-User",
  "Claude-SearchBot",
  "Claude-User",
  "anthropic-ai",
  "Claude-Web",
] as const;

/** Training and dataset scrapers we block from the marketing site. */
const TRAINING_AND_DATASET_BOTS = [
  "GPTBot",
  "ClaudeBot",
  "CCBot",
  "Bytespider",
  "Google-Extended",
  "Meta-ExternalAgent",
  "Applebot-Extended",
  "Amazonbot",
  "cohere-ai",
] as const;

export default async function robots(): Promise<MetadataRoute.Robots> {
  await connection();
  const origin = getWebsiteUrl();

  return {
    rules: [
      ...CITATION_AND_SEARCH_BOTS.map((userAgent) => ({
        allow: "/" as const,
        userAgent,
      })),
      ...TRAINING_AND_DATASET_BOTS.map((userAgent) => ({
        disallow: "/" as const,
        userAgent,
      })),
      {
        allow: "/",
        other: {
          "Content-Signal": "search=yes, ai-train=no",
        },
        userAgent: "*",
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
  };
}
