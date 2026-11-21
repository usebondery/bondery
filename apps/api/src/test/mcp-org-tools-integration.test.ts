/**
 * MCP tool scope and tenant isolation for org writes: groups, tags, relationships, and
 * keep-in-touch. `mcp:read` must step up, and a token must never touch another user's rows.
 *
 * Needs the same Postgres + migrate setup as `test:auth` (`pnpm run test:auth -w api`).
 */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { generateId } from "@bondery/helpers/ids";
import { contactResponseSchema, groupResponseSchema, tagResponseSchema } from "@bondery/schemas";
import type { ToolSuite } from "./mcp-tool-suite.js";

const { closeToolSuite, createToolSuite, prisma } = await import("./mcp-tool-suite.js");
const { callTool, deleteConfirmResponses, mcpCallResult, mcpStructuredContent } = await import(
  "./mcp-test-harness.js"
);

const MCP_CLIENT_ID = "mcp-org-client";
const MCP_CLIENT_IDS = [MCP_CLIENT_ID];

type ErrorBody = { code?: string } | undefined;

function errorCode(response: { json: () => unknown }): string | undefined {
  return (mcpStructuredContent(response)?.error as ErrorBody)?.code;
}

describe("mCP org tool isolation", () => {
  let suite: ToolSuite;

  before(async () => {
    suite = await createToolSuite(MCP_CLIENT_ID);
  });

  after(async () => {
    await closeToolSuite(suite, MCP_CLIENT_IDS);
  });

  it("scopes org writes behind mcp:write and isolates groups, tags, and relationships", async () => {
    const { app } = suite;
    const { otherToken, ownerId, ownerSession, ownerToken } = await suite.twoUsers();
    const readToken = await suite.readTokenFor(ownerSession);

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
      data: { firstName: "Ada", lastName: "Owner", userId: ownerId },
    });
    const ownerRelated = await prisma.people.create({
      data: { firstName: "Bob", lastName: "Related", userId: ownerId },
    });
    const otherPerson = await prisma.people.create({
      data: { firstName: "Eve", lastName: "Other", userId: otherId },
    });
    const otherRelated = await prisma.people.create({
      data: { firstName: "Ivy", lastName: "OtherRel", userId: otherId },
    });
    const otherGroup = await prisma.group.create({
      data: { color: "#ef4444", emoji: "🚫", label: "Secret", userId: otherId },
    });
    const otherTag = await prisma.tag.create({
      data: { color: "#ef4444", label: "secret", userId: otherId },
    });
    const otherRelationship = await prisma.peopleRelationship.create({
      data: {
        relationshipType: "friend",
        sourcePersonId: otherPerson.id,
        targetPersonId: otherRelated.id,
        userId: otherId,
      },
    });

    const createdGroup = await callTool(app, ownerToken, "create_group", {
      color: "#3b82f6",
      emoji: "👋",
      label: "Friends",
    });
    assert.equal(createdGroup.statusCode, 200, createdGroup.body);
    assert.equal(createdGroup.body.includes('"isError":true'), false, createdGroup.body);
    const createdGroupContent = mcpStructuredContent(createdGroup);
    assert.ok(createdGroupContent, createdGroup.body);
    const groupId = groupResponseSchema.parse(createdGroupContent).group.id;

    const added = await callTool(app, ownerToken, "create_group_membership", {
      groupId,
      personIds: [ownerPerson.id],
    });
    assert.equal(added.statusCode, 200, added.body);
    assert.ok(added.body.includes('"addedCount":1'), added.body);

    const unknownMembership = await callTool(app, ownerToken, "delete_group_membership", {
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

    const foreignMember = await callTool(app, ownerToken, "create_group_membership", {
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

    const removedAsk = await callTool(app, ownerToken, "delete_group_membership", {
      groupId,
      personIds: [ownerPerson.id],
    });
    assert.equal(removedAsk.statusCode, 200, removedAsk.body);
    const removedAskResult = mcpCallResult(removedAsk);
    assert.equal(removedAskResult?.resultType, "input_required", removedAsk.body);
    assert.equal(typeof removedAskResult?.requestState, "string", removedAsk.body);

    const removed = await callTool(
      app,
      ownerToken,
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

    const foreignGroup = await callTool(app, ownerToken, "get_group", { groupId: otherGroup.id });
    assert.equal(foreignGroup.statusCode, 200, foreignGroup.body);
    assert.equal(mcpCallResult(foreignGroup)?.isError, true, foreignGroup.body);
    assert.equal(errorCode(foreignGroup), "group_not_found", foreignGroup.body);

    const createdTag = await callTool(app, ownerToken, "create_tag", { label: "vip" });
    assert.equal(createdTag.statusCode, 200, createdTag.body);
    const createdTagContent = mcpStructuredContent(createdTag);
    assert.ok(createdTagContent, createdTag.body);
    const tagId = tagResponseSchema.parse(createdTagContent).tag.id;

    const tagged = await callTool(app, ownerToken, "create_tag_membership", {
      personIds: [ownerPerson.id],
      tagId,
    });
    assert.equal(tagged.statusCode, 200, tagged.body);

    const foreignTag = await callTool(app, ownerToken, "get_tag", { tagId: otherTag.id });
    assert.equal(foreignTag.statusCode, 200, foreignTag.body);
    assert.equal(mcpCallResult(foreignTag)?.isError, true, foreignTag.body);
    assert.equal(errorCode(foreignTag), "tag_not_found", foreignTag.body);

    const relationship = await callTool(app, ownerToken, "create_relationship", {
      personId: ownerPerson.id,
      relatedPersonId: ownerRelated.id,
      relationshipType: "friend",
    });
    assert.equal(relationship.statusCode, 200, relationship.body);

    const leakedRelationship = await callTool(app, otherToken, "get_relationships", {
      personId: ownerPerson.id,
    });
    assert.equal(leakedRelationship.statusCode, 200, leakedRelationship.body);
    assert.ok(
      leakedRelationship.body.includes("Contact not found") ||
        leakedRelationship.body.includes('"isError":true'),
      `foreign person relationships must not leak: ${leakedRelationship.body}`,
    );

    const foreignRelationship = await callTool(app, ownerToken, "delete_relationship", {
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

    const kit = await callTool(app, ownerToken, "update_keep_in_touch", {
      keepFrequencyDays: 30,
      personId: ownerPerson.id,
    });
    assert.equal(kit.statusCode, 200, kit.body);

    const gotContact = await callTool(app, ownerToken, "get_contact", { personId: ownerPerson.id });
    assert.equal(gotContact.statusCode, 200, gotContact.body);
    const gotContactContent = mcpStructuredContent(gotContact);
    assert.ok(gotContactContent, gotContact.body);
    assert.ok("contact" in gotContactContent, gotContact.body);
    assert.equal(contactResponseSchema.parse(gotContactContent).contact.keepFrequencyDays, 30);
  });
});
