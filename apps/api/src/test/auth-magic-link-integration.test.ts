/**
 * Real-Postgres magic-link sign-in (Better Auth plugin).
 *
 * Shares the `test:auth` harness. See `auth-integration.test.ts` for env and
 * migration requirements. SMTP is skipped via `setMagicLinkSendCaptureForTests`.
 */
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { after, afterEach, before, describe, it } from "node:test";
import { prisma } from "@bondery/db";
import { generateId } from "@bondery/helpers/ids";
import { loginEmailFormSchema } from "@bondery/schemas";
import type { FastifyInstance } from "fastify";
import { hashMagicLinkStoredIdentifier } from "../lib/auth/magic-link-redis.js";
import { BETTER_AUTH_REDIS_KEY_PREFIX } from "../lib/auth/secondary-storage.js";
import type { MagicLinkSendPayload } from "../lib/auth/send-magic-link.js";
import { requireRedisCommands, shutdownRedis } from "../lib/data/redis.js";
import { loadTestEnv } from "./load-test-env.js";

loadTestEnv();

const reviewerEmailAtStart = process.env.BONDERY_AUTH_REVIEWER_EMAIL;

function restoreReviewerEmail(): void {
  if (reviewerEmailAtStart === undefined) {
    delete process.env.BONDERY_AUTH_REVIEWER_EMAIL;
    return;
  }
  process.env.BONDERY_AUTH_REVIEWER_EMAIL = reviewerEmailAtStart;
}

async function withReviewerEmail<T>(email: string | undefined, run: () => Promise<T>): Promise<T> {
  if (email === undefined) {
    delete process.env.BONDERY_AUTH_REVIEWER_EMAIL;
  } else {
    process.env.BONDERY_AUTH_REVIEWER_EMAIL = email;
  }
  try {
    return await run();
  } finally {
    restoreReviewerEmail();
  }
}

const { createTestApp } = await import("./create-test-app.js");
const { resolveApiResourceIdentifier } = await import("../lib/auth/index.js");
const { setMagicLinkSendCaptureForTests } = await import("../lib/auth/send-magic-link.js");
const { resolveResourceId, provisionWebappClient } = await import(
  "../lib/bootstrap/provision-oauth-clients.js"
);

const WEBAPP_URL = (process.env.BONDERY_PUBLIC_WEBAPP_URL ?? "").replace(/\/+$/, "");
const CALLBACK_URL = `${WEBAPP_URL}/auth/start`;
const ERROR_CALLBACK_URL = `${WEBAPP_URL}/login`;
const CLIENT_ID = process.env.BONDERY_PUBLIC_WEBAPP_OAUTH_CLIENT_ID as string;
const RESOURCE = resolveApiResourceIdentifier();
const OAUTH_SCOPE = "openid profile email offline_access api:access";

function base64url(input: Buffer): string {
  return input.toString("base64url");
}

function generatePkcePair(): { challenge: string; verifier: string } {
  const verifier = base64url(randomBytes(32));
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { challenge, verifier };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractSetCookieHeader(header: string | string[] | undefined): string {
  if (!header) {
    return "";
  }
  return Array.isArray(header) ? header.join("; ") : header;
}

function extractSessionTokenFromSetCookie(header: string | string[] | undefined): string | null {
  const raw = extractSetCookieHeader(header);
  const match = /(?:^|,\s*)(?:better-auth\.)?session_token=([^;]+)/i.exec(raw);
  if (match?.[1]) {
    return decodeURIComponent(match[1]);
  }

  const fallback = /session_token=([^;]+)/i.exec(raw);
  return fallback?.[1] ? decodeURIComponent(fallback[1]) : null;
}

describe("loginEmailFormSchema", () => {
  it("accepts a .test address", () => {
    const parsed = loginEmailFormSchema.parse({ email: "Reviewer@Example.test" });
    assert.equal(parsed.email, "reviewer@example.test");
  });
});

describe("magic-link auth", () => {
  let app: FastifyInstance;
  const createdUserIds: string[] = [];
  let lastSend: MagicLinkSendPayload | null = null;

  before(async () => {
    app = await createTestApp();
    await provisionWebappClient(await resolveResourceId());
  });

  afterEach(() => {
    lastSend = null;
    setMagicLinkSendCaptureForTests(null);
    restoreReviewerEmail();
  });

  after(async () => {
    setMagicLinkSendCaptureForTests(null);
    await app.close();
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await shutdownRedis();
  });

  function captureSend(): void {
    lastSend = null;
    setMagicLinkSendCaptureForTests((payload) => {
      lastSend = payload;
    });
  }

  /** Stable per-email IP so Better Auth's 5/60 send+verify limit is not shared across cases. */
  function clientIpForEmail(email: string): string {
    const ipBytes = createHash("sha256").update(email).digest();
    return `10.${ipBytes[0]}.${ipBytes[1]}.${ipBytes[2] === 0 ? 1 : ipBytes[2]}`;
  }

  async function postMagicLink(email: string) {
    captureSend();
    const forwardedFor = clientIpForEmail(email);
    return app.inject({
      headers: {
        "content-type": "application/json",
        origin: WEBAPP_URL,
        "x-forwarded-for": forwardedFor,
      },
      method: "POST",
      payload: {
        callbackURL: CALLBACK_URL,
        email,
        errorCallbackURL: ERROR_CALLBACK_URL,
      },
      remoteAddress: forwardedFor,
      url: "/auth/sign-in/magic-link",
    });
  }

  async function getVerify(url: string, email: string) {
    const parsed = new URL(url);
    const forwardedFor = clientIpForEmail(email);
    return app.inject({
      headers: {
        origin: WEBAPP_URL,
        "x-forwarded-for": forwardedFor,
      },
      method: "GET",
      remoteAddress: forwardedFor,
      url: `${parsed.pathname}${parsed.search}`,
    });
  }

  it("verifies a captured sign-in link, sets a session, and authorizes OAuth", async () => {
    const email = `magic-link-${generateId()}@example.test`;
    const sendResponse = await postMagicLink(email);
    assert.equal(sendResponse.statusCode, 200, sendResponse.body);
    assert.ok(lastSend?.url, "expected sendMagicLink to capture a verify URL");
    assert.ok(lastSend.token);

    const verifyResponse = await getVerify(lastSend.url, email);
    assert.equal(verifyResponse.statusCode, 302);
    assert.equal(verifyResponse.headers.location, CALLBACK_URL);
    assert.equal(verifyResponse.headers["referrer-policy"], "no-referrer");

    const user = await prisma.user.findUnique({ where: { email } });
    assert.ok(user);
    createdUserIds.push(user.id);
    assert.equal(user.emailVerified, true);
    assert.equal(user.name, email.slice(0, email.indexOf("@")));

    const myself = await prisma.people.findFirst({
      where: { myself: true, userId: user.id },
    });
    assert.ok(myself);
    assert.equal(myself.firstName, email.slice(0, email.indexOf("@")));
    assert.equal(myself.lastName, null);

    const accountCount = await prisma.account.count({ where: { userId: user.id } });
    assert.equal(accountCount, 0, "magic-link signup must not create an Account row");

    const session = await prisma.session.findFirst({
      orderBy: { createdAt: "desc" },
      where: { userId: user.id },
    });
    assert.ok(session);

    const cookieToken = extractSessionTokenFromSetCookie(verifyResponse.headers["set-cookie"]);
    const sessionToken = cookieToken ?? session.token;
    const { challenge } = generatePkcePair();
    const authorizeUrl = new URL("http://test/auth/oauth2/authorize");
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("client_id", CLIENT_ID);
    authorizeUrl.searchParams.set("redirect_uri", `${WEBAPP_URL}/auth/oauth-callback`);
    authorizeUrl.searchParams.set("code_challenge", challenge);
    authorizeUrl.searchParams.set("code_challenge_method", "S256");
    authorizeUrl.searchParams.set("state", "magic-link-state");
    authorizeUrl.searchParams.set("scope", OAUTH_SCOPE);
    authorizeUrl.searchParams.set("resource", RESOURCE);

    const authorizeResponse = await app.inject({
      headers: {
        authorization: `Bearer ${sessionToken}`,
        origin: WEBAPP_URL,
      },
      method: "GET",
      url: `${authorizeUrl.pathname}?${authorizeUrl.searchParams.toString()}`,
    });
    assert.equal(authorizeResponse.statusCode, 302, authorizeResponse.body);
  });

  it("rejects a second verify of the same token", async () => {
    const email = `magic-link-replay-${generateId()}@example.test`;
    const sendResponse = await postMagicLink(email);
    assert.equal(sendResponse.statusCode, 200, sendResponse.body);
    assert.ok(lastSend?.url);

    const first = await getVerify(lastSend.url, email);
    assert.equal(first.statusCode, 302);

    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      createdUserIds.push(user.id);
    }

    const second = await getVerify(lastSend.url, email);
    assert.equal(second.statusCode, 302);
    const location = String(second.headers.location ?? "");
    assert.match(location, /error=INVALID_TOKEN/);
  });

  it("signs an existing GitHub-linked user in without creating an Account", async () => {
    const id = generateId();
    const email = `magic-link-github-${id}@example.test`;
    await prisma.user.create({
      data: { email, emailVerified: true, id, name: "Existing GitHub User" },
    });
    createdUserIds.push(id);
    await prisma.account.create({
      data: {
        id: generateId(),
        providerAccountId: `github-${id}`,
        providerId: "github",
        userId: id,
      },
    });

    const sendResponse = await postMagicLink(email);
    assert.equal(sendResponse.statusCode, 200, sendResponse.body);
    assert.ok(lastSend?.url);

    const verifyResponse = await getVerify(lastSend.url, email);
    assert.equal(verifyResponse.statusCode, 302);

    const accounts = await prisma.account.findMany({ where: { userId: id } });
    assert.equal(accounts.length, 1);
    assert.equal(accounts[0]?.providerId, "github");

    const users = await prisma.user.findMany({ where: { email } });
    assert.equal(users.length, 1);
    assert.equal(users[0]?.id, id);
  });

  it("stores a hashed identifier instead of the plaintext token", async () => {
    const email = `magic-link-hashed-${generateId()}@example.test`;
    const sendResponse = await postMagicLink(email);
    assert.equal(sendResponse.statusCode, 200, sendResponse.body);
    assert.ok(lastSend?.token);

    const hashed = hashMagicLinkStoredIdentifier(lastSend.token);
    const redis = requireRedisCommands();
    const stored = await redis.get(
      `${BETTER_AUTH_REDIS_KEY_PREFIX}verification:magic-link:${hashed}`,
    );
    assert.ok(stored, "expected hashed verification in Redis");
    assert.doesNotMatch(stored, new RegExp(escapeRegExp(lastSend.token)));

    const dbRows = await prisma.verification.findMany({
      where: { identifier: lastSend.token },
    });
    assert.equal(dbRows.length, 0);
  });

  it("invalidates the previous sign-in link when a new one is requested", async () => {
    const email = `magic-link-resend-${generateId()}@example.test`;
    const first = await postMagicLink(email);
    assert.equal(first.statusCode, 200, first.body);
    assert.ok(lastSend?.url);
    const firstUrl = lastSend.url;

    const second = await postMagicLink(email);
    assert.equal(second.statusCode, 200, second.body);
    assert.ok(lastSend?.url);
    const secondUrl = lastSend.url;
    assert.notEqual(firstUrl, secondUrl);

    const stale = await getVerify(firstUrl, email);
    assert.equal(stale.statusCode, 302);
    assert.match(String(stale.headers.location ?? ""), /error=INVALID_TOKEN/);

    const fresh = await getVerify(secondUrl, email);
    assert.equal(fresh.statusCode, 302);
    assert.equal(fresh.headers.location, CALLBACK_URL);

    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      createdUserIds.push(user.id);
    }
  });

  async function verificationKeyCount(): Promise<number> {
    const redis = requireRedisCommands();
    const keys = await redis.keys(`${BETTER_AUTH_REDIS_KEY_PREFIX}verification:*`);
    return keys.length;
  }

  it("sends mail when the reviewer address is unset", async () => {
    const email = `magic-link-unset-${generateId()}@example.test`;
    const response = await withReviewerEmail(undefined, () => postMagicLink(email));
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.json().redirect, undefined);
    assert.equal(lastSend?.email, email);
  });

  it("sends mail for an address that is not the reviewer", async () => {
    const reviewer = `reviewer-${generateId()}@example.test`;
    const email = `magic-link-other-${generateId()}@example.test`;
    const response = await withReviewerEmail(reviewer, () => postMagicLink(email));
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.json().redirect, undefined);
    assert.equal(lastSend?.email, email);
  });

  it("skips mail and returns the verify URL for an existing reviewer", async () => {
    const email = `reviewer-ready-${generateId()}@example.test`;
    const id = generateId();
    await prisma.user.create({
      data: { email, emailVerified: true, id, name: "Reviewer" },
    });
    createdUserIds.push(id);

    const response = await withReviewerEmail(email, () => postMagicLink(email));
    assert.equal(response.statusCode, 200, response.body);
    assert.equal(lastSend, null);

    const body = response.json() as { redirect?: boolean; status?: boolean; url?: string };
    assert.equal(body.status, true);
    assert.equal(body.redirect, true);
    assert.match(body.url ?? "", /\/magic-link\/verify\?/);
    assert.match(body.url ?? "", /[?&]token=/);
    assert.ok(body.url);

    const verifyResponse = await getVerify(body.url, email);
    assert.equal(verifyResponse.statusCode, 302);
    assert.equal(verifyResponse.headers.location, CALLBACK_URL);

    const users = await prisma.user.findMany({ where: { email } });
    assert.equal(users.length, 1);
    assert.equal(users[0]?.id, id);
  });

  it("does not send mail or create a user when the reviewer row is missing", async () => {
    const email = `reviewer-missing-${generateId()}@example.test`;
    const keysBefore = await verificationKeyCount();
    const rowsBefore = await prisma.verification.count();

    const response = await withReviewerEmail(email, () => postMagicLink(email));
    assert.notEqual(response.statusCode, 200);
    assert.match(response.body, /EMAIL_SEND_FAILED/);
    assert.equal(lastSend, null);

    const user = await prisma.user.findUnique({ where: { email } });
    assert.equal(user, null);
    assert.equal(await verificationKeyCount(), keysBefore);
    assert.equal(await prisma.verification.count(), rowsBefore);

    const redis = requireRedisCommands();
    const keys = await redis.keys(`${BETTER_AUTH_REDIS_KEY_PREFIX}verification:*`);
    for (const key of keys) {
      const value = await redis.get(key);
      assert.equal(value?.includes(email) ?? false, false);
    }
  });

  it("returns 429 after eight sign-in emails for the same address", async () => {
    const email = `magic-link-limit-${generateId()}@example.test`;
    for (const _ of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const response = await postMagicLink(email);
      assert.equal(response.statusCode, 200, response.body);
    }

    const blocked = await postMagicLink(email);
    assert.equal(blocked.statusCode, 429);
    assert.match(blocked.body, /TOO_MANY_REQUESTS/);
  });
});
