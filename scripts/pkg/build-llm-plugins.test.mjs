import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { loadPluginSource, renderClaudeTree, renderOpenAiTree } from "./build-llm-plugins.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const FIXTURE_VERSION = "0.0.0-fixture";
const SKILLS = ["catch-up", "get-to-know", "reach-out", "remember", "share-person"];

const { config, files } = loadPluginSource(root);
const claude = renderClaudeTree(config, files, FIXTURE_VERSION);
const openai = renderOpenAiTree(config, files, FIXTURE_VERSION);

function json(tree, rel) {
  return JSON.parse(tree.get(rel).toString("utf8"));
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
    const auth = openaiMcp.mcpServers.bondery.extensions["com.openai"].auth;
    assert.equal(auth.type, "oauth");
    assert.equal(auth.client.mode, "cimd");
    assert.equal(Object.hasOwn(auth, "clientSecret"), false);
    assert.equal(Object.hasOwn(auth.client, "clientId"), false);
    assert.equal(Object.hasOwn(auth.client, "clientSecret"), false);
    assert.equal(JSON.stringify(openaiMcp).includes("clientSecret"), false);
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
    assert.match(skill, /connect the Bondery plugin in ChatGPT or Codex and sign in/);
    assert.match(skill, /- \*\*Signed out:\*\*/);
    const readme = openai.get("README.md").toString("utf8");
    assert.equal(readme.includes("llm-plugin-connect"), false);
    assert.match(readme, /Install the Bondery plugin in ChatGPT or Codex/);
  });

  it("keeps Claude out of the OpenAI tree", () => {
    for (const [rel, body] of openai) {
      if (rel.endsWith(".png")) {
        continue;
      }
      assert.equal(body.toString("utf8").includes("Claude"), false, rel);
    }
  });

  it("matches the current Claude manifest, MCP file, and skill bytes", () => {
    const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
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
