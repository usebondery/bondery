/**
 * tsc does not copy SVG files. AnthropicIcon resolves the official mark
 * relative to the compiled module, so the file must sit in dist too.
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "src/assets/brands/anthropic.svg");
const toDir = join(root, "dist/assets/brands");

mkdirSync(toDir, { recursive: true });
copyFileSync(from, join(toDir, "anthropic.svg"));
