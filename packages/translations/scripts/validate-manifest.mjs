import fs from "node:fs";
import path from "node:path";
import localeCatalog from "@bondery/schemas/locale/supported-locales.json" with { type: "json" };

const ROOT = path.resolve(".");
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));
const localesRoot = path.join(ROOT, "src", "locales");
const locales = localeCatalog.supported.map((entry) => entry.code);

function _collectKeys(value, prefix = "", acc = []) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, nested] of Object.entries(value)) {
      const next = prefix ? `${prefix}.${key}` : key;
      if (nested && typeof nested === "object" && !Array.isArray(nested)) {
        _collectKeys(nested, next, acc);
      } else {
        acc.push(next);
      }
    }
  }
  return acc;
}

let failed = false;

for (const [namespace, entry] of Object.entries(manifest.namespaces)) {
  for (const locale of locales) {
    const filePath = path.join(localesRoot, locale, entry.path);
    if (!fs.existsSync(filePath)) {
      console.error(`Missing file for namespace ${namespace} (${locale}): ${entry.path}`);
      failed = true;
    }
  }
}

for (const group of Object.values(manifest.preload)) {
  for (const ns of group) {
    if (!manifest.namespaces[ns]) {
      console.error(`Preload references unknown namespace: ${ns}`);
      failed = true;
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log(
  `Manifest validation passed (${Object.keys(manifest.namespaces).length} namespaces, ${locales.length} locales)`,
);
