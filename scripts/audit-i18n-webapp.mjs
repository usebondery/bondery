import fs from "node:fs";
import path from "node:path";

function walk(dir, files = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!["node_modules", ".next", "dist"].includes(e.name)) {
        walk(p, files);
      }
    } else if (/\.(tsx|ts)$/.test(e.name) && !/\.test\./.test(e.name)) {
      files.push(p);
    }
  }
  return files;
}

const root = "apps/webapp/src";
const files = walk(root);

const patterns = [
  { name: "jsx-text", re: />\s*([A-Z][^<{}\n]{2,80}?)\s*</g },
  {
    name: "string-prop",
    re: /(?:label|title|placeholder|description|message|confirmLabel|cancelLabel|emptyState|helperText|actionLabel|text|tooltip|aria-label)\s*=\s*["']([A-Za-z][^"']{2,100})["']/g,
  },
  {
    name: "object-string",
    re: /(?:title|message|label|description|text)\s*:\s*["']([A-Za-z][^"']{3,100})["']/g,
  },
  { name: "error-header", re: /ErrorPageHeader[^>]*title=["']([^"']+)["']/g },
];

const skipTexts = new Set([
  "Ctrl",
  "Cmd",
  "Shift",
  "Alt",
  "Enter",
  "Esc",
  "Tab",
  "Signal",
  "Mapy.com",
  "OpenStreetMap",
  "Promise",
  "React",
  "Next",
  "Bondery",
]);

const results = [];

for (const file of files) {
  const rel = file.replace(/\\/g, "/");
  const content = fs.readFileSync(file, "utf8");
  const hasI18n =
    /useWebTranslations|getWebTranslations|useTranslations|getTranslations|useT\(|getT\(|<Trans\b/.test(
      content,
    );

  for (const { name, re } of patterns) {
    const regex = new RegExp(re.source, re.flags);
    let m = regex.exec(content);
    while (m !== null) {
      const text = m[1].trim();
      if (!text || text.length < 3) {
        continue;
      }
      if (/^t\(/.test(text) || /^\{/.test(text)) {
        continue;
      }
      if (/^https?:/.test(text)) {
        continue;
      }
      if (/^[A-Z_]+$/.test(text)) {
        continue;
      }
      if (/^\d/.test(text)) {
        continue;
      }
      if (skipTexts.has(text)) {
        continue;
      }
      if (/Promise|void|boolean|string\[\]|ReactNode|Error\b/.test(text)) {
        continue;
      }
      if (/^Failed to /.test(text) && !rel.includes("components")) {
        continue;
      }

      const line = content.slice(0, m.index).split("\n").length;
      results.push({ file: rel, hasI18n, line, text, type: name });
      m = regex.exec(content);
    }
  }
}

const seen = new Set();
const unique = results.filter((r) => {
  const k = `${r.file}|${r.text}`;
  if (seen.has(k)) {
    return false;
  }
  seen.add(k);
  return true;
});

unique.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);

console.log(`Total potential hardcoded strings: ${unique.length}\n`);
for (const r of unique) {
  const tag = r.hasI18n ? "has-t" : "NO-t";
  console.log(`${r.file}:${r.line} [${tag}] ${JSON.stringify(r.text)}`);
}
