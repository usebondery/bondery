/**
 * Laptop browser → WSL Portless over SSH.
 *
 * Portless binds `127.0.0.1:443` on the PC. The laptop maps the `.test`
 * hostnames to its own loopback and forwards local 443 into WSL.
 *
 * The SSH host comes from Tailscale MagicDNS, not a remembered IP.
 * On WSL, `resolve` is this node. On the laptop, `resolve` is the online
 * Linux peer (the WSL box).
 *
 * WSL (dev processes already running):
 *   pnpm run dev:remote-portless
 *
 * Laptop (elevated PowerShell, repo checkout):
 *   .\scripts\dev\connect-remote-portless.ps1
 */
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { pathToFileURL } from "node:url";

import { DEV_URLS } from "@bondery/schemas/constants/dev-ports";

const TLD = "test";

/**
 * Hostnames Portless serves on HTTPS. Keep in lockstep with `DEV_URLS`.
 *
 * @param {typeof DEV_URLS} urls
 * @returns {string[]}
 */
export function portlessHttpsHostnames(urls = DEV_URLS) {
  const names = new Set();
  for (const value of Object.values(urls)) {
    if (typeof value !== "string" || !value.startsWith("https://")) {
      continue;
    }
    const hostname = new URL(value).hostname;
    if (hostname.endsWith(`.${TLD}`)) {
      names.add(hostname);
    }
  }
  return [...names].sort();
}

function runQuiet(command, args) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    return "";
  }
  return (result.stdout ?? "").trim();
}

/**
 * @param {string | undefined} value
 * @returns {string}
 */
export function magicDnsName(value) {
  return (value ?? "").replace(/\.$/, "").trim();
}

/**
 * Unix SSH user from a Tailscale hostname (`sveetya-desktop-wsl` → `sveetya`).
 *
 * @param {string | undefined} hostName
 * @param {string | undefined} dnsName
 * @returns {string}
 */
export function inferSshUser(hostName, dnsName) {
  const source = (hostName || magicDnsName(dnsName).split(".")[0] || "").trim();
  const first = source.split(/[^A-Za-z0-9]+/)[0] ?? "";
  return first.toLowerCase();
}

/**
 * @param {{ DNSName?: string, HostName?: string, OS?: string, Online?: boolean }} node
 * @returns {boolean}
 */
function isOnlineLinux(node) {
  return Boolean(node?.Online) && (node.OS ?? "").toLowerCase() === "linux";
}

/**
 * @param {Array<{ DNSName?: string, HostName?: string }>} nodes
 * @returns {{ DNSName?: string, HostName?: string }}
 */
export function pickLinuxDevNode(nodes) {
  if (nodes.length === 1) {
    return nodes[0];
  }
  const wsl = nodes.filter((node) => {
    const name = `${node.HostName ?? ""} ${magicDnsName(node.DNSName)}`;
    return /wsl/i.test(name);
  });
  if (wsl.length === 1) {
    return wsl[0];
  }
  const names = nodes.map((node) => magicDnsName(node.DNSName) || node.HostName).join(", ");
  throw new Error(
    `Found ${nodes.length} online Linux Tailscale peers (${names}). Set BONDERY_DEV_SSH_TARGET.`,
  );
}

/**
 * @param {{
 *   Self?: { DNSName?: string, HostName?: string, OS?: string, Online?: boolean },
 *   Peer?: Record<string, { DNSName?: string, HostName?: string, OS?: string, Online?: boolean }>,
 * }} status
 * @param {string} [sshUserOverride]
 * @returns {string} `user@magic-dns-name`
 */
export function resolveRemoteSshTarget(status, sshUserOverride) {
  const self = status.Self;
  if (!self) {
    throw new Error("Tailscale status has no Self node. Is Tailscale running?");
  }

  const selfOs = (self.OS ?? "").toLowerCase();
  let node = { ...self, Online: true };
  if (selfOs !== "linux") {
    const peers = Object.values(status.Peer ?? {});
    const linuxOnline = peers.filter((peer) => isOnlineLinux(peer));
    if (linuxOnline.length === 0) {
      throw new Error("No online Linux Tailscale peer. Start WSL Tailscale on the PC.");
    }
    node = pickLinuxDevNode(linuxOnline);
  }

  const host = magicDnsName(node.DNSName);
  if (!host) {
    throw new Error("Tailscale node has no MagicDNS name. Enable MagicDNS on the tailnet.");
  }

  const user = (sshUserOverride ?? "").trim() || inferSshUser(node.HostName, host);
  if (!user) {
    throw new Error("Could not infer the SSH user. Set BONDERY_DEV_SSH_USER.");
  }

  return `${user}@${host}`;
}

function readTailscaleStatus() {
  const raw = runQuiet("tailscale", ["status", "--json"]);
  if (!raw) {
    throw new Error("Could not read `tailscale status --json`. Is Tailscale on PATH?");
  }
  return JSON.parse(raw);
}

function sshUserOverride() {
  // biome-ignore lint/suspicious/noUndeclaredEnvVars: laptop/PC operator override, not a turbo task input
  return process.env.BONDERY_DEV_SSH_USER;
}

function printShare() {
  const hostnames = portlessHttpsHostnames();
  const caPath = `${homedir()}/.portless/ca.pem`;
  let sshTarget = "<auto from Tailscale>";
  try {
    sshTarget = resolveRemoteSshTarget(readTailscaleStatus(), sshUserOverride());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
  }

  console.log("Dev processes stay on this PC. The laptop browser uses the .test names.");
  console.log("");
  console.log("On this PC:");
  console.log("  1. Start the stack (`pnpm run dev` or the apps you need).");
  console.log("  2. Portless must listen on 127.0.0.1:443.");
  console.log(`  3. CA file: ${caPath}`);
  console.log(`  4. SSH target: ${sshTarget}`);
  console.log("");
  console.log("On the laptop, elevated PowerShell from the repo:");
  console.log("  .\\scripts\\dev\\connect-remote-portless.ps1");
  console.log("");
  console.log("The laptop script resolves the PC through Tailscale MagicDNS.");
  console.log("Pass -SshTarget only to override.");
  console.log("");
  console.log("Hostnames:");
  for (const hostname of hostnames) {
    console.log(`  https://${hostname}/`);
  }
}

function printTarget() {
  const target = resolveRemoteSshTarget(readTailscaleStatus(), sshUserOverride());
  console.log(target);
}

function printHosts() {
  for (const hostname of portlessHttpsHostnames()) {
    console.log(hostname);
  }
}

function isMain() {
  const entry = process.argv[1];
  return Boolean(entry) && import.meta.url === pathToFileURL(entry).href;
}

if (isMain()) {
  const command = process.argv[2] ?? "share";
  if (command === "hosts") {
    printHosts();
  } else if (command === "share") {
    printShare();
  } else if (command === "target") {
    try {
      printTarget();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(message);
      process.exit(1);
    }
  } else {
    console.error(`Unknown command: ${command}. Use share, hosts, or target.`);
    process.exit(1);
  }
}
