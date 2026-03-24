/**
 * Blog post announcement CLI script.
 *
 * Publishes a blog post to Discord and/or Reddit using the post's `announce`
 * metadata. Reads post metadata from content/blog/metadata.ts — a plain
 * TypeScript (non-MDX) registry safe to import via tsx.
 *
 * Usage:
 *   npm run announce -- <slug> [tokens...]
 *
 * Arguments:
 *   <slug>             Required. Post slug to announce (first positional).
 *
 * Optional tokens (plain words — no "--" prefix, safe from npm flag interception):
 *   simulate           Log payloads without sending to external services.
 *   discord            Only post to Discord, skip Reddit.
 *   reddit             Only post to Reddit, skip Discord.
 *   skip-check         Announce even if post.announce.enabled is false.
 *
 * Required environment variables:
 *   NEXT_PUBLIC_WEBSITE_URL       Base URL of the website (e.g. https://bondery.app)
 *   PRIVATE_DISCORD_WEBHOOK_URL   Discord channel webhook URL (not needed with --reddit-only)
 *   REDDIT_CLIENT_ID              Reddit OAuth2 app client ID [not needed with --discord-only]
 *   REDDIT_CLIENT_SECRET          Reddit OAuth2 app client secret [not needed with --discord-only]
 *   REDDIT_USERNAME               Reddit account username [not needed with --discord-only]
 *   REDDIT_PASSWORD               Reddit account password [not needed with --discord-only]
 */

import fs from "fs";
import path from "path";
import { allPostMeta } from "../content/blog/metadata";
import { getReadingTime } from "@bondery/helpers";
import { postDiscordAnnouncement } from "./lib/discord";
import { postRedditAnnouncement, type RedditConfig } from "./lib/reddit";
import { getCategoryConfig } from "../src/app/blog/_lib/categories";

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

// All tokens are plain words (no "--" prefix) so npm 11 does not intercept them.
// The slug is the first token that isn't a known control word.
const CONTROL_TOKENS = new Set(["simulate", "discord", "reddit", "skip-check"]);
const slug = args.find((a) => !CONTROL_TOKENS.has(a));
const dryRun = args.includes("simulate");
const discordOnly = args.includes("discord");
const redditOnly = args.includes("reddit");
const force = args.includes("skip-check");

if (!slug) {
  console.error("Error: post slug is required as the first argument.");
  console.error("Usage: npm run announce -- <slug> [simulate] [discord] [reddit] [skip-check]");
  process.exit(1);
}

if (discordOnly && redditOnly) {
  console.error("Error: discord and reddit tokens are mutually exclusive.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Environment validation
// ---------------------------------------------------------------------------

// Always required
const alwaysRequired = ["NEXT_PUBLIC_WEBSITE_URL"];
// Only required when posting to Discord (not when --reddit-only)
const discordRequired = discordOnly || !redditOnly ? ["PRIVATE_DISCORD_WEBHOOK_URL"] : [];
// Only required when posting to Reddit (not when --discord-only)
const redditRequired =
  redditOnly || !discordOnly
    ? ["REDDIT_CLIENT_ID", "REDDIT_CLIENT_SECRET", "REDDIT_USERNAME", "REDDIT_PASSWORD"]
    : [];

const missingEnv = [...alwaysRequired, ...discordRequired, ...redditRequired].filter(
  (key) => !process.env[key],
);
if (missingEnv.length > 0) {
  console.error("Error: Missing required environment variables:");
  missingEnv.forEach((key) => console.error(`  - ${key}`));
  process.exit(1);
}

const websiteUrl = process.env.NEXT_PUBLIC_WEBSITE_URL!.replace(/\/$/, "");
const discordWebhookUrl = process.env.PRIVATE_DISCORD_WEBHOOK_URL ?? "";
const redditConfig: RedditConfig = {
  clientId: process.env.REDDIT_CLIENT_ID ?? "",
  clientSecret: process.env.REDDIT_CLIENT_SECRET ?? "",
  username: process.env.REDDIT_USERNAME ?? "",
  password: process.env.REDDIT_PASSWORD ?? "",
};

// ---------------------------------------------------------------------------
// Find post
// ---------------------------------------------------------------------------

const post = allPostMeta.find((p) => p.slug === slug);

if (!post) {
  console.error(`Error: No post found with slug "${slug}".`);
  console.error("Make sure the post is registered in content/blog/metadata.ts.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Check announce eligibility
// ---------------------------------------------------------------------------

if (!post.announce?.enabled && !force) {
  console.log(`Skipping: ${post.slug} — announce.enabled is false.`);
  console.log("Set announce.enabled = true in the post's .meta.ts file, or pass skip-check token.");
  process.exit(0);
}

if (force && !post.announce?.enabled) {
  console.warn("Warning: Announcing despite announce.enabled = false (skip-check token used).");
}

// ---------------------------------------------------------------------------
// Resolve post URL
// ---------------------------------------------------------------------------

const postUrl = `${websiteUrl}/blog/${post.category}/${post.slug}`;

let readingTime = 1;
try {
  const mdxPath = path.join(process.cwd(), "content", "blog", post.category, `${post.slug}.mdx`);
  const mdxContent = fs.readFileSync(mdxPath, "utf-8");
  readingTime = getReadingTime(mdxContent).minutes;
} catch {
  // Falls back to 1 min
}

console.log(`Announcing: "${post.title}"`);
console.log(`  URL: ${postUrl}`);
if (dryRun) {
  console.log("  Mode: SIMULATE — no requests will be sent.");
}

// ---------------------------------------------------------------------------
// Determine platforms to post to
// ---------------------------------------------------------------------------

const announceDiscord = !redditOnly && post.announce?.discord !== false;
const announceReddit = !discordOnly && post.announce?.reddit !== false;

if (!announceDiscord && !announceReddit) {
  console.log("No platforms selected. Nothing to do.");
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Post in parallel
// ---------------------------------------------------------------------------

void (async () => {
  const tasks: Promise<void>[] = [];

  if (announceDiscord) {
    console.log("  Platform: Discord");
    tasks.push(
      postDiscordAnnouncement(post, postUrl, discordWebhookUrl, readingTime, dryRun).then(() => {
        console.log("Discord: Done.");
      }),
    );
  }

  if (announceReddit) {
    console.log("  Platform: Reddit");
    tasks.push(
      postRedditAnnouncement(
        post,
        postUrl,
        redditConfig,
        getCategoryConfig(post.category)?.redditFlairId,
        dryRun,
      ).then(() => {
        console.log("Reddit: Done.");
      }),
    );
  }

  const results = await Promise.allSettled(tasks);

  let failed = false;
  for (const result of results) {
    if (result.status === "rejected") {
      console.error(
        "Error:",
        result.reason instanceof Error ? result.reason.message : result.reason,
      );
      failed = true;
    }
  }

  if (failed) {
    process.exit(1);
  }

  console.log("Announcement complete.");
})();
