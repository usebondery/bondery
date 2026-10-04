/**
 * POST /me/step-up (cookie-fresh native session) and DELETE /me step-up header.
 */
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { after, afterEach, before, describe, it } from "node:test";
import { prisma } from "@bondery/db";
import { BONDERY_STEP_UP_HEADER } from "@bondery/helpers/globals/paths";
import { generateId } from "@bondery/helpers/ids";
import type { FastifyInstance } from "fastify";
import { DomainError } from "../domains/_shared/context.js";
import { provisionNewUser } from "../lib/auth/provision-new-user.js";
import { BETTER_AUTH_REDIS_KEY_PREFIX } from "../lib/auth/secondary-storage.js";
import type { MagicLinkSendPayload } from "../lib/auth/send-magic-link.js";
import { SESSION_FRESH_AGE_SECONDS } from "../lib/auth/session-freshness.js";
import { consumeStepUpToken, mintStepUpToken } from "../lib/auth/step-up-redis.js";
import { requireRedisCommands, shutdownRedis } from "../lib/data/redis.js";
import { loadTestEnv } from "./load-test-env.js";

loadTestEnv();

const { createTestApp } = await import("./create-test-app.js");
const { setMagicLinkSendCaptureForTests } = await import("../lib/auth/send-magic-link.js");

const WEBAPP_URL = (process.env.BONDERY_PUBLIC_WEBAPP_URL ?? "").replace(/\/+$/, "");
const LOGIN_CALLBACK_URL = `${WEBAPP_URL}/auth/start`;
const LOGIN_ERROR_CALLBACK_URL = `${WEBAPP_URL}/login`;
const RECONFIRM_CALLBACK_URL = `${WEBAPP_URL}/app/settings?action=delete_account`;
const RECONFIRM_CONFIRM_CALLBACK_URL = `${WEBAPP_URL}/confirm?action=delete_account`;
const RECONFIRM_CONFIRM_RESUME_CALLBACK_URL = `${WEBAPP_URL}/confirm?action=delete_account&has_returned=1`;

function extractSetCookieHeader(header: string | string[] | undefined): string {
  if (!header) {
    return "";
  }
  return Array.isArray(header) ? header.join("\n") : header;
}

function cookieHeaderFromSetCookie(header: string | string[] | undefined): string {
  const raw = extractSetCookieHeader(header);
  if (!raw) {
    return "";
  }
  return raw
    .split(/[\n,]/)
    .map((part) => part.trim().split(";")[0]?.trim())
    .filter((part): part is string => Boolean(part) && part.includes("="))
    .join("; ");
}

async function createNativeSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await prisma.session.create({
    data: {
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      token,
      userId,
    },
  });
  return token;
}

async function createTestUser(): Promise<{ email: string; id: string }> {
  const id = generateId();
  const email = `step-up-${id}@example.test`;
  await prisma.user.create({
    data: { email, emailVerified: true, id, name: "Step-up Test User" },
  });
  await provisionNewUser({ name: "Step-up Test User", userId: id });
  return { email, id };
}

describe("me step-up", () => {
  let app: FastifyInstance;
  const createdUserIds: string[] = [];
  let lastSend: MagicLinkSendPayload | null = null;

  before(async () => {
    app = await createTestApp();
  });

  afterEach(() => {
    lastSend = null;
    setMagicLinkSendCaptureForTests(null);
  });

  after(async () => {
    setMagicLinkSendCaptureForTests(null);
    await app.close();
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await shutdownRedis();
  });

  function clientIpForEmail(email: string): string {
    const ipBytes = createHash("sha256").update(email).digest();
    return `10.${ipBytes[0]}.${ipBytes[1]}.${ipBytes[2] === 0 ? 1 : ipBytes[2]}`;
  }

  async function postMagicLink(email: string, callbackURL: string, errorCallbackURL: string) {
    lastSend = null;
    setMagicLinkSendCaptureForTests((payload) => {
      lastSend = payload;
    });
    const forwardedFor = clientIpForEmail(email);
    return app.inject({
      headers: {
        "content-type": "application/json",
        origin: WEBAPP_URL,
        "x-forwarded-for": forwardedFor,
      },
      method: "POST",
      payload: {
        callbackURL,
        email,
        errorCallbackURL,
      },
      remoteAddress: forwardedFor,
      url: "/auth/sign-in/magic-link",
    });
  }

  async function signInWithMagicLink(email: string) {
    const sendResponse = await postMagicLink(email, LOGIN_CALLBACK_URL, LOGIN_ERROR_CALLBACK_URL);
    assert.equal(sendResponse.statusCode, 200, sendResponse.body);
    assert.ok(lastSend?.url);

    const parsed = new URL(lastSend.url);
    const forwardedFor = clientIpForEmail(email);
    const verifyResponse = await app.inject({
      headers: {
        origin: WEBAPP_URL,
        "x-forwarded-for": forwardedFor,
      },
      method: "GET",
      remoteAddress: forwardedFor,
      url: `${parsed.pathname}${parsed.search}`,
    });
    assert.equal(verifyResponse.statusCode, 302, verifyResponse.body);

    const user = await prisma.user.findUnique({ where: { email } });
    assert.ok(user);
    createdUserIds.push(user.id);

    return {
      cookie: cookieHeaderFromSetCookie(verifyResponse.headers["set-cookie"]),
      user,
    };
  }

  it("accepts a settings reconfirm callbackURL on magic-link send", async () => {
    const email = `step-up-reconfirm-cb-${generateId()}@example.test`;
    const sendResponse = await postMagicLink(email, RECONFIRM_CALLBACK_URL, RECONFIRM_CALLBACK_URL);
    assert.equal(sendResponse.statusCode, 200, sendResponse.body);
    assert.ok(lastSend?.url);
    assert.match(lastSend.url, /callbackURL=/);
    assert.doesNotMatch(decodeURIComponent(lastSend.url), /\/auth\/start/);
  });

  it("accepts a confirm-page reconfirm callbackURL on magic-link send", async () => {
    const email = `step-up-confirm-cb-${generateId()}@example.test`;
    const sendResponse = await postMagicLink(
      email,
      RECONFIRM_CONFIRM_CALLBACK_URL,
      RECONFIRM_CONFIRM_CALLBACK_URL,
    );
    assert.equal(sendResponse.statusCode, 200, sendResponse.body);
    assert.ok(lastSend?.url);
    assert.match(lastSend.url, /callbackURL=/);
    assert.match(decodeURIComponent(lastSend.url), /\/confirm\?action=delete_account/);
    assert.doesNotMatch(decodeURIComponent(lastSend.url), /\/auth\/start/);
    assert.doesNotMatch(decodeURIComponent(lastSend.url), /\/login/);
  });

  it("accepts a confirm-page has_returned callbackURL on magic-link send", async () => {
    const email = `step-up-confirm-resume-cb-${generateId()}@example.test`;
    const sendResponse = await postMagicLink(
      email,
      RECONFIRM_CONFIRM_RESUME_CALLBACK_URL,
      RECONFIRM_CONFIRM_RESUME_CALLBACK_URL,
    );
    assert.equal(sendResponse.statusCode, 200, sendResponse.body);
    assert.ok(lastSend?.url);
    assert.match(lastSend.url, /callbackURL=/);
    assert.match(
      decodeURIComponent(lastSend.url),
      /\/confirm\?action=delete_account&has_returned=1/,
    );
    assert.doesNotMatch(decodeURIComponent(lastSend.url), /\/auth\/start/);
  });

  it("mints a token for a fresh session cookie", async () => {
    const email = `step-up-fresh-${generateId()}@example.test`;
    const { cookie, user } = await signInWithMagicLink(email);
    assert.ok(cookie.includes("session_token"));

    const response = await app.inject({
      headers: {
        cookie,
        origin: WEBAPP_URL,
      },
      method: "POST",
      url: "/me/step-up",
    });
    assert.equal(response.statusCode, 201, response.body);
    const body = JSON.parse(response.body) as { token?: string };
    assert.equal(typeof body.token, "string");
    assert.ok(body.token && body.token.length > 16);
    assert.equal("data" in body, false, user.id);
  });

  it("rejects a stale session cookie", async () => {
    const email = `step-up-stale-${generateId()}@example.test`;
    const { cookie, user } = await signInWithMagicLink(email);

    const session = await prisma.session.findFirst({
      orderBy: { createdAt: "desc" },
      where: { userId: user.id },
    });
    assert.ok(session);

    await prisma.session.update({
      data: {
        createdAt: new Date(Date.now() - (SESSION_FRESH_AGE_SECONDS + 60) * 1000),
      },
      where: { id: session.id },
    });
    await requireRedisCommands().del(`${BETTER_AUTH_REDIS_KEY_PREFIX}${session.token}`);

    const response = await app.inject({
      headers: {
        cookie,
        origin: WEBAPP_URL,
      },
      method: "POST",
      url: "/me/step-up",
    });
    assert.equal(response.statusCode, 403, response.body);
    const body = JSON.parse(response.body) as { error?: { code?: string } };
    assert.equal(body.error?.code, "session_not_fresh");
  });

  it("rejects JWT-only callers", async () => {
    const response = await app.inject({
      headers: {
        authorization: "Bearer aaa.bbb.ccc",
        origin: WEBAPP_URL,
      },
      method: "POST",
      url: "/me/step-up",
    });
    assert.equal(response.statusCode, 401, response.body);
    const body = JSON.parse(response.body) as { error?: { code?: string } };
    assert.equal(body.error?.code, "auth_required");
  });

  it("consumes a minted step-up token once", async () => {
    const userId = generateId();
    const token = await mintStepUpToken(userId);
    await consumeStepUpToken(userId, token);
    await assert.rejects(
      () => consumeStepUpToken(userId, token),
      (error: unknown) =>
        error instanceof DomainError &&
        error.code === "session_not_fresh" &&
        error.statusCode === 403,
    );
  });

  it("requires the step-up header on DELETE /me", async () => {
    const { id: userId } = await createTestUser();
    createdUserIds.push(userId);
    const bearer = await createNativeSession(userId);

    const missing = await app.inject({
      headers: {
        authorization: `Bearer ${bearer}`,
      },
      method: "DELETE",
      url: "/me",
    });
    assert.equal(missing.statusCode, 403, missing.body);
    assert.equal(
      (JSON.parse(missing.body) as { error?: { code?: string } }).error?.code,
      "session_not_fresh",
    );

    const email = `step-up-delete-${generateId()}@example.test`;
    const { cookie, user } = await signInWithMagicLink(email);
    const deleteBearer = await createNativeSession(user.id);

    const mint = await app.inject({
      headers: {
        cookie,
        origin: WEBAPP_URL,
      },
      method: "POST",
      url: "/me/step-up",
    });
    assert.equal(mint.statusCode, 201, mint.body);
    const token = (JSON.parse(mint.body) as { token: string }).token;

    const firstDelete = await app.inject({
      headers: {
        authorization: `Bearer ${deleteBearer}`,
        [BONDERY_STEP_UP_HEADER]: token,
      },
      method: "DELETE",
      url: "/me",
    });
    assert.equal(firstDelete.statusCode, 200, firstDelete.body);

    const replay = await app.inject({
      headers: {
        authorization: `Bearer ${deleteBearer}`,
        [BONDERY_STEP_UP_HEADER]: token,
      },
      method: "DELETE",
      url: "/me",
    });
    assert.ok(replay.statusCode === 403 || replay.statusCode === 401, replay.body);
    if (replay.statusCode === 403) {
      assert.equal(
        (JSON.parse(replay.body) as { error?: { code?: string } }).error?.code,
        "session_not_fresh",
      );
    }
  });

  it("requires the step-up header on API key create and revoke", async () => {
    const { id: userId } = await createTestUser();
    createdUserIds.push(userId);
    const bearer = await createNativeSession(userId);
    const missingId = generateId();

    const missingCreate = await app.inject({
      headers: {
        authorization: `Bearer ${bearer}`,
        "content-type": "application/json",
      },
      method: "POST",
      payload: { label: "Step-up key", permission: "read" },
      url: "/me/api-keys",
    });
    assert.equal(missingCreate.statusCode, 403, missingCreate.body);
    assert.equal(
      (JSON.parse(missingCreate.body) as { error?: { code?: string } }).error?.code,
      "session_not_fresh",
    );

    const missingDelete = await app.inject({
      headers: {
        authorization: `Bearer ${bearer}`,
      },
      method: "DELETE",
      url: `/me/api-keys/${missingId}`,
    });
    assert.equal(missingDelete.statusCode, 403, missingDelete.body);
    assert.equal(
      (JSON.parse(missingDelete.body) as { error?: { code?: string } }).error?.code,
      "session_not_fresh",
    );

    const email = `step-up-apikey-${generateId()}@example.test`;
    const { cookie, user } = await signInWithMagicLink(email);
    const sessionBearer = await createNativeSession(user.id);

    const mint = await app.inject({
      headers: {
        cookie,
        origin: WEBAPP_URL,
      },
      method: "POST",
      url: "/me/step-up",
    });
    assert.equal(mint.statusCode, 201, mint.body);
    const token = (JSON.parse(mint.body) as { token: string }).token;

    const created = await app.inject({
      headers: {
        authorization: `Bearer ${sessionBearer}`,
        "content-type": "application/json",
        [BONDERY_STEP_UP_HEADER]: token,
      },
      method: "POST",
      payload: { label: "Step-up key", permission: "read" },
      url: "/me/api-keys",
    });
    assert.equal(created.statusCode, 201, created.body);
    const createdBody = JSON.parse(created.body) as { id?: string; secret?: string };
    assert.equal(typeof createdBody.id, "string");
    assert.equal(typeof createdBody.secret, "string");
  });

  it("requires the step-up header on MCP consent revoke", async () => {
    const { id: userId } = await createTestUser();
    createdUserIds.push(userId);
    const bearer = await createNativeSession(userId);

    const missing = await app.inject({
      headers: {
        authorization: `Bearer ${bearer}`,
      },
      method: "DELETE",
      url: `/me/mcp-consents/${generateId()}`,
    });
    assert.equal(missing.statusCode, 403, missing.body);
    assert.equal(
      (JSON.parse(missing.body) as { error?: { code?: string } }).error?.code,
      "session_not_fresh",
    );
  });
});
