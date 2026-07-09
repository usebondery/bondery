import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const configName = process.argv[2];
if (!configName) {
  console.error("Usage: node scripts/start-ngrok-config.mjs <config-file>");
  process.exit(1);
}

const configPath = resolve(process.cwd(), configName);
if (!existsSync(configPath)) {
  process.exit(0);
}

const child = spawn("ngrok", ["start", "--config", configPath, "--all"], {
  shell: process.platform === "win32",
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
