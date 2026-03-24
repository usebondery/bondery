import type { PostMeta } from "@/app/blog/_lib/types";
import { getCategoryConfig } from "@/app/blog/_lib/categories";

/** Discord embed color — Bondery brand primary (#a34bcb as decimal). */
const BRAND_COLOR = 0xa34bcb;

interface DiscordEmbed {
  title: string;
  description: string;
  color: number;
  image: { url: string };
}

function buildEmbed(post: PostMeta, postUrl: string): DiscordEmbed {
  const ogImageUrl = `${new URL(postUrl).origin}/opengraph-image`;
  return {
    title: post.title,
    description: post.description,
    color: BRAND_COLOR,
    image: { url: ogImageUrl },
  };
}

/**
 * Posts a rich embed to a Discord channel via webhook.
 *
 * @param post - The PostMeta object for the blog post to announce.
 * @param postUrl - The canonical URL of the published blog post.
 * @param webhookUrl - The Discord webhook URL (from PRIVATE_DISCORD_WEBHOOK_URL secret).
 * @param dryRun - When true, logs the payload to stdout without sending.
 *
 */
export async function postDiscordAnnouncement(
  post: PostMeta,
  postUrl: string,
  webhookUrl: string,
  readingTime: number,
  dryRun = false,
): Promise<void> {
  const categoryConfig = getCategoryConfig(post.category);
  const emoji = categoryConfig?.emoji ?? "📝";
  const embed = buildEmbed(post, postUrl);

  const payload = {
    // thread_name is required when the webhook targets a Discord forum channel.
    thread_name: post.title,
    // applied_tags pins the thread under the matching forum tag.
    applied_tags: categoryConfig?.discordTagId ? [categoryConfig.discordTagId] : [],
    content: `${emoji} [${post.title}](${postUrl}) (${readingTime} min read)`,
    embeds: [embed],
  };

  if (dryRun) {
    console.log("[Discord] Dry run — would send:");
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "(no body)");
    throw new Error(`Discord webhook failed: ${response.status} ${response.statusText}\n${body}`);
  }

  console.log(`[Discord] ✅ Announcement posted successfully.`);
}
