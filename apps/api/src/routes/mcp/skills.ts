/**
 * Serves the Bondery skills over MCP (SEP-2640), at `skill://bondery/<skill>/SKILL.md`.
 *
 * The skills come from `llm-plugins/src/skills`, the same source as the Claude and OpenAI plugins.
 * `scripts/pkg/build-llm-plugins.mjs` writes them to `skills.generated.ts`.
 */
import {
  memorySkillFiles,
  type SkillCatalog,
  SkillsExtension,
} from "@modelcontextprotocol/server/ext/skills";
import { MCP_SKILL_FILES } from "./skills.generated.js";

/** Skills change only on deploy, and they hold no user data. */
const SKILLS_CACHE_TTL_MS = 60 * 60 * 1000;

let catalog: Promise<SkillCatalog> | null = null;

/**
 * Builds the catalog once per process. `strict` turns an invalid skill into an error,
 * so a broken skill fails the test suite instead of silently dropping out of the list.
 */
export function loadMcpSkills(): Promise<SkillCatalog> {
  catalog ??= SkillsExtension.load(memorySkillFiles(MCP_SKILL_FILES), {
    cacheHint: { cacheScope: "public", ttlMs: SKILLS_CACHE_TTL_MS },
    prefix: "bondery",
    strict: true,
  });
  return catalog;
}
