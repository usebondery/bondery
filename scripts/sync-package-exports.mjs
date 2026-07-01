/**
 * Regenerates dual-export blocks in package.json files from export manifest.
 * Run after adding new subpath exports: node scripts/sync-package-exports.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { dualExport, dualJsonExport } from "./lib/dual-exports.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const manifests = {
  "packages/schemas/package.json": {
    ".": "./src/index.ts",
    "./constants": "./src/constants/index.ts",
    "./supabase.types": "./src/supabase.types.ts",
    "./database": "./src/supabase.types.ts",
    "./sync": "./src/sync/index.ts",
    "./http": "./src/http/index.ts",
  },
  "packages/helpers/package.json": {
    ".": "./src/index.ts",
    "./globals": "./src/globals/index.ts",
    "./globals/paths": "./src/globals/paths.ts",
    "./globals/dev-ports": "./src/globals/dev-ports.ts",
    "./platform": "./src/platform/index.ts",
    "./name": "./src/name/index.ts",
    "./address": "./src/address/index.ts",
    "./date": "./src/date/index.ts",
    "./text": "./src/text/index.ts",
    "./version": "./src/version/index.ts",
    "./interactions": "./src/interactions/index.ts",
    "./env": "./src/env/index.ts",
    "./locale": "./src/locale/index.ts",
    "./socials": "./src/socials/index.ts",
    "./phone": "./src/phone/index.ts",
    "./contact": "./src/contact/index.ts",
    "./geocode": "./src/geocode/index.ts",
    "./emoji": "./src/emoji/index.ts",
    "./notes": "./src/notes/index.ts",
    "./forms": "./src/forms/index.ts",
  },
  "packages/vcard/package.json": {
    ".": "./src/index.ts",
  },
  "packages/emails/package.json": {
    ".": "./src/index.ts",
  },
  "packages/branding/package.json": {
    ".": "./src/index.ts",
    "./src": "./src/index.ts",
    "./icons": "./src/react/index.ts",
    "./react": "./src/react/index.ts",
    "./react/src": "./src/react/index.ts",
  },
  "packages/mantine-next/package.json": {
    ".": "./src/index.ts",
    "./theme": "./src/theme.ts",
    "./theme/src": "./src/theme.ts",
  },
  "packages/translations/package.json": {
    ".": "./src/index.ts",
    "./cs": "./src/cs.json",
    "./en": "./src/en.json",
  },
};

for (const [relPath, manifest] of Object.entries(manifests)) {
  const pkgPath = join(root, relPath);
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  const exports = {};

  for (const [subpath, src] of Object.entries(manifest)) {
    exports[subpath] = src.endsWith(".json")
      ? dualJsonExport(src)
      : dualExport(src);
  }

  if (relPath === "packages/branding/package.json") {
    exports["./icon-generator"] = {
      types: "./scripts/icon-generator.d.ts",
      import: "./scripts/generate-icons.ts",
      require: "./scripts/generate-icons.ts",
    };
  }

  if (relPath === "packages/mantine-next/package.json") {
    exports["./styles"] = {
      types: "./src/styles.d.ts",
      style: "./src/styles.css",
      import: "./src/styles.css",
      require: "./src/styles.css",
    };
  }

  pkg.exports = exports;
  pkg.main = manifest["."];
  pkg.types = manifest["."];
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log(`Updated ${relPath}`);
}
