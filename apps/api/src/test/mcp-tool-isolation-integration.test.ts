/**
 * MCP tool scope and tenant isolation for contacts and interactions: `mcp:read` must step up
 * for writes, and a token must never read or write another user's rows.
 *
 * Delete confirmation lives in `mcp-delete-integration.test.ts`. Both need the same Postgres +
 * migrate setup as `test:auth` (`pnpm run test:auth -w api`).
 */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import {
  bySocialLookupResponseSchema,
  createContactResponseSchema,
  importantDatesListResponseSchema,
  interactionResponseSchema,
} from "@bondery/schemas";
import type { ToolSuite } from "./mcp-tool-suite.js";

const { closeToolSuite, createToolSuite, prisma } = await import("./mcp-tool-suite.js");
const { callTool, mcpCallResult, mcpStructuredContent } = await import("./mcp-test-harness.js");

const MCP_CLIENT_ID = "mcp-tools-client";
const MCP_CLIENT_IDS = [MCP_CLIENT_ID];

type ErrorBody = { code?: string } | undefined;

function errorCode(response: { json: () => unknown }): string | undefined {
  return (mcpStructuredContent(response)?.error as ErrorBody)?.code;
}

describe("mCP tool isolation", () => {
  let suite: ToolSuite;

  before(async () => {
    suite = await createToolSuite(MCP_CLIENT_ID);
  });

  after(async () => {
    await closeToolSuite(suite, MCP_CLIENT_IDS);
  });

  it("scopes write tools behind mcp:write and isolates contacts by token sub", async () => {
    const { app } = suite;
    const { otherToken, ownerId, ownerSession, ownerToken } = await suite.twoUsers();
    const readToken = await suite.readTokenFor(ownerSession);

    const writeDenied = await callTool(app, readToken, "create_contact", { firstName: "Ada" });
    assert.equal(
      writeDenied.statusCode,
      403,
      `mcp:read must step up for create_contact: ${writeDenied.body}`,
    );
    assert.ok(String(writeDenied.headers["www-authenticate"] ?? "").includes("insufficient_scope"));

    const writeDeniedWithoutNameHeader = await app.inject({
      headers: { authorization: `Bearer ${readToken}` },
      method: "POST",
      payload: {
        id: 1,
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
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
      data: { firstName: "Owned", lastName: "Contact", userId: ownerId },
    });

    const created = await callTool(app, ownerToken, "create_contact", { firstName: "Ada" });
    assert.equal(created.statusCode, 200, created.body);
    const createdContent = mcpStructuredContent(created);
    assert.ok(createdContent, created.body);
    assert.equal(createContactResponseSchema.parse(createdContent).contact.firstName, "Ada");

    const leaked = await callTool(app, otherToken, "get_contact", { personId: ownerPerson.id });
    assert.equal(leaked.statusCode, 200, leaked.body);
    assert.equal(mcpCallResult(leaked)?.isError, true, leaked.body);
    assert.equal(errorCode(leaked), "contact_not_found", leaked.body);

    const leakedTags = await callTool(app, otherToken, "get_contact_tags", {
      personId: ownerPerson.id,
    });
    assert.equal(leakedTags.statusCode, 200, leakedTags.body);
    assert.equal(mcpCallResult(leakedTags)?.isError, true, leakedTags.body);
    assert.equal(errorCode(leakedTags), "contact_not_found", leakedTags.body);
  });

  it("gets and updates owned interactions and isolates by token sub", async () => {
    const { app } = suite;
    const { otherToken, ownerId, ownerSession, ownerToken } = await suite.twoUsers();

    const ownerPerson = await prisma.people.create({
      data: { firstName: "Owned", lastName: "Contact", userId: ownerId },
    });
    const interaction = await prisma.interaction.create({
      data: {
        date: new Date("2026-03-01T00:00:00.000Z"),
        description: "Talked about shipping",
        title: "Coffee",
        type: "Coffee",
        userId: ownerId,
      },
    });
    await prisma.interactionParticipant.create({
      data: { interactionId: interaction.id, personId: ownerPerson.id },
    });

    const readToken = await suite.readTokenFor(ownerSession);
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

    const leaked = await callTool(app, otherToken, "get_interaction", {
      interactionId: interaction.id,
    });
    assert.equal(leaked.statusCode, 200, leaked.body);
    assert.equal(mcpCallResult(leaked)?.isError, true, leaked.body);
    assert.equal(errorCode(leaked), "interaction_not_found", leaked.body);

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

    const updated = await callTool(app, ownerToken, "update_interaction", {
      interactionId: interaction.id,
      title: "Follow-up coffee",
    });
    assert.equal(updated.statusCode, 200, updated.body);
    assert.ok(updated.body.includes("Follow-up coffee"), updated.body);
    const stored = await prisma.interaction.findUnique({ where: { id: interaction.id } });
    assert.equal(stored?.title, "Follow-up coffee");
  });

  it("writes phones, socials, dates, and multi-participant interactions", async () => {
    const { app } = suite;
    const { otherId, ownerId, ownerSession, ownerToken } = await suite.twoUsers();
    const readToken = await suite.readTokenFor(ownerSession);

    const created = await callTool(app, ownerToken, "create_contact", {
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

    const bySocial = await callTool(app, ownerToken, "get_contact_by_social", {
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

    const datesUpdated = await callTool(app, ownerToken, "update_important_dates", {
      dates: [{ date: "1815-12-10", notifyDaysBefore: 7, type: "birthday" }],
      personId: createdContact.id,
    });
    assert.equal(datesUpdated.statusCode, 200, datesUpdated.body);
    const datesUpdatedContent = mcpStructuredContent(datesUpdated);
    assert.ok(datesUpdatedContent, datesUpdated.body);
    const replaced = importantDatesListResponseSchema.parse(datesUpdatedContent);
    assert.equal(replaced.dates.length, 1);
    assert.equal(replaced.dates[0]?.type, "birthday");

    const datesGot = await callTool(app, ownerToken, "get_important_dates", {
      personId: createdContact.id,
    });
    assert.equal(datesGot.statusCode, 200, datesGot.body);
    const datesGotContent = mcpStructuredContent(datesGot);
    assert.ok(datesGotContent, datesGot.body);
    assert.equal(importantDatesListResponseSchema.parse(datesGotContent).dates.length, 1);

    const second = await prisma.people.create({
      data: { firstName: "Charles", lastName: "Babbage", userId: ownerId },
    });
    const foreign = await prisma.people.create({
      data: { firstName: "Eve", lastName: "Other", userId: otherId },
    });

    const interaction = await callTool(app, ownerToken, "create_interaction", {
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

    const foreignParticipant = await callTool(app, ownerToken, "create_interaction", {
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
