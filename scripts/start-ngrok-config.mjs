import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
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

function resolveNgrokBinary() {
  const fromEnv = process.env.NGROK;
  if (fromEnv && existsSync(fromEnv)) {
    return fromEnv;
  }

  const isWindows = process.platform === "win32";
  const candidates = isWindows
    ? [
        resolve(process.env.LOCALAPPDATA ?? "", "Microsoft", "WindowsApps", "ngrok.exe"),
        "C:\\Program Files\\ngrok\\ngrok.exe",
      ]
    : [
        "/snap/bin/ngrok",
        "/usr/local/bin/ngrok",
        "/usr/bin/ngrok",
        resolve(homedir(), ".local", "bin", "ngrok"),
      ];

  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) {
      return candidate;
    }
  }

  if (!isWindows) {
    const which = spawnSync("which", ["ngrok"], { encoding: "utf8" });
    const found = which.stdout?.trim();
    if (found && !found.includes("node_modules")) {
      return found;
    }
  }

  return "ngrok";
}

const ngrokBinary = resolveNgrokBinary();
const child = spawn(ngrokBinary, ["start", "--config", configPath, "--all"], {
  shell: process.platform === "win32" && !/[\\/]/.test(ngrokBinary),
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
