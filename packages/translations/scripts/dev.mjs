import { spawn } from "node:child_process";
import { copyFileSync, readdirSync, watch } from "node:fs";
import { join } from "node:path";

const srcDir = "src";
const distDir = "dist";

function copyJsonFiles() {
  for (const file of readdirSync(srcDir)) {
    if (file.endsWith(".json")) {
      copyFileSync(join(srcDir, file), join(distDir, file));
    }
  }
}

copyJsonFiles();

for (const file of readdirSync(srcDir)) {
  if (!file.endsWith(".json")) continue;

  watch(join(srcDir, file), (eventType) => {
    if (eventType === "change") {
      copyJsonFiles();
    }
  });
}

const tsc = spawn("tsc", ["--watch", "--preserveWatchOutput"], {
  stdio: "inherit",
  shell: true,
});

tsc.on("exit", (code) => {
  process.exit(code ?? 0);
});

process.on("SIGINT", () => {
  tsc.kill("SIGINT");
  process.exit(0);
});
