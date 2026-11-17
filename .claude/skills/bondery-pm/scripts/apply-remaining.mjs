#!/usr/bin/env node
/**
 * Prints update_work_item payloads as JSON lines for batch application.
 * Usage: node apply-remaining.mjs | head
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const items = JSON.parse(readFileSync(join(dir, "migration-remaining.json"), "utf8"));

for (const item of items) {
  const { project_id, work_item_id, name, state, assignees, labels, description_html, priority } =
    item;
  process.stdout.write(
    `${JSON.stringify({
      assignees,
      description_html,
      labels,
      name,
      priority,
      project_id,
      state,
      work_item_id,
    })}\n`,
  );
}
