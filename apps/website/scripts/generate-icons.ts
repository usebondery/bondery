import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateIcons } from "@bondery/branding/icon-generator";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const icons = [
  { format: "ico" as const, name: "favicon.ico", outDir: "../src/app", size: 48 },
  { format: "png" as const, name: "icon.png", outDir: "../src/app/icons", size: 512 },
  { format: "png" as const, name: "apple-icon.png", outDir: "../src/app/icons", size: 180 },
  { format: "svg" as const, name: "logo.svg", outDir: "../public" },
  // Source icon. The builder copies it into both generated packages.
  {
    format: "png" as const,
    name: "icon.png",
    outDir: "../../../llm-plugins/src/assets",
    size: 512,
  },
];

const svgPath = join(__dirname, "../../../packages/branding/src/assets/icon.svg");

async function main(): Promise<void> {
  await generateIcons({
    baseDir: __dirname,
    icons,
    svgPath,
  });

  // Copy the source icon into llm-plugins/claude and llm-plugins/openai.
  const repoRoot = join(__dirname, "../../..");
  const build = spawnSync(process.execPath, [join(repoRoot, "scripts/pkg/build-llm-plugins.mjs")], {
    cwd: repoRoot,
    stdio: "inherit",
  });
  if (build.error) {
    console.error(build.error.message);
    process.exit(1);
  }
  if (build.status !== 0) {
    process.exit(build.status ?? 1);
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
