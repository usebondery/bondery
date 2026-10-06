/**
 * Process-scoped Nodemailer transporter for the API server.
 *
 * One pooled transport per process — each createTransport() is a separate pool.
 * Eager verify via initEmailTransport() on Fastify onReady (before jobs).
 * Close via shutdownEmailTransporter() on Fastify onClose (after stopJobs).
 */

import type { FastifyBaseLogger } from "fastify";
import type { Transporter } from "nodemailer";
import nodemailer from "nodemailer";
import {
  assertRuntimeDependencyConfigured,
  shouldSkipLiveRuntimeVerify,
} from "../platform/runtime-env.js";

export type EmailConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromAddress: string;
  replyToAddress: string;
};

export type RenderedEmailOptions = {
  from: string;
  to: string;
  subject: string;
  html: string;
  /** Plaintext sibling of `html` (`multipart/alternative`). */
  text: string;
  cc?: string;
  replyTo?: string;
};

export type EmailReadiness = {
  configured: boolean;
  error?: string;
  latencyMs?: number;
  ok: boolean;
  verifiedAt: string;
};

const EMAIL_POOL_MAX_CONNECTIONS = 3;
const EMAIL_POOL_MAX_MESSAGES = 100;
const EMAIL_VERIFY_TIMEOUT_MS = 5_000;
/** Reuse boot-time SMTP verify for readiness probes (matches /health/ready cache TTL). */
const EMAIL_READINESS_REUSE_MS = 60_000;

const UNCONFIGURED_READINESS: EmailReadiness = {
  configured: false,
  ok: true,
  verifiedAt: new Date(0).toISOString(),
};

let configuredEmailConfig: EmailConfig | null = null;
let transporter: Transporter | null = null;
let emailReadiness: EmailReadiness | null = null;

export function classifySmtpError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const code = "code" in error ? String(error.code).toLowerCase() : "";

    if (error.name === "AbortError" || code === "etimedout" || message.includes("timeout")) {
      return "timeout";
    }
    if (
      code === "eauth" ||
      message.includes("invalid login") ||
      message.includes("authentication") ||
      message.includes("auth")
    ) {
      return "auth_failed";
    }
    if (
      message.includes("certificate") ||
      message.includes("tls") ||
      message.includes("ssl") ||
      code === "ecert"
    ) {
      return "tls_error";
    }
    if (
      code === "econnrefused" ||
      code === "enotfound" ||
      code === "ehostunreach" ||
      message.includes("connect")
    ) {
      return "unreachable";
    }

    return error.message;
  }

  return "unknown";
}

async function verifyTransporterWithTimeout(
  current: Transporter,
  timeoutMs: number,
): Promise<void> {
  let timer: NodeJS.Timeout | undefined;

  const verifyPromise = current.verify();
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error("SMTP verify timed out");
      error.name = "AbortError";
      reject(error);
    }, timeoutMs);
  });

  try {
    await Promise.race([verifyPromise, timeoutPromise]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

function setUnconfiguredReadiness(): EmailReadiness {
  emailReadiness = { ...UNCONFIGURED_READINESS, verifiedAt: new Date().toISOString() };
  return emailReadiness;
}

function setMissingEmailReadiness(): EmailReadiness {
  emailReadiness = {
    configured: false,
    error: "not_configured",
    ok: false,
    verifiedAt: new Date().toISOString(),
  };
  return emailReadiness;
}

function assertEmailConfigured(): void {
  assertRuntimeDependencyConfigured(isEmailConfigured(), "BONDERY_PRIVATE_EMAIL_* must be set");
}

async function runEmailVerify(): Promise<EmailReadiness> {
  if (!isEmailConfigured()) {
    return setUnconfiguredReadiness();
  }

  const started = Date.now();
  try {
    await verifyTransporterWithTimeout(getEmailTransporter(), EMAIL_VERIFY_TIMEOUT_MS);
    emailReadiness = {
      configured: true,
      latencyMs: Date.now() - started,
      ok: true,
      verifiedAt: new Date().toISOString(),
    };
    return emailReadiness;
  } catch (error) {
    emailReadiness = {
      configured: true,
      error: classifySmtpError(error),
      latencyMs: Date.now() - started,
      ok: false,
      verifiedAt: new Date().toISOString(),
    };
    return emailReadiness;
  }
}

function isLoopbackSmtpHost(host: string): boolean {
  return host === "127.0.0.1" || host === "localhost";
}

function isProductionEnvironment(): boolean {
  return process.env.NODE_ENV === "production";
}

function assertDevelopmentSmtpIsLoopback(config: EmailConfig): void {
  if (shouldSkipLiveRuntimeVerify() || isProductionEnvironment()) {
    return;
  }

  if (isLoopbackSmtpHost(config.host)) {
    return;
  }

  throw new Error(
    "Development SMTP must be Mailpit on loopback. Start Mailpit (`pnpm run start:mailpit`) and set BONDERY_PRIVATE_EMAIL_HOST=127.0.0.1.",
  );
}

export function emailTransportOptions(config: EmailConfig) {
  const secure = config.port === 465;
  const useInsecureLoopback = isLoopbackSmtpHost(config.host) && !isProductionEnvironment();

  if (useInsecureLoopback) {
    return {
      auth: {
        pass: config.pass,
        user: config.user,
      },
      host: config.host,
      ignoreTLS: true,
      maxConnections: EMAIL_POOL_MAX_CONNECTIONS,
      maxMessages: EMAIL_POOL_MAX_MESSAGES,
      pool: true,
      port: config.port,
      requireTLS: false,
      secure: false,
      tls: {
        rejectUnauthorized: true,
      },
    };
  }

  return {
    auth: {
      pass: config.pass,
      user: config.user,
    },
    host: config.host,
    ignoreTLS: false,
    maxConnections: EMAIL_POOL_MAX_CONNECTIONS,
    maxMessages: EMAIL_POOL_MAX_MESSAGES,
    pool: true,
    port: config.port,
    requireTLS: !secure,
    secure,
    tls: {
      rejectUnauthorized: true,
    },
  };
}

/** @internal Prefer getEmailTransporter() in production; exposed for unit tests. */
export function createEmailTransporter(config: EmailConfig): Transporter {
  return nodemailer.createTransport(emailTransportOptions(config));
}

export function emailConfigFromEnv(env: {
  BONDERY_PRIVATE_EMAIL_HOST: string;
  BONDERY_PRIVATE_EMAIL_PORT: string;
  BONDERY_PRIVATE_EMAIL_USER: string;
  BONDERY_PRIVATE_EMAIL_PASS: string;
  BONDERY_PRIVATE_EMAIL_ADDRESS: string;
  BONDERY_PRIVATE_EMAIL_REPLY_TO: string;
}): EmailConfig {
  return {
    fromAddress: env.BONDERY_PRIVATE_EMAIL_ADDRESS,
    host: env.BONDERY_PRIVATE_EMAIL_HOST,
    pass: env.BONDERY_PRIVATE_EMAIL_PASS,
    port: Number(env.BONDERY_PRIVATE_EMAIL_PORT),
    replyToAddress: env.BONDERY_PRIVATE_EMAIL_REPLY_TO,
    user: env.BONDERY_PRIVATE_EMAIL_USER,
  };
}

export function emailConfigFromNodeEnv(env: NodeJS.ProcessEnv = process.env): EmailConfig | null {
  const host = env.BONDERY_PRIVATE_EMAIL_HOST;
  const user = env.BONDERY_PRIVATE_EMAIL_USER;
  const pass = env.BONDERY_PRIVATE_EMAIL_PASS;
  const fromAddress = env.BONDERY_PRIVATE_EMAIL_ADDRESS;
  const replyToAddress = env.BONDERY_PRIVATE_EMAIL_REPLY_TO;
  if (!host || !user || !pass || !fromAddress || !replyToAddress) {
    return null;
  }
  return {
    fromAddress,
    host,
    pass,
    port: Number(env.BONDERY_PRIVATE_EMAIL_PORT ?? 587),
    replyToAddress,
    user,
  };
}

export function emailConfigFromProcessEnv(): EmailConfig | null {
  return emailConfigFromNodeEnv(process.env);
}

function ensureEmailConfig(): EmailConfig {
  assertEmailConfigured();
  const config = emailConfigFromProcessEnv();
  if (!config) {
    throw new Error("BONDERY_PRIVATE_EMAIL_* must be set before sending email");
  }

  if (configuredEmailConfig && JSON.stringify(configuredEmailConfig) !== JSON.stringify(config)) {
    throw new Error(
      "BONDERY_PRIVATE_EMAIL_* changed after transporter was created; restart the process",
    );
  }

  configuredEmailConfig = config;
  return config;
}

export function isEmailConfigured(): boolean {
  return emailConfigFromProcessEnv() !== null;
}

/** Cached SMTP config after first transporter init; null when env is incomplete. */
export function getEmailConfig(): EmailConfig | null {
  if (configuredEmailConfig) {
    return configuredEmailConfig;
  }
  return emailConfigFromProcessEnv();
}

/** SMTP config when env is complete; throws if email is not configured. */
export function requireEmailConfig(): EmailConfig {
  return ensureEmailConfig();
}

export function getEmailTransporter(): Transporter {
  if (transporter) {
    return transporter;
  }

  const config = ensureEmailConfig();
  transporter = createEmailTransporter(config);
  return transporter;
}

export function getEmailTransportReadiness(): EmailReadiness {
  return emailReadiness ?? UNCONFIGURED_READINESS;
}

/**
 * Eager SMTP verify on startup. Required in development and production; skipped in test.
 * Throws when configured and verify fails.
 */
export async function initEmailTransport(log?: FastifyBaseLogger): Promise<EmailReadiness> {
  if (!isEmailConfigured()) {
    assertRuntimeDependencyConfigured(false, "BONDERY_PRIVATE_EMAIL_* must be set");
    log?.info("SMTP not configured — skipping transport verify in test");
    return setUnconfiguredReadiness();
  }

  if (shouldSkipLiveRuntimeVerify()) {
    log?.info("SMTP verify skipped in test environment");
    emailReadiness = {
      configured: true,
      ok: true,
      verifiedAt: new Date().toISOString(),
    };
    return emailReadiness;
  }

  const config = getEmailConfig();
  if (config) {
    assertDevelopmentSmtpIsLoopback(config);
  }

  const fromAddress = config?.fromAddress;
  if (
    fromAddress?.toLowerCase().endsWith("@example.com") &&
    !(config && isLoopbackSmtpHost(config.host))
  ) {
    log?.error(
      "BONDERY_PRIVATE_EMAIL_ADDRESS is a placeholder (@example.com); SMTP will reject MAIL FROM. Set it to the SMTP mailbox in Infisical and run pnpm run env:pull.",
    );
  }

  const readiness = await runEmailVerify();
  if (readiness.ok) {
    log?.info({ latencyMs: readiness.latencyMs }, "SMTP transport verified");
  } else {
    log?.error({ error: readiness.error, latencyMs: readiness.latencyMs }, "SMTP verify failed");
    throw new Error(`SMTP verify failed: ${readiness.error ?? "unknown"}`);
  }

  return readiness;
}

function isEmailReadinessFresh(readiness: EmailReadiness): boolean {
  if (!readiness.ok) {
    return false;
  }

  const ageMs = Date.now() - Date.parse(readiness.verifiedAt);
  return ageMs >= 0 && ageMs < EMAIL_READINESS_REUSE_MS;
}

/** Re-verify the shared pool (used by /health/ready when cache is cold). */
export async function verifyEmailTransport(): Promise<EmailReadiness> {
  if (!isEmailConfigured()) {
    if (shouldSkipLiveRuntimeVerify()) {
      return setUnconfiguredReadiness();
    }

    return setMissingEmailReadiness();
  }

  if (shouldSkipLiveRuntimeVerify()) {
    emailReadiness = {
      configured: true,
      ok: true,
      verifiedAt: new Date().toISOString(),
    };
    return emailReadiness;
  }

  if (transporter && emailReadiness && isEmailReadinessFresh(emailReadiness)) {
    return emailReadiness;
  }

  return runEmailVerify();
}

type SendRenderedEmailFn = (
  options: RenderedEmailOptions,
  log?: FastifyBaseLogger,
) => Promise<void>;

let sendRenderedEmailTestOverride: SendRenderedEmailFn | null = null;

export async function sendRenderedEmail(
  options: RenderedEmailOptions,
  log?: FastifyBaseLogger,
): Promise<void> {
  if (sendRenderedEmailTestOverride) {
    return sendRenderedEmailTestOverride(options, log);
  }

  try {
    await getEmailTransporter().sendMail(options);
  } catch (error) {
    log?.error({ err: error }, "Failed to send email");
    throw error;
  }
}

export async function shutdownEmailTransporter(): Promise<void> {
  const current = transporter;
  transporter = null;
  configuredEmailConfig = null;
  emailReadiness = null;

  if (!current) {
    return;
  }

  try {
    current.close();
  } catch {
    // Already closed — idempotent shutdown
  }
}

/** @internal Test-only reset without open connections. */
export function resetEmailTransporterForTests(): void {
  transporter = null;
  configuredEmailConfig = null;
  emailReadiness = null;
  sendRenderedEmailTestOverride = null;
}

/** @internal Test-only override for sendRenderedEmail. */
export function setSendRenderedEmailOverrideForTests(override: SendRenderedEmailFn | null): void {
  sendRenderedEmailTestOverride = override;
}

/** @internal Test-only reset for readiness state. */
export function resetEmailReadinessForTests(): void {
  resetEmailTransporterForTests();
}
