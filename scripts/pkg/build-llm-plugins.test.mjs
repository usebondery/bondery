import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  loadPluginSource,
  readBrandPrimaryColor,
  renderClaudeTree,
  renderMcpSkills,
  renderMcpSkillsModule,
  renderOpenAiTree,
} from "./build-llm-plugins.mjs";

const CATCH_UP_RE = /`catch-up`/;
const SHARE_PERSON_RE = /`share-person`/;
const CONNECT_THE_BONDERY_PLUGIN_IN_CHATGPT_RE =
  /connect the Bondery plugin in ChatGPT or Codex and sign in/;
const SIGNED_OUT_RE = /- \*\*Signed out:\*\*/;
const INSTALL_THE_BONDERY_PLUGIN_IN_CHATGPT_RE = /Install the Bondery plugin in ChatGPT or Codex/;
const THE_BONDERY_MCP_SERVER_IS_NOT_RE = /the Bondery MCP server is not connected/;

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const FIXTURE_VERSION = "0.0.0-fixture";
const SKILLS = ["catch-up", "get-to-know", "onboarding", "reach-out", "remember", "share-person"];

const { config, files } = loadPluginSource(root);
const claude = renderClaudeTree(config, files, FIXTURE_VERSION);
const openai = renderOpenAiTree(config, files, FIXTURE_VERSION);
const mcpSkills = renderMcpSkills(config, files);

/**
 * @param {unknown} value
 * @returns {unknown}
 */
function asUnknown(value) {
  return value;
}

function json(tree, rel) {
  return asUnknown(JSON.parse(tree.get(rel).toString("utf8")));
}

describe("llm plugin build", () => {
  it("stamps the fixture version and does not read a config version", () => {
    assert.equal(Object.hasOwn(config, "version"), false);
    assert.equal(json(claude, ".claude-plugin/plugin.json").version, FIXTURE_VERSION);
    assert.equal(json(openai, "plugin.json").version, FIXTURE_VERSION);
  });

  it("sets the host MCP types and CIMD auth", () => {
    const claudeMcp = json(claude, ".mcp.json");
    const openaiMcp = json(openai, "mcp.json");
    assert.equal(claudeMcp.mcpServers.bondery.type, "http");
    assert.equal(openaiMcp.mcpServers.bondery.type, "streamable-http");
    const { auth } = openaiMcp.mcpServers.bondery.extensions["com.openai"];
    assert.equal(auth.type, "oauth");
    assert.equal(auth.client.mode, "cimd");
    assert.equal(Object.hasOwn(auth, "clientSecret"), false);
    assert.equal(Object.hasOwn(auth.client, "clientId"), false);
    assert.equal(Object.hasOwn(auth.client, "clientSecret"), false);
    assert.equal(JSON.stringify(openaiMcp).includes("clientSecret"), false);
  });

  it("sets brand colors, dark icons, author email, and an unrestricted country list", () => {
    const brand = readBrandPrimaryColor(root);
    const manifest = json(openai, "plugin.json");
    const iface = manifest.extensions["com.openai"].interface;
    assert.equal(manifest.author.email, "team@usebondery.com");
    assert.equal(json(claude, ".claude-plugin/plugin.json").author.email, "team@usebondery.com");
    assert.equal(iface.brandColor, brand);
    assert.equal(iface.brandColorDark, brand);
    assert.equal(iface.logoDark, "./assets/icon.png");
    assert.equal(iface.composerIconDark, "./assets/icon.png");
    assert.equal(iface.onboardingSkill, "./skills/onboarding/SKILL.md");
    assert.deepEqual(manifest.extensions["com.openai"].publication.countries, []);
    assert.match(openai.get("skills/onboarding/SKILL.md").toString("utf8"), CATCH_UP_RE);
    assert.match(openai.get("skills/onboarding/SKILL.md").toString("utf8"), SHARE_PERSON_RE);
  });

  it("keeps the OpenAI subtitle within 30 characters", () => {
    const subtitle = json(openai, "plugin.json").extensions["com.openai"].interface
      .shortDescription;
    assert.equal(subtitle, "People you mean to remember");
    assert.ok(subtitle.length <= 30);
  });

  it("replaces the connect block and removes the markers", () => {
    for (const [rel, body] of claude) {
      if (rel.endsWith(".png")) {
        continue;
      }
      assert.equal(body.toString("utf8").includes("llm-plugin-connect"), false, rel);
    }
    const skill = openai.get("skills/catch-up/SKILL.md").toString("utf8");
    assert.equal(skill.includes("llm-plugin-connect"), false);
    assert.match(skill, CONNECT_THE_BONDERY_PLUGIN_IN_CHATGPT_RE);
    assert.match(skill, SIGNED_OUT_RE);
    const readme = openai.get("README.md").toString("utf8");
    assert.equal(readme.includes("llm-plugin-connect"), false);
    assert.match(readme, INSTALL_THE_BONDERY_PLUGIN_IN_CHATGPT_RE);
  });

  it("keeps Claude out of the OpenAI tree", () => {
    for (const [rel, body] of openai) {
      if (rel.endsWith(".png")) {
        continue;
      }
      assert.equal(body.toString("utf8").includes("Claude"), false, rel);
    }
  });

  it("serves every plugin skill over MCP with the MCP connect line", () => {
    assert.deepEqual(
      [...mcpSkills.keys()],
      SKILLS.map((name) => `${name}/SKILL.md`),
    );
    for (const [rel, body] of mcpSkills) {
      assert.equal(body.includes("llm-plugin-connect"), false, rel);
      assert.equal(body.includes("Claude"), false, rel);
      assert.match(body, THE_BONDERY_MCP_SERVER_IS_NOT_RE, rel);
    }
    const pluginSkill = openai.get("skills/catch-up/SKILL.md").toString("utf8");
    const before = pluginSkill.slice(0, pluginSkill.indexOf("- **Not connected:**"));
    assert.ok(mcpSkills.get("catch-up/SKILL.md").startsWith(before));
  });

  it("matches the committed MCP skills module", () => {
    const committed = readFileSync(join(root, "apps/api/src/routes/mcp/skills.generated.ts"));
    assert.ok(renderMcpSkillsModule(mcpSkills).equals(committed));
  });

  it("matches the current Claude manifest, MCP file, and skill bytes", () => {
    const { version } = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    const release = renderClaudeTree(config, files, version);
    assert.ok(
      release
        .get(".claude-plugin/plugin.json")
        .equals(readFileSync(join(root, "llm-plugins/claude/.claude-plugin/plugin.json"))),
    );
    assert.ok(
      release.get(".mcp.json").equals(readFileSync(join(root, "llm-plugins/claude/.mcp.json"))),
    );
    for (const name of SKILLS) {
      const rel = `skills/${name}/SKILL.md`;
      assert.ok(release.get(rel).equals(readFileSync(join(root, "llm-plugins/claude", rel))), rel);
    }
  });
});
