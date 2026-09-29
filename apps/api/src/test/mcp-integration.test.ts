/**
 * MCP HTTP route + tool isolation. Requires the same Postgres + migrate
 * setup as `test:auth` (`pnpm run test:auth -w api`).
 */
// biome-ignore-all lint/style/noExcessiveLinesPerFile: MCP HTTP + OAuth tool isolation share one Postgres Fastify suite
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { prisma } from "@bondery/db";
import { generateId } from "@bondery/helpers/ids";
import {
  bySocialLookupResponseSchema,
  contactResponseSchema,
  createContactResponseSchema,
  groupResponseSchema,
  importantDatesListResponseSchema,
  interactionResponseSchema,
  messageResponseSchema,
  tagResponseSchema,
} from "@bondery/schemas";
import type { FastifyInstance } from "fastify";
import { loadTestEnv } from "./load-test-env.js";

loadTestEnv();

const { createTestApp } = await import("./create-test-app.js");
const { MCP_OAUTH_SCOPES, resolveMcpResourceIdentifier, resolveMcpResourceIdentifiers } =
  await import("../lib/auth/index.js");
const { provisionNewUser } = await import("../lib/auth/provision-new-user.js");
const { upsertMcpResources } = await import("../lib/bootstrap/provision-oauth-clients.js");
const { MCP_SERVER_INSTRUCTIONS } = await import("../routes/mcp/instructions.js");
const { ASSISTANT_TOOL_NAMES } = await import("../services/assistant-tools/catalog.js");

const WEBAPP_URL = (process.env.BONDERY_PUBLIC_WEBAPP_URL ?? "").replace(/\/+$/, "");
const REDIRECT_URI = `${WEBAPP_URL}/auth/oauth-callback`;
const MCP_RESOURCE = resolveMcpResourceIdentifier();
const MCP_CLIENT_ID = "mcp-route-integration-client";
const MCP_SCOPE = "openid profile email offline_access mcp:read mcp:write";
const MCP_READ_SCOPE = "openid profile email offline_access mcp:read";

function base64url(input: Buffer): string {
  return input.toString("base64url");
}

function generatePkcePair(): { verifier: string; challenge: string } {
  const verifier = base64url(randomBytes(32));
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { challenge, verifier };
}

async function createTestUser(): Promise<{ id: string; email: string }> {
  const id = generateId();
  const email = `mcp-integration-${id}@example.test`;
  await prisma.user.create({
    data: { email, emailVerified: true, id, name: "MCP Integration User" },
  });
  await provisionNewUser({ name: "MCP Integration User", userId: id });
  return { email, id };
}

async function createNativeSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await prisma.session.create({
    data: {
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      token,
      userId,
    },
  });
  return token;
}

async function upsertClientResource(clientId: string, resourceId: string): Promise<void> {
  const existing = await prisma.oauthClientResource.findFirst({ where: { clientId, resourceId } });
  if (existing) {
    return;
  }
  await prisma.oauthClientResource.create({
    data: { clientId, id: generateId(), resourceId },
  });
}

async function provisionMcpClient(): Promise<void> {
  await prisma.oauthClient.upsert({
    create: {
      clientId: MCP_CLIENT_ID,
      clientSecret: null,
      grantTypes: ["authorization_code", "refresh_token"],
      id: generateId(),
      name: "MCP route test client",
      public: true,
      redirectUris: [REDIRECT_URI],
      requirePKCE: true,
      responseTypes: ["code"],
      scopes: [...MCP_OAUTH_SCOPES],
      skipConsent: true,
      tokenEndpointAuthMethod: "none",
      type: "user-agent-based",
    },
    update: {
      disabled: false,
      redirectUris: [REDIRECT_URI],
      scopes: [...MCP_OAUTH_SCOPES],
      skipConsent: true,
    },
    where: { clientId: MCP_CLIENT_ID },
  });
  const identifiers = resolveMcpResourceIdentifiers();
  for (const resourceId of identifiers) {
    await upsertClientResource(MCP_CLIENT_ID, resourceId);
  }
}

function extractCode(location: string): string {
  const code = new URL(location).searchParams.get("code");
  assert.ok(code, `expected code in ${location}`);
  return code;
}

async function mintMcpToken(
  app: FastifyInstance,
  sessionToken: string,
  scope = MCP_SCOPE,
): Promise<string> {
  const { challenge, verifier } = generatePkcePair();
  const authorize = await app.inject({
    headers: { authorization: `Bearer ${sessionToken}` },
    method: "GET",
    url: (() => {
      const url = new URL("http://test/auth/oauth2/authorize");
      url.searchParams.set("response_type", "code");
      url.searchParams.set("client_id", MCP_CLIENT_ID);
      url.searchParams.set("redirect_uri", REDIRECT_URI);
      url.searchParams.set("code_challenge", challenge);
      url.searchParams.set("code_challenge_method", "S256");
      url.searchParams.set("state", "mcp-tools");
      url.searchParams.set("scope", scope);
      url.searchParams.set("resource", MCP_RESOURCE);
      return `${url.pathname}?${url.searchParams.toString()}`;
    })(),
  });
  assert.equal(authorize.statusCode, 302, authorize.body);
  const token = await app.inject({
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
    payload: new URLSearchParams({
      client_id: MCP_CLIENT_ID,
      code: extractCode(authorize.headers.location as string),
      code_verifier: verifier,
      grant_type: "authorization_code",
      redirect_uri: REDIRECT_URI,
      resource: MCP_RESOURCE,
    }).toString(),
    url: "/auth/oauth2/token",
  });
  assert.equal(token.statusCode, 200, token.body);
  return (token.json() as { access_token: string }).access_token;
}

const MCP_PROTOCOL_VERSION = "2026-07-28";

function mcpRequestMeta(): Record<string, unknown> {
  return {
    "io.modelcontextprotocol/clientCapabilities": {
      elicitation: { form: {} },
    },
    "io.modelcontextprotocol/clientInfo": { name: "bondery-mcp-test", version: "0" },
    "io.modelcontextprotocol/protocolVersion": MCP_PROTOCOL_VERSION,
  };
}

function mcpHeaders(accessToken: string, extra?: Record<string, string>) {
  return {
    accept: "application/json, text/event-stream",
    authorization: `Bearer ${accessToken}`,
    "content-type": "application/json",
    "mcp-protocol-version": MCP_PROTOCOL_VERSION,
    ...extra,
  };
}

async function callTool(
  app: FastifyInstance,
  accessToken: string,
  name: string,
  args: Record<string, unknown>,
  options?: {
    id?: number;
    inputResponses?: Record<string, unknown>;
    requestState?: string;
  },
) {
  return app.inject({
    headers: mcpHeaders(accessToken, { "mcp-method": "tools/call", "mcp-name": name }),
    method: "POST",
    payload: {
      id: options?.id ?? 1,
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        _meta: mcpRequestMeta(),
        arguments: args,
        name,
        ...(options?.inputResponses ? { inputResponses: options.inputResponses } : {}),
        ...(options?.requestState !== undefined ? { requestState: options.requestState } : {}),
      },
    },
    url: "/mcp",
  });
}

function mcpCallResult(response: { json: () => unknown }) {
  return (response.json() as { result?: Record<string, unknown> }).result;
}

function mcpStructuredContent(response: {
  json: () => unknown;
}): Record<string, unknown> | undefined {
  const content = mcpCallResult(response)?.structuredContent;
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return undefined;
  }
  return content as Record<string, unknown>;
}

function deleteConfirmResponses(
  action: "accept" | "cancel" | "decline",
  confirm = true,
): Record<string, unknown> {
  if (action === "accept") {
    return { confirm: { action: "accept", content: { confirm } } };
  }
  return { confirm: { action } };
}

function tamperMcpRequestState(requestState: unknown): string {
  const value = String(requestState ?? "");
  const parts = value.split(".");
  const signature = parts[2] ?? "";
  if (signature.length === 0) {
    return `${value}x`;
  }
  const flipped = signature.startsWith("A") ? "B" : "A";
  return `${parts[0]}.${parts[1]}.${flipped}${signature.slice(1)}`;
}

describe("MCP HTTP endpoint", () => {
  let app: FastifyInstance;
  const createdUserIds: string[] = [];

  before(async () => {
    await upsertMcpResources();
    await provisionMcpClient();
    app = await createTestApp();
  });

  after(async () => {
    await app.close();
    await prisma.oauthAccessToken.deleteMany({ where: { clientId: MCP_CLIENT_ID } });
    await prisma.oauthRefreshToken.deleteMany({ where: { clientId: MCP_CLIENT_ID } });
    await prisma.oauthClientResource.deleteMany({ where: { clientId: MCP_CLIENT_ID } });
    await prisma.oauthClient.deleteMany({ where: { clientId: MCP_CLIENT_ID } });
    if (createdUserIds.length > 0) {
      await prisma.oauthAccessToken.deleteMany({ where: { userId: { in: createdUserIds } } });
      await prisma.oauthRefreshToken.deleteMany({ where: { userId: { in: createdUserIds } } });
      await prisma.oauthConsent.deleteMany({ where: { userId: { in: createdUserIds } } });
      await prisma.people.deleteMany({ where: { userId: { in: createdUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
  });

  it("rejects GET and DELETE with 405", async () => {
    const get = await app.inject({ method: "GET", url: "/mcp" });
    assert.equal(get.statusCode, 405);
    const del = await app.inject({ method: "DELETE", url: "/mcp" });
    assert.equal(del.statusCode, 405);
  });

  it("advertises create/get/update tool names and CRM prompts", async () => {
    const user = await createTestUser();
    createdUserIds.push(user.id);
    const accessToken = await mintMcpToken(app, await createNativeSession(user.id));

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

    const listedTools: {
      annotations?: {
        destructiveHint?: boolean;
        idempotentHint?: boolean;
        openWorldHint?: boolean;
        readOnlyHint?: boolean;
      };
      name: string;
      title?: string;
    }[] = [];
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
        result?: {
          nextCursor?: string;
          tools?: {
            annotations?: {
              destructiveHint?: boolean;
              idempotentHint?: boolean;
              openWorldHint?: boolean;
              readOnlyHint?: boolean;
            };
            name: string;
            title?: string;
          }[];
        };
      };
      listedTools.push(...(toolsResult.result?.tools ?? []));
      toolsCursor = toolsResult.result?.nextCursor;
    } while (toolsCursor);
    const toolNames = listedTools.map((tool) => tool.name);
    assert.deepEqual(toolNames.toSorted(), [...ASSISTANT_TOOL_NAMES]);

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
    assert.deepEqual(promptNames?.toSorted(), [
      "brief_before_meeting",
      "catch_up_on_contact",
      "organize_contact",
      "reach_out_today",
      "record_interaction",
      "save_new_contact",
    ]);
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
    const user = await createTestUser();
    createdUserIds.push(user.id);
    const accessToken = await mintMcpToken(app, await createNativeSession(user.id));
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

  it("scopes write tools behind mcp:write and isolates contacts by token sub", async () => {
    const owner = await createTestUser();
    const other = await createTestUser();
    createdUserIds.push(owner.id, other.id);
    const ownerSession = await createNativeSession(owner.id);
    const otherSession = await createNativeSession(other.id);

    const readToken = await mintMcpToken(app, ownerSession, MCP_READ_SCOPE);
    const writeDenied = await callTool(app, readToken, "create_contact", { firstName: "Ada" });
    assert.equal(
      writeDenied.statusCode,
      403,
      `mcp:read must step up for create_contact: ${writeDenied.body}`,
    );
    assert.ok(String(writeDenied.headers["www-authenticate"] ?? "").includes("insufficient_scope"));

    const writeDeniedWithoutNameHeader = await app.inject({
      headers: mcpHeaders(readToken, { "mcp-method": "tools/call" }),
      method: "POST",
      payload: {
        id: 1,
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          _meta: mcpRequestMeta(),
          arguments: { firstName: "Ada" },
          name: "create_contact",
        },
      },
      url: "/mcp",
    });
    assert.equal(
      writeDeniedWithoutNameHeader.statusCode,
      403,
      `omitted Mcp-Name must still step up from JSON-RPC name: ${writeDeniedWithoutNameHeader.body}`,
    );

    const ownerPerson = await prisma.people.create({
      data: {
        firstName: "Owned",
        lastName: "Contact",
        userId: owner.id,
      },
    });

    const writeToken = await mintMcpToken(app, ownerSession);
    const created = await callTool(app, writeToken, "create_contact", { firstName: "Ada" });
    assert.equal(created.statusCode, 200, created.body);
    const createdContent = mcpStructuredContent(created);
    assert.ok(createdContent, created.body);
    assert.equal(createContactResponseSchema.parse(createdContent).contact.firstName, "Ada");

    const otherToken = await mintMcpToken(app, otherSession);
    const leaked = await callTool(app, otherToken, "get_contact", { personId: ownerPerson.id });
    assert.equal(leaked.statusCode, 200, leaked.body);
    assert.equal(mcpCallResult(leaked)?.isError, true, leaked.body);
    assert.equal(
      (mcpStructuredContent(leaked)?.error as { code?: string } | undefined)?.code,
      "contact_not_found",
      leaked.body,
    );

    const leakedTags = await callTool(app, otherToken, "get_contact_tags", {
      personId: ownerPerson.id,
    });
    assert.equal(leakedTags.statusCode, 200, leakedTags.body);
    assert.equal(mcpCallResult(leakedTags)?.isError, true, leakedTags.body);
    assert.equal(
      (mcpStructuredContent(leakedTags)?.error as { code?: string } | undefined)?.code,
      "contact_not_found",
      leakedTags.body,
    );
  });

  it("gets and updates owned interactions and isolates by token sub", async () => {
    const owner = await createTestUser();
    const other = await createTestUser();
    createdUserIds.push(owner.id, other.id);
    const ownerSession = await createNativeSession(owner.id);
    const otherSession = await createNativeSession(other.id);

    const ownerPerson = await prisma.people.create({
      data: {
        firstName: "Owned",
        lastName: "Contact",
        userId: owner.id,
      },
    });
    const interaction = await prisma.interaction.create({
      data: {
        date: new Date("2026-03-01T00:00:00.000Z"),
        description: "Talked about shipping",
        title: "Coffee",
        type: "Coffee",
        userId: owner.id,
      },
    });
    await prisma.interactionParticipant.create({
      data: {
        interactionId: interaction.id,
        personId: ownerPerson.id,
      },
    });

    const readToken = await mintMcpToken(app, ownerSession, MCP_READ_SCOPE);
    const got = await callTool(app, readToken, "get_interaction", {
      interactionId: interaction.id,
    });
    assert.equal(got.statusCode, 200, got.body);
    const gotInteraction = mcpStructuredContent(got);
    assert.ok(gotInteraction, got.body);
    assert.equal(interactionResponseSchema.parse(gotInteraction).interaction.id, interaction.id);
    assert.ok(got.body.includes("Coffee"), got.body);

    const writeDenied = await callTool(app, readToken, "update_interaction", {
      interactionId: interaction.id,
      title: "Not allowed",
    });
    assert.equal(
      writeDenied.statusCode,
      403,
      `mcp:read must step up for update_interaction: ${writeDenied.body}`,
    );

    const otherToken = await mintMcpToken(app, otherSession);
    const leaked = await callTool(app, otherToken, "get_interaction", {
      interactionId: interaction.id,
    });
    assert.equal(leaked.statusCode, 200, leaked.body);
    assert.equal(mcpCallResult(leaked)?.isError, true, leaked.body);
    assert.equal(
      (mcpStructuredContent(leaked)?.error as { code?: string } | undefined)?.code,
      "interaction_not_found",
      leaked.body,
    );

    const foreignUpdate = await callTool(app, otherToken, "update_interaction", {
      interactionId: interaction.id,
      title: "Hijack",
    });
    assert.equal(foreignUpdate.statusCode, 200, foreignUpdate.body);
    assert.ok(
      foreignUpdate.body.includes("Interaction not found") ||
        foreignUpdate.body.includes('"isError":true'),
      `foreign interaction must not update: ${foreignUpdate.body}`,
    );
    const unchanged = await prisma.interaction.findUnique({ where: { id: interaction.id } });
    assert.equal(unchanged?.title, "Coffee");

    const writeToken = await mintMcpToken(app, ownerSession);
    const updated = await callTool(app, writeToken, "update_interaction", {
      interactionId: interaction.id,
      title: "Follow-up coffee",
    });
    assert.equal(updated.statusCode, 200, updated.body);
    assert.ok(updated.body.includes("Follow-up coffee"), updated.body);
    const stored = await prisma.interaction.findUnique({ where: { id: interaction.id } });
    assert.equal(stored?.title, "Follow-up coffee");
  });

  it("scopes org writes behind mcp:write and isolates groups, tags, and relationships", async () => {
    const owner = await createTestUser();
    const other = await createTestUser();
    createdUserIds.push(owner.id, other.id);
    const ownerSession = await createNativeSession(owner.id);
    const otherSession = await createNativeSession(other.id);

    const readToken = await mintMcpToken(app, ownerSession, MCP_READ_SCOPE);
    const writeDenied = await callTool(app, readToken, "create_group", {
      color: "#3b82f6",
      emoji: "👋",
      label: "Friends",
    });
    assert.equal(
      writeDenied.statusCode,
      403,
      `mcp:read must step up for create_group: ${writeDenied.body}`,
    );
    assert.ok(String(writeDenied.headers["www-authenticate"] ?? "").includes("insufficient_scope"));

    const ownerPerson = await prisma.people.create({
      data: { firstName: "Ada", lastName: "Owner", userId: owner.id },
    });
    const ownerRelated = await prisma.people.create({
      data: { firstName: "Bob", lastName: "Related", userId: owner.id },
    });
    const otherPerson = await prisma.people.create({
      data: { firstName: "Eve", lastName: "Other", userId: other.id },
    });
    const otherRelated = await prisma.people.create({
      data: { firstName: "Ivy", lastName: "OtherRel", userId: other.id },
    });
    const otherGroup = await prisma.group.create({
      data: { color: "#ef4444", emoji: "🚫", label: "Secret", userId: other.id },
    });
    const otherTag = await prisma.tag.create({
      data: { color: "#ef4444", label: "secret", userId: other.id },
    });
    const otherRelationship = await prisma.peopleRelationship.create({
      data: {
        relationshipType: "friend",
        sourcePersonId: otherPerson.id,
        targetPersonId: otherRelated.id,
        userId: other.id,
      },
    });

    const writeToken = await mintMcpToken(app, ownerSession);
    const createdGroup = await callTool(app, writeToken, "create_group", {
      color: "#3b82f6",
      emoji: "👋",
      label: "Friends",
    });
    assert.equal(createdGroup.statusCode, 200, createdGroup.body);
    assert.equal(createdGroup.body.includes('"isError":true'), false, createdGroup.body);
    const createdGroupContent = mcpStructuredContent(createdGroup);
    assert.ok(createdGroupContent, createdGroup.body);
    const groupId = groupResponseSchema.parse(createdGroupContent).group.id;

    const added = await callTool(app, writeToken, "create_group_membership", {
      groupId,
      personIds: [ownerPerson.id],
    });
    assert.equal(added.statusCode, 200, added.body);
    assert.ok(added.body.includes('"addedCount":1'), added.body);

    const unknownMembership = await callTool(app, writeToken, "delete_group_membership", {
      groupId,
      personIds: [generateId()],
    });
    assert.equal(unknownMembership.statusCode, 200, unknownMembership.body);
    assert.notEqual(mcpCallResult(unknownMembership)?.resultType, "input_required");
    assert.ok(
      unknownMembership.body.includes("Contact not found") ||
        unknownMembership.body.includes('"isError":true'),
      `unknown personId must not elicit: ${unknownMembership.body}`,
    );

    const foreignMember = await callTool(app, writeToken, "create_group_membership", {
      groupId,
      personIds: [otherPerson.id],
    });
    assert.equal(foreignMember.statusCode, 200, foreignMember.body);
    assert.ok(
      foreignMember.body.includes("Contact not found") ||
        foreignMember.body.includes('"isError":true'),
      `foreign person must not join group: ${foreignMember.body}`,
    );
    const leakedMembership = await prisma.peopleGroup.findFirst({
      where: { personId: otherPerson.id },
    });
    assert.equal(leakedMembership, null);

    const removedAsk = await callTool(app, writeToken, "delete_group_membership", {
      groupId,
      personIds: [ownerPerson.id],
    });
    assert.equal(removedAsk.statusCode, 200, removedAsk.body);
    const removedAskResult = mcpCallResult(removedAsk);
    assert.equal(removedAskResult?.resultType, "input_required", removedAsk.body);
    assert.equal(typeof removedAskResult?.requestState, "string", removedAsk.body);

    const removed = await callTool(
      app,
      writeToken,
      "delete_group_membership",
      { groupId, personIds: [ownerPerson.id] },
      {
        id: 2,
        inputResponses: deleteConfirmResponses("accept"),
        requestState: removedAskResult?.requestState as string,
      },
    );
    assert.equal(removed.statusCode, 200, removed.body);
    assert.ok(removed.body.includes('"removedCount":1'), removed.body);

    const foreignGroup = await callTool(app, writeToken, "get_group", { groupId: otherGroup.id });
    assert.equal(foreignGroup.statusCode, 200, foreignGroup.body);
    assert.equal(mcpCallResult(foreignGroup)?.isError, true, foreignGroup.body);
    assert.equal(
      (mcpStructuredContent(foreignGroup)?.error as { code?: string } | undefined)?.code,
      "group_not_found",
      foreignGroup.body,
    );

    const createdTag = await callTool(app, writeToken, "create_tag", { label: "vip" });
    assert.equal(createdTag.statusCode, 200, createdTag.body);
    const createdTagContent = mcpStructuredContent(createdTag);
    assert.ok(createdTagContent, createdTag.body);
    const tagId = tagResponseSchema.parse(createdTagContent).tag.id;

    const tagged = await callTool(app, writeToken, "create_tag_membership", {
      personIds: [ownerPerson.id],
      tagId,
    });
    assert.equal(tagged.statusCode, 200, tagged.body);

    const foreignTag = await callTool(app, writeToken, "get_tag", { tagId: otherTag.id });
    assert.equal(foreignTag.statusCode, 200, foreignTag.body);
    assert.equal(mcpCallResult(foreignTag)?.isError, true, foreignTag.body);
    assert.equal(
      (mcpStructuredContent(foreignTag)?.error as { code?: string } | undefined)?.code,
      "tag_not_found",
      foreignTag.body,
    );

    const relationship = await callTool(app, writeToken, "create_relationship", {
      personId: ownerPerson.id,
      relatedPersonId: ownerRelated.id,
      relationshipType: "friend",
    });
    assert.equal(relationship.statusCode, 200, relationship.body);

    const otherToken = await mintMcpToken(app, otherSession);
    const leakedRelationship = await callTool(app, otherToken, "get_relationships", {
      personId: ownerPerson.id,
    });
    assert.equal(leakedRelationship.statusCode, 200, leakedRelationship.body);
    assert.ok(
      leakedRelationship.body.includes("Contact not found") ||
        leakedRelationship.body.includes('"isError":true'),
      `foreign person relationships must not leak: ${leakedRelationship.body}`,
    );

    const foreignRelationship = await callTool(app, writeToken, "delete_relationship", {
      personId: otherPerson.id,
      relationshipId: otherRelationship.id,
    });
    assert.equal(foreignRelationship.statusCode, 200, foreignRelationship.body);
    assert.ok(
      foreignRelationship.body.includes("not found") ||
        foreignRelationship.body.includes('"isError":true'),
      `foreign relationship must not delete: ${foreignRelationship.body}`,
    );

    const kitDenied = await callTool(app, readToken, "update_keep_in_touch", {
      keepFrequencyDays: 30,
      personId: ownerPerson.id,
    });
    assert.equal(
      kitDenied.statusCode,
      403,
      `mcp:read must step up for update_keep_in_touch: ${kitDenied.body}`,
    );

    const kit = await callTool(app, writeToken, "update_keep_in_touch", {
      keepFrequencyDays: 30,
      personId: ownerPerson.id,
    });
    assert.equal(kit.statusCode, 200, kit.body);

    const gotContact = await callTool(app, writeToken, "get_contact", { personId: ownerPerson.id });
    assert.equal(gotContact.statusCode, 200, gotContact.body);
    const gotContactContent = mcpStructuredContent(gotContact);
    assert.ok(gotContactContent, gotContact.body);
    assert.ok("contact" in gotContactContent, gotContact.body);
    assert.equal(contactResponseSchema.parse(gotContactContent).contact.keepFrequencyDays, 30);
  });

  it("gates delete_contact and delete_interaction behind protocol confirm", async () => {
    const owner = await createTestUser();
    const other = await createTestUser();
    createdUserIds.push(owner.id, other.id);
    const ownerSession = await createNativeSession(owner.id);
    const otherSession = await createNativeSession(other.id);

    const ownerPerson = await prisma.people.create({
      data: { firstName: "Ada", lastName: "Owner", userId: owner.id },
    });
    const keeperPerson = await prisma.people.create({
      data: { firstName: "Kai", lastName: "Keep", userId: owner.id },
    });
    const interaction = await prisma.interaction.create({
      data: {
        date: new Date("2026-03-01T00:00:00.000Z"),
        title: "Coffee",
        type: "Coffee",
        userId: owner.id,
      },
    });
    await prisma.interactionParticipant.create({
      data: { interactionId: interaction.id, personId: keeperPerson.id },
    });
    const otherPerson = await prisma.people.create({
      data: { firstName: "Eve", lastName: "Other", userId: other.id },
    });
    const otherInteraction = await prisma.interaction.create({
      data: {
        date: new Date("2026-04-01T00:00:00.000Z"),
        title: "Secret",
        type: "Call",
        userId: other.id,
      },
    });

    const readToken = await mintMcpToken(app, ownerSession, MCP_READ_SCOPE);
    const writeDenied = await callTool(app, readToken, "delete_contact", {
      personId: ownerPerson.id,
    });
    assert.equal(
      writeDenied.statusCode,
      403,
      `mcp:read must step up for delete_contact: ${writeDenied.body}`,
    );

    const writeToken = await mintMcpToken(app, ownerSession);
    const unknownContact = await callTool(app, writeToken, "delete_contact", {
      personId: generateId(),
    });
    assert.equal(unknownContact.statusCode, 200, unknownContact.body);
    assert.notEqual(mcpCallResult(unknownContact)?.resultType, "input_required");
    assert.ok(
      unknownContact.body.includes("Contact not found") ||
        unknownContact.body.includes('"isError":true'),
      `unknown personId must not elicit: ${unknownContact.body}`,
    );
    assert.equal(mcpCallResult(unknownContact)?.isError, true, unknownContact.body);
    const unknownError = mcpStructuredContent(unknownContact)?.error;
    assert.ok(unknownError && typeof unknownError === "object", unknownContact.body);
    assert.equal(
      (unknownError as { code?: string }).code,
      "contact_not_found",
      unknownContact.body,
    );

    const firstDelete = await callTool(app, writeToken, "delete_contact", {
      personId: ownerPerson.id,
    });
    assert.equal(firstDelete.statusCode, 200, firstDelete.body);
    const firstResult = mcpCallResult(firstDelete);
    assert.equal(firstResult?.resultType, "input_required", firstDelete.body);
    assert.equal(typeof firstResult?.requestState, "string", firstDelete.body);
    assert.ok(
      await prisma.people.findFirst({ where: { id: ownerPerson.id, userId: owner.id } }),
      "contact must remain until confirm",
    );

    const declined = await callTool(
      app,
      writeToken,
      "delete_contact",
      { personId: ownerPerson.id },
      {
        id: 2,
        inputResponses: deleteConfirmResponses("decline"),
        requestState: firstResult?.requestState as string,
      },
    );
    assert.equal(declined.statusCode, 200, declined.body);
    assert.ok(declined.body.includes('"cancelled":true'), declined.body);
    assert.ok(await prisma.people.findFirst({ where: { id: ownerPerson.id, userId: owner.id } }));

    const tampered = await callTool(
      app,
      writeToken,
      "delete_contact",
      { personId: ownerPerson.id },
      {
        id: 3,
        inputResponses: deleteConfirmResponses("accept"),
        requestState: tamperMcpRequestState(firstResult?.requestState),
      },
    );
    assert.equal(tampered.statusCode, 200, tampered.body);
    assert.notEqual(mcpCallResult(tampered)?.resultType, "input_required");
    assert.ok(tampered.body.includes("Invalid or expired confirmation"), tampered.body);
    assert.ok(await prisma.people.findFirst({ where: { id: ownerPerson.id, userId: owner.id } }));

    const accepted = await callTool(
      app,
      writeToken,
      "delete_contact",
      { personId: ownerPerson.id },
      {
        id: 4,
        inputResponses: deleteConfirmResponses("accept"),
        requestState: firstResult?.requestState as string,
      },
    );
    assert.equal(accepted.statusCode, 200, accepted.body);
    const acceptedContent = mcpStructuredContent(accepted);
    assert.ok(acceptedContent, accepted.body);
    assert.deepEqual(messageResponseSchema.parse(acceptedContent), {
      message: "Contact deleted successfully",
    });
    assert.equal(
      await prisma.people.findFirst({ where: { id: ownerPerson.id, userId: owner.id } }),
      null,
    );

    const otherToken = await mintMcpToken(app, otherSession);
    const foreignContact = await callTool(app, otherToken, "delete_contact", {
      personId: ownerPerson.id,
    });
    assert.equal(foreignContact.statusCode, 200, foreignContact.body);
    assert.notEqual(mcpCallResult(foreignContact)?.resultType, "input_required");
    assert.ok(
      foreignContact.body.includes("Contact not found") ||
        foreignContact.body.includes('"isError":true'),
      `foreign contact must not elicit: ${foreignContact.body}`,
    );

    const foreignLiving = await callTool(app, writeToken, "delete_contact", {
      personId: otherPerson.id,
    });
    assert.equal(foreignLiving.statusCode, 200, foreignLiving.body);
    assert.notEqual(mcpCallResult(foreignLiving)?.resultType, "input_required");
    assert.ok(
      foreignLiving.body.includes("Contact not found") ||
        foreignLiving.body.includes('"isError":true'),
      `foreign personId must not elicit: ${foreignLiving.body}`,
    );
    assert.ok(await prisma.people.findFirst({ where: { id: otherPerson.id, userId: other.id } }));

    const firstInteraction = await callTool(app, writeToken, "delete_interaction", {
      interactionId: interaction.id,
    });
    assert.equal(firstInteraction.statusCode, 200, firstInteraction.body);
    const interactionAsk = mcpCallResult(firstInteraction);
    assert.equal(interactionAsk?.resultType, "input_required", firstInteraction.body);
    const interactionDeleted = await callTool(
      app,
      writeToken,
      "delete_interaction",
      { interactionId: interaction.id },
      {
        id: 2,
        inputResponses: deleteConfirmResponses("accept"),
        requestState: interactionAsk?.requestState as string,
      },
    );
    assert.equal(interactionDeleted.statusCode, 200, interactionDeleted.body);
    assert.equal(await prisma.interaction.findUnique({ where: { id: interaction.id } }), null);

    const unknownInteraction = await callTool(app, writeToken, "delete_interaction", {
      interactionId: generateId(),
    });
    assert.equal(unknownInteraction.statusCode, 200, unknownInteraction.body);
    assert.notEqual(mcpCallResult(unknownInteraction)?.resultType, "input_required");
    assert.ok(
      unknownInteraction.body.includes("Interaction not found") ||
        unknownInteraction.body.includes('"isError":true'),
      `unknown interactionId must not elicit: ${unknownInteraction.body}`,
    );

    const foreignInteraction = await callTool(app, writeToken, "delete_interaction", {
      interactionId: otherInteraction.id,
    });
    assert.equal(foreignInteraction.statusCode, 200, foreignInteraction.body);
    assert.notEqual(mcpCallResult(foreignInteraction)?.resultType, "input_required");
    assert.ok(
      foreignInteraction.body.includes("Interaction not found") ||
        foreignInteraction.body.includes('"isError":true'),
      `foreign interactionId must not elicit: ${foreignInteraction.body}`,
    );
    assert.ok(await prisma.interaction.findUnique({ where: { id: otherInteraction.id } }));
  });

  it("writes phones, socials, dates, and multi-participant interactions", async () => {
    const owner = await createTestUser();
    const other = await createTestUser();
    createdUserIds.push(owner.id, other.id);
    const ownerSession = await createNativeSession(owner.id);
    const writeToken = await mintMcpToken(app, ownerSession);
    const readToken = await mintMcpToken(app, ownerSession, MCP_READ_SCOPE);

    const created = await callTool(app, writeToken, "create_contact", {
      firstName: "Ada",
      instagram: "ada_lovelace",
      lastName: "Lovelace",
      phones: [{ preferred: true, prefix: "+1", type: "home", value: "5550100" }],
    });
    assert.equal(created.statusCode, 200, created.body);
    const createdContent = mcpStructuredContent(created);
    assert.ok(createdContent, created.body);
    const createdContact = createContactResponseSchema.parse(createdContent).contact;
    assert.equal(createdContact.instagram, "ada_lovelace");
    assert.equal(createdContact.phones?.[0]?.value, "5550100");

    const bySocial = await callTool(app, writeToken, "get_contact_by_social", {
      handle: "ada_lovelace",
      platform: "instagram",
    });
    assert.equal(bySocial.statusCode, 200, bySocial.body);
    const bySocialContent = mcpStructuredContent(bySocial);
    assert.ok(bySocialContent, bySocial.body);
    const lookup = bySocialLookupResponseSchema.parse(bySocialContent);
    assert.equal(lookup.exists, true);
    assert.equal(lookup.contact?.id, createdContact.id);

    const datesDenied = await callTool(app, readToken, "update_important_dates", {
      dates: [{ date: "1815-12-10", type: "birthday" }],
      personId: createdContact.id,
    });
    assert.equal(
      datesDenied.statusCode,
      403,
      `mcp:read must step up for update_important_dates: ${datesDenied.body}`,
    );

    const datesUpdated = await callTool(app, writeToken, "update_important_dates", {
      dates: [{ date: "1815-12-10", notifyDaysBefore: 7, type: "birthday" }],
      personId: createdContact.id,
    });
    assert.equal(datesUpdated.statusCode, 200, datesUpdated.body);
    const datesUpdatedContent = mcpStructuredContent(datesUpdated);
    assert.ok(datesUpdatedContent, datesUpdated.body);
    const replaced = importantDatesListResponseSchema.parse(datesUpdatedContent);
    assert.equal(replaced.dates.length, 1);
    assert.equal(replaced.dates[0]?.type, "birthday");

    const datesGot = await callTool(app, writeToken, "get_important_dates", {
      personId: createdContact.id,
    });
    assert.equal(datesGot.statusCode, 200, datesGot.body);
    const datesGotContent = mcpStructuredContent(datesGot);
    assert.ok(datesGotContent, datesGot.body);
    assert.equal(importantDatesListResponseSchema.parse(datesGotContent).dates.length, 1);

    const second = await prisma.people.create({
      data: { firstName: "Charles", lastName: "Babbage", userId: owner.id },
    });
    const foreign = await prisma.people.create({
      data: { firstName: "Eve", lastName: "Other", userId: other.id },
    });

    const interaction = await callTool(app, writeToken, "create_interaction", {
      date: "2026-03-15",
      participantIds: [createdContact.id, second.id],
      title: "Engine talk",
      type: "Meeting",
    });
    assert.equal(interaction.statusCode, 200, interaction.body);
    const interactionContent = mcpStructuredContent(interaction);
    assert.ok(interactionContent, interaction.body);
    const createdInteraction = interactionResponseSchema.parse(interactionContent).interaction;
    const participantIds = (
      createdInteraction.participants as { id?: string }[] | string[] | undefined
    )?.map((participant) =>
      typeof participant === "string" ? participant : (participant.id ?? ""),
    );
    assert.ok(participantIds?.includes(createdContact.id), interaction.body);
    assert.ok(participantIds?.includes(second.id), interaction.body);

    const foreignParticipant = await callTool(app, writeToken, "create_interaction", {
      date: "2026-03-16",
      participantIds: [createdContact.id, foreign.id],
      type: "Call",
    });
    assert.equal(foreignParticipant.statusCode, 200, foreignParticipant.body);
    assert.ok(
      foreignParticipant.body.includes("Contact not found") ||
        foreignParticipant.body.includes('"isError":true'),
      `foreign participant must be rejected: ${foreignParticipant.body}`,
    );
  });
});
