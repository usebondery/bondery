import fs from "node:fs";
import path from "node:path";

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walk(full, acc);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

function get(obj, keyPath) {
  return keyPath.split(".").reduce((current, key) => current?.[key], obj);
}

const en = JSON.parse(fs.readFileSync("packages/translations/src/en.json", "utf8"));
const cs = JSON.parse(fs.readFileSync("packages/translations/src/cs.json", "utf8"));
const root = "apps/webapp/src";
const prefixRe = /use(?:Web)?Translations\(\s*["']([^"']+)["']/g;
const tRe = /\bt\(\s*["']([^"']+)["']/g;
const used = new Map();

for (const file of walk(root)) {
  const content = fs.readFileSync(file, "utf8");
  const prefixes = [...content.matchAll(prefixRe)].map((match) => match[1]);
  if (prefixes.length === 0) continue;

  for (const match of content.matchAll(tRe)) {
    const key = match[1];
    if (key.includes(".")) continue;
    for (const prefix of prefixes) {
      const full = `${prefix}.${key}`;
      if (!used.has(full)) used.set(full, []);
      used.get(full).push(path.relative(root, file).replace(/\\/g, "/"));
    }
  }
}

const missingEn = [];
const missingCs = [];
for (const full of used.keys()) {
  if (get(en, full) === undefined) missingEn.push(full);
  if (get(cs, full) === undefined) missingCs.push(full);
}

missingEn.sort();
missingCs.sort();
console.log(`Missing in en.json: ${missingEn.length}`);
for (const key of missingEn) console.log(key);
console.log(`\nMissing in cs.json: ${missingCs.length}`);
for (const key of missingCs) console.log(key);
