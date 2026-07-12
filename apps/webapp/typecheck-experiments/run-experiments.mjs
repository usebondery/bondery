#!/usr/bin/env node
/**
 * Small A/B typecheck experiments for the three suspected build bottlenecks.
 * Runs isolated tsc programs and compares extendedDiagnostics + optional traces.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const cacheDir = join(root, ".cache");

const experiments = [
  {
    hypothesis: "Issue 1: Zod-inferred schema types in consumer graph",
    pairs: [
      { file: "issue1-zod-infer.ts", label: "control (z.infer exports)" },
      { file: "issue1-flat-dto.ts", label: "variant (flat DTO interfaces)" },
    ],
  },
  {
    hypothesis: "Issue 2: Mantine schemaResolver + Zod schema",
    pairs: [
      { file: "issue2-schema-resolver.tsx", label: "control (schemaResolver)" },
      { file: "issue2-manual-validate.tsx", label: "variant (manual safeParse)" },
    ],
  },
  {
    hypothesis: "Issue 3: strict i18next Resources on t() calls",
    pairs: [
      { file: "issue3-i18n-strict.tsx", label: "control (useWebTranslations)" },
      { file: "issue3-i18n-loose.tsx", label: "variant (loose T function)" },
    ],
  },
];

function parseDiagnostics(output) {
  const metrics = {};
  for (const line of output.split("\n")) {
    const match = line.match(
      /^(Files|Lines|Identifiers|Symbols|Types|Instantiations|Memory used|Check time|I\/O read time|Parse time|Bind time|Total time):\s+(.+)$/,
    );
    if (match) {
      metrics[match[1]] = match[2].trim();
    }
  }
  return metrics;
}

function parseTraceHotFile(tracePath, targetFile) {
  const raw = readFileSync(tracePath, "utf8").trim();
  const events = raw.startsWith("[")
    ? JSON.parse(raw)
    : raw.split("\n").map((line) => JSON.parse(line));

  let totalMicros = 0;
  for (const event of events) {
    if (event.ph !== "X") {
      continue;
    }
    if (!event.args?.path?.endsWith(targetFile)) {
      continue;
    }
    if (event.name === "checkExpression" || event.name === "checkDeferredNode") {
      totalMicros += event.dur ?? 0;
    }
  }

  return totalMicros / 1_000_000;
}

function runExperiment(file) {
  rmSync(cacheDir, { force: true, recursive: true });
  mkdirSync(cacheDir, { recursive: true });

  const tsconfigPath = join(cacheDir, "tsconfig.json");
  writeFileSync(
    tsconfigPath,
    JSON.stringify(
      {
        extends: "../tsconfig.shared.json",
        include: [`../${file}`],
      },
      null,
      2,
    ),
  );

  const traceDir = join(cacheDir, "trace");
  rmSync(traceDir, { force: true, recursive: true });
  mkdirSync(traceDir, { recursive: true });

  const result = spawnSync(
    "npx",
    ["tsc", "-p", tsconfigPath, "--noEmit", "--extendedDiagnostics", "--generateTrace", traceDir],
    {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=4096" },
    },
  );

  const output = `${result.stdout}\n${result.stderr}`;
  const metrics = parseDiagnostics(output);
  const checkSeconds = Number.parseFloat((metrics["Check time"] ?? "0").replace(/s$/, ""));
  const totalSeconds = Number.parseFloat((metrics["Total time"] ?? "0").replace(/s$/, ""));
  const hotFileSeconds = parseTraceHotFile(join(traceDir, "trace.json"), file);

  return {
    checkSeconds,
    exitCode: result.status ?? 1,
    files: metrics.Files ?? "?",
    hotFileSeconds,
    instantiations: metrics.Instantiations ?? "?",
    totalSeconds,
    types: metrics.Types ?? "?",
  };
}

function _formatSeconds(value) {
  return Number.isFinite(value) ? `${value.toFixed(2)}s` : "n/a";
}

function _ratio(control, variant) {
  if (!Number.isFinite(control) || !Number.isFinite(variant) || variant === 0) {
    return "n/a";
  }
  return `${(control / variant).toFixed(1)}x slower`;
}

const summary = [];

for (const experiment of experiments) {
  const results = [];

  for (const pair of experiment.pairs) {
    process.stdout.write(`Running ${pair.file} ... `);
    const result = runExperiment(pair.file);
    results.push({ ...pair, ...result });
  }

  const [control, variant] = results;

  summary.push({
    checkRatio: control.checkSeconds / Math.max(variant.checkSeconds, 0.001),
    hypothesis: experiment.hypothesis,
  });
}
for (const row of summary.toSorted((a, b) => b.checkRatio - a.checkRatio)) {
  const _importance =
    row.checkRatio >= 3
      ? "HIGH"
      : row.checkRatio >= 1.5
        ? "MEDIUM"
        : row.checkRatio > 1.1
          ? "LOW"
          : "NEGLIGIBLE";
}
