#!/usr/bin/env node
/**
 * Build the Claude and OpenAI plugin trees, and the skill catalog the API serves over MCP,
 * from `llm-plugins/src`. The skills in `llm-plugins/src/skills` are the one source for all three.
 * The config has no version. Pass `--check` or `--zip` on the CLI.
 *
 * Rendering lives in `llm-plugins/render.mjs`; config validation in
 * `llm-plugins/validate-config.mjs`; folder reads and writes in `llm-plugins/trees.mjs`.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { repoRoot } from "./llm-plugins/paths.mjs";
import { loadPluginSource, readRootVersion } from "./llm-plugins/plugin-source.mjs";
import {
  renderClaudeTree,
  renderMcpSkills,
  renderMcpSkillsModule,
  renderOpenAiTree,
} from "./llm-plugins/render.mjs";
import { diffTree, writeTree, writeZip } from "./llm-plugins/trees.mjs";

const MCP_SKILLS_MODULE = "apps/api/src/routes/mcp/skills.generated.ts";

export { readBrandPrimaryColor } from "./llm-plugins/json-format.mjs";
export { loadPluginSource } from "./llm-plugins/plugin-source.mjs";
export {
  applyConnectBlock,
  renderClaudeTree,
  renderMcpSkills,
  renderMcpSkillsModule,
  renderOpenAiTree,
} from "./llm-plugins/render.mjs";

function parseArgs(args) {
  const options = { check: false, zip: false };
  for (const arg of args) {
    if (arg === "--check") {
      options.check = true;
    } else if (arg === "--zip") {
      options.zip = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function checkTrees(root, version, claude, openai, mcpSkills) {
  const mcpSkillsPath = join(root, MCP_SKILLS_MODULE);
  const mcpCurrent = existsSync(mcpSkillsPath) ? readFileSync(mcpSkillsPath) : null;
  const diffs = [
    ...diffTree(join(root, "llm-plugins/claude"), claude).map(
      (item) => `llm-plugins/claude: ${item}`,
    ),
    ...diffTree(join(root, "llm-plugins/openai"), openai).map(
      (item) => `llm-plugins/openai: ${item}`,
    ),
    ...(mcpCurrent?.equals(mcpSkills) ? [] : [`${MCP_SKILLS_MODULE}: content differs`]),
  ];
  if (diffs.length > 0) {
    throw new Error(
      `Plugin trees differ from the build output. Run node scripts/pkg/build-llm-plugins.mjs\n${diffs
        .map((diff) => `  - ${diff}`)
        .join("\n")}`,
    );
  }
  console.log(`Plugin trees match version ${version}.`);
}

function run(options) {
  const root = repoRoot();
  const version = readRootVersion(root);
  const { config, files } = loadPluginSource(root);
  const claude = renderClaudeTree(config, files, version);
  const openai = renderOpenAiTree(config, files, version);
  const mcpSkills = renderMcpSkillsModule(renderMcpSkills(config, files));

  if (options.check) {
    checkTrees(root, version, claude, openai, mcpSkills);
  } else {
    writeTree(join(root, "llm-plugins/claude"), claude);
    writeTree(join(root, "llm-plugins/openai"), openai);
    writeFileSync(join(root, MCP_SKILLS_MODULE), mcpSkills);
    console.log(`Wrote plugin trees at version ${version} and ${MCP_SKILLS_MODULE}.`);
  }
  if (options.zip) {
    writeZip(root, openai);
    console.log("Wrote tmp/bondery-openai-plugin.zip.");
  }
}

function main() {
  try {
    run(parseArgs(process.argv.slice(2)));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main();
}
