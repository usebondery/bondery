/**
 * The MagicDNS name the laptop uses to reach this PC's dev stack.
 *
 * A remote Orca session renders its browser pane on the laptop, so the laptop needs
 * this name. Portless binds `127.0.0.1:443` on the PC, which the laptop cannot reach
 * by loopback. The two ways to bridge that are an SSH tunnel or this name. This module
 * supplies the name, and callers decide.
 *
 * Resolution order, first non-empty wins:
 *
 * 1. `BONDERY_DEV_MOBILE_API_URL` — `pnpm run dev:mobile-api` stores the API Tailscale
 *    name here, and `.env.local` already carries it for phone testing.
 * 2. `tailscale status --json` on this machine.
 *
 * `BONDERY_DEV_TAILSCALE_HOST` overrides both. Set it when neither source has the name.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Trailing dot on a Tailscale `DNSName`. */
const TRAILING_DOT_RE = /\.$/u;
/** A Tailscale MagicDNS suffix. Requires a tailnet label before `.ts.net`. */
const TAILSCALE_MAGICDNS_RE = /^(?<group1>[a-z0-9][a-z0-9-]*)\.(?<group2>[a-z0-9-]+)\.ts\.net$/iu;
/** A URL scheme prefix. A bare host has none, so the parser needs one added. */
const URL_SCHEME_RE = /^[a-z][a-z\d+.-]*:\/\//iu;

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * Read one assignment from a dotenv file without loading it into `process.env`.
 *
 * @param {string} path
 * @param {string} key
 * @returns {string | undefined}
 */
function readEnvAssignment(path, key) {
  if (!existsSync(path)) {
    return;
  }
  const pattern = new RegExp(`^${key}=(.*)$`, "mu");
  const match = readFileSync(path, "utf-8").match(pattern);
  if (!match) {
    return;
  }
  const raw = match[1].trim();
  const quoted =
    (raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"));
  return (quoted ? raw.slice(1, -1) : raw).trim() || undefined;
}

/**
 * Strip a port, scheme, and path from a URL or bare host, then keep only a MagicDNS name.
 *
 * @param {string | undefined} value
 * @returns {string | undefined}
 */
function toMagicDnsName(value) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) {
    return;
  }
  // A bare `host.tailnet.ts.net:26631` is not a URL, so strip the port before parsing.
  const withScheme = URL_SCHEME_RE.test(trimmed) ? trimmed : `https://${trimmed}`;
  let hostname;
  try {
    ({ hostname } = new URL(withScheme));
  } catch {
    return;
  }
  const withoutDot = hostname.replace(TRAILING_DOT_RE, "").toLowerCase();
  return TAILSCALE_MAGICDNS_RE.test(withoutDot) ? withoutDot : undefined;
}

/**
 * The MagicDNS name from `.env.local`, written by `pnpm run dev:mobile-api`.
 *
 * @returns {string | undefined}
 */
function hostFromEnvFile() {
  const value = readEnvAssignment(join(repoRoot, ".env.local"), "BONDERY_DEV_MOBILE_API_URL");
  return toMagicDnsName(value);
}

/**
 * The MagicDNS name from `tailscale status --json` on this machine.
 *
 * @returns {string | undefined}
 */
function hostFromTailscaleCli() {
  const result = spawnSync("tailscale", ["status", "--json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  if (result.status !== 0 || !result.stdout) {
    return;
  }
  let status;
  try {
    status = JSON.parse(result.stdout);
  } catch {
    return;
  }
  return toMagicDnsName(status?.Self?.DNSName);
}

/**
 * Resolve the PC's device URL for the laptop, with the source that supplied it.
 *
 * @returns {{ url: string, source: string } | undefined}
 */
export function resolveTailscaleDeviceUrl() {
  const override = toMagicDnsName(process.env.BONDERY_DEV_TAILSCALE_HOST);
  if (override) {
    return { source: "BONDERY_DEV_TAILSCALE_HOST", url: `https://${override}` };
  }

  const fromEnv = hostFromEnvFile();
  if (fromEnv) {
    return { source: ".env.local BONDERY_DEV_MOBILE_API_URL", url: `https://${fromEnv}` };
  }

  const fromCli = hostFromTailscaleCli();
  return fromCli ? { source: "tailscale status", url: `https://${fromCli}` } : undefined;
}

/**
 * The instruction to print when no Tailscale name is available.
 *
 * @param {string[]} hostnames
 * @returns {string}
 */
export function missingTailscaleHostMessage(hostnames) {
  const lines = [
    "Could not find this PC's Tailscale name. The laptop needs it to reach the dev stack.",
    "",
    "Pick one, then run this again:",
    "",
    "  1. Start Tailscale on this PC, then check that MagicDNS is on:",
    "       tailscale status --json",
    "",
    "  2. Or publish the API to the tailnet once. It also stores the name for the phone:",
    "       pnpm run dev:mobile-api",
    "",
    "  3. Or set the name yourself in .env.local:",
    "       BONDERY_DEV_MOBILE_API_URL=https://<machine>.<tailnet>.ts.net:26631",
    "",
    "  4. Or pass it for this run only:",
    "       BONDERY_DEV_TAILSCALE_HOST=<machine>.<tailnet>.ts.net pnpm run dev:remote-laptop",
    "",
    "The name must be a Tailscale MagicDNS name that ends in .ts.net.",
    "",
    "Hosts the laptop will map to it:",
  ];
  for (const hostname of hostnames) {
    lines.push(`  ${hostname}`);
  }
  return lines.join("\n");
}

export { toMagicDnsName };
