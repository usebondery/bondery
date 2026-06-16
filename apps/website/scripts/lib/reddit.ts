import type { PostMeta } from "@/app/blog/_lib/types";

const REDDIT_TOKEN_URL = "https://www.reddit.com/api/v1/access_token";
const REDDIT_SUBMIT_URL = "https://oauth.reddit.com/api/submit";
const DEFAULT_SUBREDDIT = "bondery";

export interface RedditConfig {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
}

/**
 * Fetches a short-lived OAuth2 access token using the "password" grant.
 * Reddit "script" app type allows this without user interaction.
 */
async function getAccessToken(config: RedditConfig, userAgent: string): Promise<string> {
  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");

  const response = await fetch(REDDIT_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": userAgent,
    },
    body: new URLSearchParams({
      grant_type: "password",
      username: config.username,
      password: config.password,
    }),
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error(
      `Reddit auth failed (${response.status}). Check REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD.`,
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "(no body)");
    throw new Error(
      `Reddit token request failed: ${response.status} ${response.statusText}\n${body}`,
    );
  }

  const data = (await response.json()) as { access_token?: string; error?: string };

  if (!data.access_token) {
    throw new Error(`Reddit token request returned no access_token: ${JSON.stringify(data)}`);
  }

  return data.access_token;
}

/**
 * Submits a link post to a subreddit via Reddit's OAuth API.
 *
 * @param post - The PostMeta object for the blog post to announce.
 * @param postUrl - The canonical URL of the published blog post.
 * @param config - Reddit OAuth credentials (client ID/secret + username/password).
 * @param flairId - Link flair template UUID to attach to the submission.
 * @param dryRun - When true, logs what would be submitted without calling the API.
 */
export async function postRedditAnnouncement(
  post: PostMeta,
  postUrl: string,
  config: RedditConfig,
  flairId?: string,
  dryRun = false,
): Promise<void> {
  const subreddit = post.announce?.subreddit ?? DEFAULT_SUBREDDIT;
  const title = post.announce?.redditTitle ?? post.title;
  // Required by Reddit — requests without this are rate-limited or silently dropped.
  const userAgent = `nodejs:bondery-announce:v1.0.0 (by u/${config.username})`;

  if (dryRun) {
    console.log("[Reddit] Dry run — would submit:");
    console.log(
      JSON.stringify(
        {
          subreddit,
          title,
          url: postUrl,
          kind: "link",
          flair_id: flairId,
          flair_text: post.announce?.redditFlair,
        },
        null,
        2,
      ),
    );
    return;
  }

  const token = await getAccessToken(config, userAgent);

  const body = new URLSearchParams({
    kind: "link",
    sr: subreddit,
    title,
    url: postUrl,
    resubmit: "false",
    nsfw: "false",
    spoiler: "false",
  });

  if (flairId) {
    body.set("flair_id", flairId);
  }
  if (post.announce?.redditFlair) {
    body.set("flair_text", post.announce.redditFlair);
  }

  const response = await fetch(REDDIT_SUBMIT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": userAgent,
    },
    body,
  });

  if (response.status === 429) {
    throw new Error(
      "[Reddit] Rate limited (429). Wait before retrying. Do not retry automatically — let GitHub Actions report the failure.",
    );
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error(
      `[Reddit] Permission denied (${response.status}). Ensure the bot account is a moderator of r/${subreddit}.`,
    );
  }

  if (!response.ok) {
    const responseBody = await response.text().catch(() => "(no body)");
    throw new Error(
      `Reddit submit failed: ${response.status} ${response.statusText}\n${responseBody}`,
    );
  }

  const result = (await response.json()) as { json?: { errors?: unknown[] } };
  const errors = result?.json?.errors;
  if (errors && Array.isArray(errors) && errors.length > 0) {
    throw new Error(`Reddit returned submission errors: ${JSON.stringify(errors)}`);
  }

  console.log(`[Reddit] ✅ Submitted to r/${subreddit} successfully.`);
}
