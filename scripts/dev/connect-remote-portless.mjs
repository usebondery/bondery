/**
 * Laptop browser → WSL Portless over SSH.
 *
 * Portless binds `127.0.0.1:443` on the PC. The laptop maps the `.test`
 * hostnames to its own loopback and forwards local 443 into WSL.
 *
 * WSL (dev processes already running):
 *   pnpm run dev:remote-portless
 *
 * Laptop (elevated PowerShell, repo checkout):
 *   .\scripts\dev\connect-remote-portless.ps1 -SshTarget sveetya@100.125.211.35
 */
import { spawnSync } from "node:child_process";
import { homedir, userInfo } from "node:os";
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

function tailscaleIpv4() {
  return runQuiet("tailscale", ["ip", "-4"]).split(/\s+/)[0] ?? "";
}

function printShare() {
  const hostnames = portlessHttpsHostnames();
  const ip = tailscaleIpv4();
  const user = userInfo().username;
  const sshTarget = ip ? `${user}@${ip}` : `${user}@<tailscale-ipv4>`;
  const caPath = `${homedir()}/.portless/ca.pem`;

  console.log("Dev processes stay on this PC. The laptop browser uses the .test names.");
  console.log("");
  console.log("On this PC:");
  console.log("  1. Start the stack (`pnpm run dev` or the apps you need).");
  console.log("  2. Portless must listen on 127.0.0.1:443.");
  console.log(`  3. CA file: ${caPath}`);
  console.log("");
  console.log("On the laptop, elevated PowerShell from the repo:");
  console.log(`  .\\scripts\\dev\\connect-remote-portless.ps1 -SshTarget ${sshTarget}`);
  console.log("");
  console.log("Hostnames:");
  for (const hostname of hostnames) {
    console.log(`  https://${hostname}/`);
  }
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
  } else {
    console.error(`Unknown command: ${command}. Use share or hosts.`);
    process.exit(1);
  }
}
