import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(pkgRoot, "locale", "supported-locales.json");
const destDir = path.join(pkgRoot, "dist", "locale");
const dest = path.join(destDir, "supported-locales.json");

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log(`Copied ${path.relative(pkgRoot, src)} → ${path.relative(pkgRoot, dest)}`);
