#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const src = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

const groups = [
  [
    "entities",
    [
      "_shared",
      "activity",
      "address",
      "api",
      "api-keys",
      "channels",
      "chat",
      "contact",
      "group",
      "import",
      "important-date",
      "merge",
      "notes",
      "reminder",
      "session",
      "settings",
      "social",
      "subscription",
      "tag",
    ],
  ],
  ["primitives", ["channel", "color"]],
  ["locale", ["supported-locale"]],
  ["errors", ["api-error-response"]],
  [".", ["contact-id"]],
  ["sync", ["ws", "pull", "push", "mutations", "conflict"]],
  ["http", ["ids"]],
];

function fixFile(file, moduleName) {
  let content = readFileSync(file, "utf8");
  const original = content;
  content = content
    .replaceAll(`../${moduleName}/types.js`, "./types.js")
    .replaceAll(`../${moduleName}/schema.js`, "./schema.js")
    .replaceAll(`../${moduleName}/contract.js`, "./contract.js")
    .replaceAll(`../${moduleName}/index.js`, "./index.js");
  if (content !== original) {
    writeFileSync(file, content);
    console.log("fixed", file);
  }
}

for (const [dir, modules] of groups) {
  for (const mod of modules) {
    const folder = dir === "." ? join(src, mod) : join(src, dir, mod);
    for (const file of ["types.ts", "schema.ts", "contract.ts", "index.ts"]) {
      try {
        fixFile(join(folder, file), mod);
      } catch {
        /* missing file */
      }
    }
  }
}
