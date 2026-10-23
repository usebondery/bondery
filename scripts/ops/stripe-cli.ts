/**
 * Shared Stripe CLI helpers for local billing DX (`setup:stripe`, `dev:stripe`).
 */

import { spawn, spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { API_ROUTES } from "../../packages/helpers/src/globals/paths.ts";
import { DEV_URLS } from "../../packages/schemas/src/constants/dev-ports.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const STRIPE_CLI_INSTALL_URL = "https://docs.stripe.com/stripe-cli";

export const STRIPE_LISTEN_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
  "customer.subscription.trial_will_end",
] as const;

const WEBHOOK_SECRET_RE = /\bwhsec_[A-Za-z0-9_]+/;

type StripeCommand = {
  command: string;
  prefixArgs: string[];
};

function resolveStripeCommand(): StripeCommand {
  if (process.platform !== "win32") {
    return { command: "stripe", prefixArgs: [] };
  }

  // pnpm's Windows shim is extensionless (`.../bin/stripe`); spawn without a shell
  // is ENOENT, and `stripe.cmd` is EINVAL. `cmd /c stripe` uses PATHEXT like a terminal.
  return { command: "cmd.exe", prefixArgs: ["/d", "/s", "/c", "stripe"] };
}

/** Stripe CLI `--forward-to` target. Uses Portless HTTPS when the API runs via `pnpm run dev`. */
export function stripeListenForwardUrl(): string {
  return `${DEV_URLS.api}${API_ROUTES.WEBHOOKS_STRIPE}`;
}

export function repoRootFromScripts(): string {
  return resolve(__dirname, "../..");
}

export function commandExists(name: string): boolean {
  const result =
    process.platform === "win32"
      ? spawnSync("where.exe", [name], { encoding: "utf-8" })
      : spawnSync("which", [name], { encoding: "utf-8" });
  return result.status === 0;
}

function combinedOutput(result: { stderr?: string | null; stdout?: string | null }): string {
  return [result.stdout, result.stderr].filter(Boolean).join("\n");
}

function stripeArgv(args: string[]): { args: string[]; command: string } {
  const { command, prefixArgs } = resolveStripeCommand();
  return { args: [...prefixArgs, ...args], command };
}

function runStripe(args: string[], options?: { cwd?: string }): ReturnType<typeof spawnSync> {
  const resolved = stripeArgv(args);
  return spawnSync(resolved.command, resolved.args, {
    cwd: options?.cwd ?? repoRootFromScripts(),
    encoding: "utf-8",
  });
}

export function mentionsStripeLogin(output: string): boolean {
  return /stripe login/i.test(output);
}

export type StripeCliProbe =
  | { status: "ok" }
  | { status: "missing" }
  | { status: "logged-out" }
  | { status: "error"; message: string };

export function probeStripeCli(): StripeCliProbe {
  if (!commandExists("stripe")) {
    return { status: "missing" };
  }

  const result = runStripe(["whoami"]);
  if (result.error) {
    return { message: result.error.message, status: "error" };
  }

  const output = combinedOutput(result);
  if (result.status !== 0 || mentionsStripeLogin(output) || !/Account:/i.test(output)) {
    return { status: "logged-out" };
  }

  return { status: "ok" };
}

export function stripeCliFailure(probe: StripeCliProbe): { error: string; hint: string } | null {
  if (probe.status === "ok") {
    return null;
  }
  if (probe.status === "missing") {
    return { error: "Stripe CLI not found on PATH", hint: `Install: ${STRIPE_CLI_INSTALL_URL}` };
  }
  if (probe.status === "error") {
    return {
      error: `Failed to run Stripe CLI: ${probe.message}`,
      hint: `Install: ${STRIPE_CLI_INSTALL_URL}`,
    };
  }
  return { error: "Stripe CLI is not logged in", hint: "Run: stripe login" };
}

export function parseStripeListenSecret(output: string): string | undefined {
  return output.match(WEBHOOK_SECRET_RE)?.[0];
}

export function printStripeListenSecret():
  | { ok: false; error: string }
  | { ok: true; secret: string } {
  const result = runStripe(["listen", "--print-secret"]);
  if (result.error) {
    return { error: result.error.message, ok: false };
  }
  const output = combinedOutput(result);
  if (mentionsStripeLogin(output) || result.status !== 0) {
    return {
      error: output.trim() || "stripe listen --print-secret failed",
      ok: false,
    };
  }

  const secret = parseStripeListenSecret(output);
  if (!secret) {
    return {
      error: "stripe listen --print-secret did not print a whsec_ value",
      ok: false,
    };
  }

  return { ok: true, secret };
}

export function isStripeWebhookSecretPlaceholder(
  value: string | undefined,
  exampleValue: string,
): boolean {
  if (!value) {
    return true;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed === exampleValue) {
    return true;
  }
  return trimmed.includes("<") && trimmed.includes(">");
}

export type WebhookSecretUpsertDecision = "match" | "skip" | "upsert";

export function decideWebhookSecretUpsert(input: {
  current: string | undefined;
  exampleValue: string;
  force: boolean;
  next: string;
}): WebhookSecretUpsertDecision {
  if (input.force || isStripeWebhookSecretPlaceholder(input.current, input.exampleValue)) {
    return "upsert";
  }
  if (input.current === input.next) {
    return "match";
  }
  return "skip";
}

export function spawnStripeListen(): void {
  const forwardTo = stripeListenForwardUrl();
  const resolved = stripeArgv([
    "listen",
    "--events",
    STRIPE_LISTEN_EVENTS.join(","),
    "--forward-to",
    forwardTo,
  ]);
  const child = spawn(resolved.command, resolved.args, {
    cwd: repoRootFromScripts(),
    stdio: "inherit",
  });

  child.on("error", (error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });
}
