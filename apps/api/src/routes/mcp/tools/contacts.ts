import {
  bySocialLookupResponseSchema,
  contactGroupsResponseSchema,
  contactResponseSchema,
  contactsListResponseSchema,
  contactTagListResponseSchema,
  createContactResponseSchema,
  linkedInDataResponseSchema,
  messageResponseSchema,
} from "@bondery/schemas";
import type { McpServer } from "@modelcontextprotocol/server";
import type { JWTPayload } from "jose";
import type { DomainContext } from "../../../domains/_shared/context.js";
import { domainDb } from "../../../domains/_shared/domain-db.js";
import { forbidden, notFound } from "../../../lib/platform/errors/http-errors.js";
import {
  createContactInputSchema,
  deleteContactInputSchema,
  executeCreateContact,
  executeDeleteContact,
  executeGetContact,
  executeGetContactBySocial,
  executeGetContactGroups,
  executeGetContactLinkedin,
  executeGetContactTags,
  executeSearchContacts,
  executeUpdateContact,
  getContactBySocialInputSchema,
  getContactInputSchema,
  getContactLinkedinInputSchema,
  searchContactsInputSchema,
  updateContactInputSchema,
} from "../../../services/assistant-tools/contacts.js";
import { confirmMcpDelete } from "./confirm-delete.js";
import { mcpJsonResult, runMcpTool } from "./json.js";
import { mcpToolMeta } from "./mcp-tool-meta.js";
import { runMcpWriteTool } from "./mcp-write.js";

export function registerContactMcpTools(
  server: McpServer,
  ctx: DomainContext,
  claims: JWTPayload,
): void {
  const db = domainDb(ctx);

  server.registerTool(
    "search_contacts",
    {
      ...mcpToolMeta("search", "Search contacts"),
      description:
        "Search contacts that match a name or free-text search. Requires search so the full address book is never dumped. Optional REST sort. At most 25 matches; offset paging.",
      inputSchema: searchContactsInputSchema,
      outputSchema: contactsListResponseSchema,
    },
    async (args) =>
      runMcpTool(ctx, async () => mcpJsonResult(await executeSearchContacts(ctx, args))),
  );

  server.registerTool(
    "get_contact",
    {
      ...mcpToolMeta("get", "Get a contact"),
      description: "Get one contact that belongs to the signed-in user.",
      inputSchema: getContactInputSchema,
      outputSchema: contactResponseSchema,
    },
    async (args) => runMcpTool(ctx, async () => mcpJsonResult(await executeGetContact(ctx, args))),
  );

  server.registerTool(
    "get_contact_by_social",
    {
      ...mcpToolMeta("get", "Get a contact by social handle"),
      description:
        "Look up a contact you own by Instagram, LinkedIn, or Facebook handle. Returns { exists, contact? }.",
      inputSchema: getContactBySocialInputSchema,
      outputSchema: bySocialLookupResponseSchema,
    },
    async (args) =>
      runMcpTool(ctx, async () => mcpJsonResult(await executeGetContactBySocial(ctx, args))),
  );

  server.registerTool(
    "get_contact_groups",
    {
      ...mcpToolMeta("get", "Get a contact's groups"),
      description: "Get the groups a contact you own belongs to.",
      inputSchema: getContactInputSchema,
      outputSchema: contactGroupsResponseSchema,
    },
    async (args) =>
      runMcpTool(ctx, async () => mcpJsonResult(await executeGetContactGroups(ctx, args))),
  );

  server.registerTool(
    "get_contact_tags",
    {
      ...mcpToolMeta("get", "Get a contact's tags"),
      description: "Get the tags on a contact you own.",
      inputSchema: getContactInputSchema,
      outputSchema: contactTagListResponseSchema,
    },
    async (args) =>
      runMcpTool(ctx, async () => mcpJsonResult(await executeGetContactTags(ctx, args))),
  );

  server.registerTool(
    "get_contact_linkedin",
    {
      ...mcpToolMeta("get", "Get a contact's LinkedIn data"),
      description:
        "Get LinkedIn bio, work history, and education already stored for a contact you own. Same payload as GET /contacts/:id/linkedin-data.",
      inputSchema: getContactLinkedinInputSchema,
      outputSchema: linkedInDataResponseSchema,
    },
    async (args) =>
      runMcpTool(ctx, async () => mcpJsonResult(await executeGetContactLinkedin(ctx, args))),
  );

  server.registerTool(
    "create_contact",
    {
      ...mcpToolMeta("create", "Create a contact"),
      description:
        "Create a contact for the signed-in user. Optional phones, emails, socials, notes, geo, and keep-in-touch in the same call. Requires mcp:write.",
      inputSchema: createContactInputSchema,
      outputSchema: createContactResponseSchema,
    },
    async (input) =>
      runMcpWriteTool(claims, ctx, async () =>
        mcpJsonResult(await executeCreateContact(ctx, input)),
      ),
  );

  server.registerTool(
    "update_contact",
    {
      ...mcpToolMeta("update", "Update a contact"),
      description:
        "Update a contact you own. Identity, notes, language, timezone, geo, keep-in-touch, socials, and channel arrays (phones, emails, addresses; [] clears). Dates use update_important_dates. Requires mcp:write.",
      inputSchema: updateContactInputSchema,
      outputSchema: createContactResponseSchema,
    },
    async (args) =>
      runMcpWriteTool(claims, ctx, async () =>
        mcpJsonResult(await executeUpdateContact(ctx, args)),
      ),
  );

  server.registerTool(
    "delete_contact",
    {
      ...mcpToolMeta("delete", "Delete a contact"),
      description:
        "Delete a contact you own after the host confirms. Cannot delete your own card. Requires mcp:write.",
      inputSchema: deleteContactInputSchema,
      outputSchema: messageResponseSchema,
    },
    async ({ personId }, extra) =>
      runMcpWriteTool(claims, ctx, async () => {
        const person = await db.people.findFirst({
          select: { firstName: true, id: true, lastName: true, myself: true },
          where: { id: personId, userId: ctx.user.id },
        });
        if (!person) {
          throw notFound("Contact not found", "contact_not_found");
        }
        if (person.myself) {
          throw forbidden("Cannot delete your own contact card", "contact_delete_self_forbidden");
        }
        const fullName = [person.firstName, person.lastName].filter(Boolean).join(" ") || person.id;
        return confirmMcpDelete({
          args: { personId },
          extra,
          onConfirm: async () => mcpJsonResult(await executeDeleteContact(ctx, { personId })),
          preview: `Delete contact ${fullName} (${person.id})? This cannot be undone.`,
          toolName: "delete_contact",
          userId: ctx.user.id,
        });
      }),
  );
}
