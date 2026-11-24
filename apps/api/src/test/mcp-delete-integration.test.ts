/**
 * MCP delete tools must ask for protocol confirmation before they remove anything, must reject a
 * tampered request state, and must never touch another user's rows.
 *
 * Needs the same Postgres + migrate setup as `test:auth` (`pnpm run test:auth -w api`).
 */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { messageResponseSchema } from "@bondery/schemas";
import { callTool, deleteConfirmResponses, tamperMcpRequestState } from "./mcp-test-harness.js";
import type { ToolSuite } from "./mcp-tool-suite.js";

const { closeToolSuite, createToolSuite, prisma } = await import("./mcp-tool-suite.js");
const { mcpCallResult, mcpStructuredContent } = await import("./mcp-test-harness.js");

const MCP_CLIENT_ID = "mcp-delete-client";
const MCP_CLIENT_IDS = [MCP_CLIENT_ID];

describe("mCP delete confirmation", () => {
  let suite: ToolSuite;

  before(async () => {
    suite = await createToolSuite(MCP_CLIENT_ID);
  });

  after(async () => {
    await closeToolSuite(suite, MCP_CLIENT_IDS);
  });

  it("gates delete_contact and delete_interaction behind protocol confirm", async () => {
    const { app } = suite;
    const { otherId, otherToken, ownerId, ownerSession, ownerToken } = await suite.twoUsers();
    const readToken = await suite.readTokenFor(ownerSession);

    const ownerPerson = await prisma.people.create({
      data: { firstName: "Ada", lastName: "Owner", userId: ownerId },
    });
    const keeperPerson = await prisma.people.create({
      data: { firstName: "Kai", lastName: "Keep", userId: ownerId },
    });
    const interaction = await prisma.interaction.create({
      data: {
        date: new Date("2026-03-01T00:00:00.000Z"),
        title: "Coffee",
        type: "Coffee",
        userId: ownerId,
      },
    });
    await prisma.interactionParticipant.create({
      data: { interactionId: interaction.id, personId: keeperPerson.id },
    });

    const otherPerson = await prisma.people.create({
      data: { firstName: "Eve", lastName: "Other", userId: otherId },
    });
    const otherInteraction = await prisma.interaction.create({
      data: {
        date: new Date("2026-04-01T00:00:00.000Z"),
        title: "Secret",
        type: "Call",
        userId: otherId,
      },
    });

    const writeDenied = await callTool(app, readToken, "delete_contact", {
      personId: ownerPerson.id,
    });
    assert.equal(
      writeDenied.statusCode,
      403,
      `mcp:read must step up for delete_contact: ${writeDenied.body}`,
    );

    const unknownContact = await callTool(app, ownerToken, "delete_contact", {
      personId: "018f5c3a-7b2e-7c1a-8d4e-0000000000ff",
    });
    assert.equal(unknownContact.statusCode, 200, unknownContact.body);
    assert.notEqual(mcpCallResult(unknownContact)?.resultType, "input_required");
    assert.equal(mcpCallResult(unknownContact)?.isError, true, unknownContact.body);

    const firstDelete = await callTool(app, ownerToken, "delete_contact", {
      personId: ownerPerson.id,
    });
    assert.equal(firstDelete.statusCode, 200, firstDelete.body);
    const firstResult = mcpCallResult(firstDelete);
    assert.equal(firstResult?.resultType, "input_required", firstDelete.body);
    assert.equal(typeof firstResult?.requestState, "string", firstDelete.body);
    assert.ok(
      await prisma.people.findFirst({ where: { id: ownerPerson.id, userId: ownerId } }),
      "contact must remain until confirm",
    );

    const declined = await callTool(
      app,
      ownerToken,
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
    assert.ok(await prisma.people.findFirst({ where: { id: ownerPerson.id, userId: ownerId } }));

    const tampered = await callTool(
      app,
      ownerToken,
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
    assert.ok(await prisma.people.findFirst({ where: { id: ownerPerson.id, userId: ownerId } }));

    const accepted = await callTool(
      app,
      ownerToken,
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
      await prisma.people.findFirst({ where: { id: ownerPerson.id, userId: ownerId } }),
      null,
    );

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

    const foreignLiving = await callTool(app, ownerToken, "delete_contact", {
      personId: otherPerson.id,
    });
    assert.equal(foreignLiving.statusCode, 200, foreignLiving.body);
    assert.notEqual(mcpCallResult(foreignLiving)?.resultType, "input_required");
    assert.ok(
      foreignLiving.body.includes("Contact not found") ||
        foreignLiving.body.includes('"isError":true'),
      `foreign personId must not elicit: ${foreignLiving.body}`,
    );
    assert.ok(await prisma.people.findFirst({ where: { id: otherPerson.id, userId: otherId } }));

    const firstInteraction = await callTool(app, ownerToken, "delete_interaction", {
      interactionId: interaction.id,
    });
    assert.equal(firstInteraction.statusCode, 200, firstInteraction.body);
    const interactionAsk = mcpCallResult(firstInteraction);
    assert.equal(interactionAsk?.resultType, "input_required", firstInteraction.body);
    const interactionDeleted = await callTool(
      app,
      ownerToken,
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

    const unknownInteraction = await callTool(app, ownerToken, "delete_interaction", {
      interactionId: "018f5c3a-7b2e-7c1a-8d4e-0000000000ff",
    });
    assert.equal(unknownInteraction.statusCode, 200, unknownInteraction.body);
    assert.notEqual(mcpCallResult(unknownInteraction)?.resultType, "input_required");
    assert.ok(
      unknownInteraction.body.includes("Interaction not found") ||
        unknownInteraction.body.includes('"isError":true'),
      `unknown interactionId must not elicit: ${unknownInteraction.body}`,
    );

    const foreignInteraction = await callTool(app, ownerToken, "delete_interaction", {
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
});
