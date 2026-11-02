#!/usr/bin/env node
/**
 * Write Biome error locations into the GitHub job summary.
 * The log reporter still prints the full diagnostic. This table keeps the file path visible.
 *
 * Usage: node scripts/check/biome-step-summary.mjs <biome-report.json>
 */

import { appendFileSync, readFileSync } from "node:fs";

const reportPath = process.argv[2];
// biome-ignore lint/suspicious/noUndeclaredEnvVars: GitHub Actions injects this at runtime
const summaryPath = process.env.GITHUB_STEP_SUMMARY;

if (!reportPath || !summaryPath) {
  process.exit(0);
}

const report = JSON.parse(readFileSync(reportPath, "utf8"));
const errors = (report.diagnostics ?? []).filter((item) => item.severity === "error");

if (errors.length === 0) {
  process.exit(0);
}

const shown = errors.slice(0, 100);

function cell(value) {
  return String(value ?? "")
    .replaceAll("|", "\\|")
    .replaceAll("\r\n", " ")
    .replaceAll("\n", " ");
}

const lines = [
  "## Biome",
  "",
  `${errors.length} error${errors.length === 1 ? "" : "s"}. Warnings: ${report.summary?.warnings ?? 0}.`,
  "",
  "| File | Line | Rule |",
  "| --- | --- | --- |",
];

for (const item of shown) {
  const file = String(item.location?.path ?? "").replaceAll("\\", "/");
  const line = item.location?.start?.line ?? "";
  lines.push(`| \`${cell(file)}\` | ${cell(line)} | \`${cell(item.category)}\` |`);
}

if (errors.length > shown.length) {
  lines.push("", `${errors.length - shown.length} more errors are in the job log.`);
}

lines.push("");
appendFileSync(summaryPath, `${lines.join("\n")}\n`);
