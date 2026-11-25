/**
 * MCP HTTP endpoint surface: transport guards, discovery, tool/prompt/skill listing, and
 * client trust checks. Tool behaviour lives in `mcp-tool-*-integration.test.ts`.
 *
 * Needs the same Postgres + migrate setup as `test:auth` (`pnpm run test:auth -w api`).
 */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { FastifyInstance } from "fastify";
import { loadTestEnv } from "./load-test-env.js";

const APPLICATION_JSON_PATTERN = /application\/json/u;
const CATCH_UP_SKILL_FRONTMATTER_PATTERN = /^---\nname: catch-up\n/u;
const MCP_SERVER_NOT_CONNECTED_PATTERN = /the Bondery MCP server is not connected/u;

loadTestEnv();

const { createTestApp } = await import("./create-test-app.js");
const { prisma } = await import("@bondery/db");
const { upsertMcpResources } = await import("../lib/bootstrap/provision-oauth-clients.js");
const { MCP_SERVER_INSTRUCTIONS } = await import("../routes/mcp/instructions.js");
const { ASSISTANT_TOOL_NAMES } = await import("../services/assistant-tools/catalog.js");
const {
  CIMD_DISCOVERY_ID,
  MCP_READ_SCOPE,
  createNativeSession,
  createTestUser,
  deleteOAuthClientsAndUsers,
  mcpHeaders,
  mcpRequestMeta,
  mintMcpToken,
  upsertMcpPublicClient,
} = await import("./mcp-test-harness.js");

const MCP_CLIENT_ID = "mcp-endpoint-client";
const MCP_NON_CIMD_CLIENT_ID = "mcp-non-cimd-gate-client";
const MCP_DISABLE_CLIENT_ID = "mcp-disable-gate-client";
const MCP_CLIENT_IDS = [MCP_CLIENT_ID, MCP_NON_CIMD_CLIENT_ID, MCP_DISABLE_CLIENT_ID];

const EXPECTED_PROMPTS = [
  "brief_before_meeting",
  "catch_up_on_contact",
  "organize_contact",
  "reach_out_today",
  "record_interaction",
  "save_new_contact",
];

const EXPECTED_SKILL_URIS = [
  "skill://bondery/catch-up/SKILL.md",
  "skill://bondery/get-to-know/SKILL.md",
  "skill://bondery/onboarding/SKILL.md",
  "skill://bondery/reach-out/SKILL.md",
  "skill://bondery/remember/SKILL.md",
  "skill://bondery/share-person/SKILL.md",
];

type ListedTool = {
  annotations?: {
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
    readOnlyHint?: boolean;
  };
  name: string;
  title?: string;
};

describe("mCP HTTP endpoint", () => {
  let app: FastifyInstance;
  const createdUserIds: string[] = [];

  before(async () => {
    await upsertMcpResources();
    await upsertMcpPublicClient(MCP_CLIENT_ID, CIMD_DISCOVERY_ID);
    app = await createTestApp();
  });

  after(async () => {
    await app.close();
    await deleteOAuthClientsAndUsers(MCP_CLIENT_IDS, createdUserIds);
  });

  async function authenticatedSession(): Promise<string> {
    const user = await createTestUser("MCP Endpoint");
    createdUserIds.push(user.id);
    return mintMcpToken(app, await createNativeSession(user.id), MCP_CLIENT_ID);
  }

  it("rejects unauthenticated GET and HEAD with RFC 9728, authenticated GET with 405, DELETE with 405", async () => {
    const unauthenticatedGet = await app.inject({ method: "GET", url: "/mcp" });
    assert.equal(unauthenticatedGet.statusCode, 401, "GET");
    assert.ok(
      String(unauthenticatedGet.headers["www-authenticate"] ?? "").includes("resource_metadata"),
      "GET",
    );
    assert.match(
      String(unauthenticatedGet.headers["content-type"] ?? ""),
      APPLICATION_JSON_PATTERN,
    );
    assert.ok(unauthenticatedGet.body.includes("jsonrpc"));

    const unauthenticatedHead = await app.inject({ method: "HEAD", url: "/mcp" });
    assert.equal(unauthenticatedHead.statusCode, 401, "HEAD");
    assert.ok(
      String(unauthenticatedHead.headers["www-authenticate"] ?? "").includes("resource_metadata"),
      "HEAD",
    );
    assert.match(
      String(unauthenticatedHead.headers["content-type"] ?? ""),
      APPLICATION_JSON_PATTERN,
    );
    assert.equal(unauthenticatedHead.body, "");

    const accessToken = await authenticatedSession();
    const authenticatedGet = await app.inject({
      headers: { authorization: `Bearer ${accessToken}` },
      method: "GET",
      url: "/mcp",
    });
    assert.equal(authenticatedGet.statusCode, 405);
    assert.equal(authenticatedGet.headers.allow, "POST");

    const del = await app.inject({ method: "DELETE", url: "/mcp" });
    assert.equal(del.statusCode, 405);
  });

  it("advertises create/get/update tool names and CRM prompts", async () => {
    const accessToken = await authenticatedSession();

    const discovered = await app.inject({
      headers: mcpHeaders(accessToken, { "mcp-method": "server/discover" }),
      method: "POST",
      payload: {
        id: 0,
        jsonrpc: "2.0",
        method: "server/discover",
        params: {
          _meta: mcpRequestMeta(),
        },
      },
      url: "/mcp",
    });
    assert.equal(discovered.statusCode, 200, discovered.body);
    const discoverResult = (discovered.json() as { result?: { instructions?: string } }).result;
    assert.equal(discoverResult?.instructions, MCP_SERVER_INSTRUCTIONS);

    const listedTools: ListedTool[] = [];
    let toolsCursor: string | undefined;
    do {
      const tools = await app.inject({
        headers: mcpHeaders(accessToken, { "mcp-method": "tools/list" }),
        method: "POST",
        payload: {
          id: 1,
          jsonrpc: "2.0",
          method: "tools/list",
          params: {
            _meta: mcpRequestMeta(),
            ...(toolsCursor ? { cursor: toolsCursor } : {}),
          },
        },
        url: "/mcp",
      });
      assert.equal(tools.statusCode, 200, tools.body);
      const toolsResult = tools.json() as {
        result?: { nextCursor?: string; tools?: ListedTool[] };
      };
      listedTools.push(...(toolsResult.result?.tools ?? []));
      toolsCursor = toolsResult.result?.nextCursor;
    } while (toolsCursor);

    assert.deepEqual(
      listedTools.map((tool) => tool.name).toSorted((left, right) => left.localeCompare(right)),
      [...ASSISTANT_TOOL_NAMES],
    );

    for (const tool of listedTools) {
      assert.equal(typeof tool.title, "string", tool.name);
      assert.ok(tool.title, tool.name);
      assert.equal(typeof tool.annotations?.destructiveHint, "boolean", tool.name);
      assert.equal(typeof tool.annotations?.idempotentHint, "boolean", tool.name);
      assert.equal(typeof tool.annotations?.openWorldHint, "boolean", tool.name);
      assert.equal(typeof tool.annotations?.readOnlyHint, "boolean", tool.name);
    }
    const searchContacts = listedTools.find((tool) => tool.name === "search_contacts");
    assert.equal(searchContacts?.annotations?.readOnlyHint, true);
    assert.equal(searchContacts?.annotations?.destructiveHint, false);
    const deleteContact = listedTools.find((tool) => tool.name === "delete_contact");
    assert.equal(deleteContact?.annotations?.destructiveHint, true);
    assert.equal(deleteContact?.annotations?.readOnlyHint, false);

    const prompts = await app.inject({
      headers: mcpHeaders(accessToken, { "mcp-method": "prompts/list" }),
      method: "POST",
      payload: {
        id: 1,
        jsonrpc: "2.0",
        method: "prompts/list",
        params: { _meta: mcpRequestMeta() },
      },
      url: "/mcp",
    });
    assert.equal(prompts.statusCode, 200, prompts.body);
    const promptNames = (
      prompts.json() as { result?: { prompts?: { name: string }[] } }
    ).result?.prompts?.map((prompt) => prompt.name);
    assert.deepEqual(
      promptNames?.toSorted((left, right) => left.localeCompare(right)),
      EXPECTED_PROMPTS,
    );

    const skills = await app.inject({
      headers: mcpHeaders(accessToken, { "mcp-method": "skills/list" }),
      method: "POST",
      payload: {
        id: 2,
        jsonrpc: "2.0",
        method: "skills/list",
        params: { _meta: mcpRequestMeta() },
      },
      url: "/mcp",
    });
    assert.equal(skills.statusCode, 200, skills.body);
    const skillUris = (
      skills.json() as { result?: { skills?: { uri: string }[] } }
    ).result?.skills?.map((skill) => skill.uri);
    assert.deepEqual(skillUris, EXPECTED_SKILL_URIS);

    const skillFile = await app.inject({
      headers: mcpHeaders(accessToken, {
        "mcp-method": "resources/read",
        "mcp-name": "skill://bondery/catch-up/SKILL.md",
      }),
      method: "POST",
      payload: {
        id: 3,
        jsonrpc: "2.0",
        method: "resources/read",
        params: { _meta: mcpRequestMeta(), uri: "skill://bondery/catch-up/SKILL.md" },
      },
      url: "/mcp",
    });
    assert.equal(skillFile.statusCode, 200, skillFile.body);
    const skillText = (skillFile.json() as { result?: { contents?: { text?: string }[] } }).result
      ?.contents?.[0]?.text;
    assert.match(skillText ?? "", CATCH_UP_SKILL_FRONTMATTER_PATTERN);
    assert.match(skillText ?? "", MCP_SERVER_NOT_CONNECTED_PATTERN);
  });

  it("rejects MCP JWTs from non-CIMD or disabled clients", async () => {
    await upsertMcpPublicClient(MCP_NON_CIMD_CLIENT_ID, null);
    await upsertMcpPublicClient(MCP_DISABLE_CLIENT_ID, CIMD_DISCOVERY_ID);
    const user = await createTestUser("MCP Endpoint");
    createdUserIds.push(user.id);
    const sessionToken = await createNativeSession(user.id);

    const nonCimdToken = await mintMcpToken(app, sessionToken, MCP_NON_CIMD_CLIENT_ID, {
      scope: MCP_READ_SCOPE,
    });
    const nonCimd = await app.inject({
      headers: { authorization: `Bearer ${nonCimdToken}` },
      method: "GET",
      url: "/mcp",
    });
    assert.equal(nonCimd.statusCode, 401, nonCimd.body);
    assert.ok(nonCimd.headers["www-authenticate"]);

    const cimdToken = await mintMcpToken(app, sessionToken, MCP_DISABLE_CLIENT_ID, {
      scope: MCP_READ_SCOPE,
    });
    const live = await app.inject({
      headers: { authorization: `Bearer ${cimdToken}` },
      method: "GET",
      url: "/mcp",
    });
    assert.equal(live.statusCode, 405, live.body);

    await prisma.oauthClient.update({
      data: { disabled: true },
      where: { clientId: MCP_DISABLE_CLIENT_ID },
    });
    const disabled = await app.inject({
      headers: { authorization: `Bearer ${cimdToken}` },
      method: "GET",
      url: "/mcp",
    });
    assert.equal(disabled.statusCode, 401, disabled.body);
    assert.ok(disabled.headers["www-authenticate"]);
  });

  it("returns JSON-RPC 401 + WWW-Authenticate without a bearer", async () => {
    const response = await app.inject({
      headers: { "content-type": "application/json" },
      method: "POST",
      payload: { id: 1, jsonrpc: "2.0", method: "initialize", params: {} },
      url: "/mcp",
    });
    assert.equal(response.statusCode, 401);
    assert.ok(response.headers["www-authenticate"]);
    assert.ok(response.body.includes("jsonrpc"));
    assert.equal(response.body.includes('"type":'), false);
  });

  it("rejects MCP protocol 2025-11-25 (2026-07-28 only)", async () => {
    const accessToken = await authenticatedSession();
    const response = await app.inject({
      headers: {
        accept: "application/json, text/event-stream",
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
        "mcp-protocol-version": "2025-11-25",
      },
      method: "POST",
      payload: {
        id: 0,
        jsonrpc: "2.0",
        method: "initialize",
        params: {
          capabilities: {},
          clientInfo: { name: "legacy-client", version: "0" },
          protocolVersion: "2025-11-25",
        },
      },
      url: "/mcp",
    });
    assert.ok(
      response.body.includes("Unsupported protocol version"),
      `expected 2026-only reject, got: ${response.body}`,
    );
    assert.ok(response.body.includes("2025-11-25"), response.body);
    assert.ok(response.body.includes("2026-07-28"), response.body);
  });

  it("rejects API keys on /mcp", async () => {
    const response = await app.inject({
      headers: {
        authorization: "Bearer bnd_live_not-a-real-key",
        "content-type": "application/json",
      },
      method: "POST",
      payload: { id: 1, jsonrpc: "2.0", method: "ping" },
      url: "/mcp",
    });
    assert.equal(response.statusCode, 401);
    assert.ok(response.headers["www-authenticate"]);
  });
});
