import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { loadMcpSkills } from "./skills.js";

const SKILLS = ["catch-up", "get-to-know", "onboarding", "reach-out", "remember", "share-person"];
const PROTOCOL_VERSION = "2026-07-28";

/** Builds a server per request, as `index.ts` does, with only the skills attached. */
const handler = createMcpHandler(
  async () => {
    const server = new McpServer({ name: "Bondery", version: "0.0.0" });
    (await loadMcpSkills()).attach(server);
    return server;
  },
  { legacy: "reject" },
);

async function rpc(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
  const response = await handler.fetch(
    new Request("http://test/mcp", {
      body: JSON.stringify({
        id: 1,
        jsonrpc: "2.0",
        method,
        params: {
          _meta: {
            "io.modelcontextprotocol/clientCapabilities": {},
            "io.modelcontextprotocol/clientInfo": { name: "skills-test", version: "0" },
            "io.modelcontextprotocol/protocolVersion": PROTOCOL_VERSION,
          },
          ...params,
        },
      }),
      headers: {
        accept: "application/json, text/event-stream",
        "content-type": "application/json",
        "mcp-method": method,
        "mcp-protocol-version": PROTOCOL_VERSION,
        ...(typeof params.uri === "string" ? { "mcp-name": params.uri } : {}),
      },
      method: "POST",
    }),
  );
  const body = await response.text();
  assert.equal(response.status, 200, body);
  const json = body.startsWith("{") ? body : (/^data: (.*)$/m.exec(body)?.[1] ?? "");
  const message = JSON.parse(json) as { error?: unknown; result?: unknown };
  assert.equal(message.error, undefined, body);
  return message.result;
}

describe("mCP skills", () => {
  it("loads every plugin skill under the bondery prefix", async () => {
    const catalog = await loadMcpSkills();
    assert.deepEqual(
      catalog.entries.map((skill) => skill.uri),
      SKILLS.map((name) => `skill://bondery/${name}/SKILL.md`),
    );
    assert.deepEqual(
      catalog.entries.map((skill) => skill.frontmatter.name),
      SKILLS,
    );
    for (const skill of catalog.entries) {
      assert.ok(skill.frontmatter.description.length > 0, skill.uri);
    }
  });

  it("lists the skills over MCP on a new server for each request", async () => {
    for (let request = 0; request < 2; request += 1) {
      const result = (await rpc("skills/list")) as { skills: { uri: string }[] };
      assert.deepEqual(
        result.skills.map((skill) => skill.uri),
        SKILLS.map((name) => `skill://bondery/${name}/SKILL.md`),
      );
    }
  });

  it("reads a skill file over MCP", async () => {
    const result = (await rpc("resources/read", {
      uri: "skill://bondery/catch-up/SKILL.md",
    })) as { contents: { text?: string }[] };
    const text = result.contents[0]?.text ?? "";
    assert.match(text, /^---\nname: catch-up\n/);
    assert.match(text, /the Bondery MCP server is not connected/);
  });
});
