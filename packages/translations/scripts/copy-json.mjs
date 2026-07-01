import { copyFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const srcDir = "src";
const distDir = "dist";

for (const file of readdirSync(srcDir)) {
  if (file.endsWith(".json")) {
    copyFileSync(join(srcDir, file), join(distDir, file));
  }
}
