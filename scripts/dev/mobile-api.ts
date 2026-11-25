/**
 * Publish the local API to your tailnet for the mobile app (docs/contributing/local-setup.mdx).
 *
 * The API serves HTTPS only, on 127.0.0.1:26631, with a certificate from the private dev API CA.
 * A phone or an emulator can neither resolve the Portless name (api.usebondery.test) nor trust
 * that CA. `tailscale serve` gives the API a name with a public certificate on your tailnet,
 * https://<machine>.<tailnet>.ts.net:26631, and forwards to the API over loopback. It does not
 * check the API's certificate on that hop, which never leaves this machine.
 *
 * The URL goes into BONDERY_DEV_MOBILE_API_URL in .env.local; `pnpm run env` gives it to the
 * mobile app. The rest of the stack keeps https://api.usebondery.test.
 *
 * Usage:
 *   pnpm run dev:mobile-api          # publish and store the URL
 *   pnpm run dev:mobile-api -- --off # stop publishing and clear the URL
 *
 * Needs Tailscale signed in on this machine and the phone, with MagicDNS and HTTPS certificates
 * turned on for the tailnet (admin console, DNS page).
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createCliLogger } from "@bondery/helpers/cli";
import { DEV_PORTS } from "@bondery/schemas/constants/dev-ports";

import { upsertEnvAssignments } from "../env/env-upsert.js";

const PATTERN_5C2E24_RE = /\.$/u;

const log = createCliLogger("dev:mobile-api");
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const rootEnv = join(repoRoot, ".env.local");

/** The tailnet port mirrors the API port, so the URL is easy to recognise. */
const TAILNET_PORT = DEV_PORTS.API;
const UPSTREAM = `https+insecure://127.0.0.1:${DEV_PORTS.API}`;

type TailscaleStatus = {
  BackendState?: string;
  CertDomains?: string[] | null;
  Self?: { DNSName?: string };
};

function tailscale(args: string[]) {
  const result = spawnSync("tailscale", args, { encoding: "utf8" });
  if (result.error) {
    throw new Error(
      "Tailscale CLI not found. Install Tailscale (https://tailscale.com/download) and sign in.",
    );
  }
  return result;
}

/** The machine's MagicDNS name, when Tailscale runs and can issue HTTPS certificates for it. */
function tailnetHostname(): string {
  const result = tailscale(["status", "--json"]);
  let status: TailscaleStatus;
  try {
    status = JSON.parse(result.stdout) as TailscaleStatus;
  } catch {
    throw new Error(`tailscale status failed: ${result.stderr.trim() || result.stdout.trim()}`);
  }
  if (status.BackendState !== "Running") {
    throw new Error(
      `Tailscale is not connected (${status.BackendState ?? "unknown"}). Run: tailscale up`,
    );
  }
  const hostname = status.Self?.DNSName?.replace(PATTERN_5C2E24_RE, "");
  if (!hostname) {
    throw new Error("This machine has no MagicDNS name. Turn on MagicDNS for the tailnet.");
  }
  if (!status.CertDomains?.includes(hostname)) {
    throw new Error(
      "The tailnet cannot issue HTTPS certificates. Turn on HTTPS Certificates on the DNS page of the Tailscale admin console.",
    );
  }
  return hostname;
}

function publish() {
  const hostname = tailnetHostname();
  const result = tailscale(["serve", "--bg", "--yes", `--https=${TAILNET_PORT}`, UPSTREAM]);
  if (result.status !== 0) {
    throw new Error(`tailscale serve failed: ${result.stderr.trim() || result.stdout.trim()}`);
  }
  const url = `https://${hostname}:${TAILNET_PORT}`;
  upsertEnvAssignments(rootEnv, { BONDERY_DEV_MOBILE_API_URL: url });
  log.success(`The API is on your tailnet at ${url}`);
  log.info("Next: pnpm run env, then start the app (pnpm run dev:mobile).");
  log.info("The phone must be signed in to the same tailnet.");
}

function unpublish() {
  const result = tailscale(["serve", `--https=${TAILNET_PORT}`, "off"]);
  if (result.status !== 0) {
    log.warn(`tailscale serve off: ${result.stderr.trim() || result.stdout.trim()}`);
  }
  upsertEnvAssignments(rootEnv, { BONDERY_DEV_MOBILE_API_URL: "" });
  log.success("The API is no longer on your tailnet. Run pnpm run env.");
}

function main() {
  if (!existsSync(rootEnv)) {
    log.error("Missing .env.local. Run: pnpm run setup:dev");
    process.exitCode = 1;
    return;
  }
  try {
    if (process.argv.includes("--off")) {
      unpublish();
    } else {
      publish();
    }
  } catch (error) {
    log.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

main();
