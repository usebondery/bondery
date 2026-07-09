import { spawn } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, watch } from "node:fs";
import { join } from "node:path";

const srcLocales = join("src", "locales");
const distLocales = join("dist", "locales");

function copyRecursive(src, dest) {
  if (!existsSync(src)) {
    return;
  }
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else if (entry.name.endsWith(".json")) {
      copyFileSync(srcPath, destPath);
    }
  }
}

function syncArtifacts() {
  copyRecursive(srcLocales, distLocales);
  if (existsSync("manifest.json")) {
    mkdirSync("dist", { recursive: true });
    copyFileSync("manifest.json", join("dist", "manifest.json"));
  }
}

syncArtifacts();

if (existsSync(srcLocales)) {
  watch(srcLocales, { recursive: true }, (eventType) => {
    if (eventType === "change") {
      syncArtifacts();
    }
  });
}

spawn("node", ["scripts/generate-resource-map.mjs"], { shell: true, stdio: "inherit" });

const tsc = spawn("tsc", ["--watch", "--preserveWatchOutput"], {
  shell: true,
  stdio: "inherit",
});

tsc.on("exit", (code) => {
  process.exit(code ?? 0);
});

process.on("SIGINT", () => {
  tsc.kill("SIGINT");
  process.exit(0);
});
