import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { readBuildMetadata } from "@bondery/helpers/infra/build-metadata";
import { apiUrl } from "@/lib/api-url";
import websitePackage from "../../../package.json" with { type: "json" };

const TOOLS = [
  {
    description:
      "Search contacts matching a name or free-text search. At most 25 matches; search is required.",
    name: "search_contacts",
  },
  {
    description: "Read one contact that belongs to the signed-in user.",
    name: "get_contact",
  },
  {
    description: "Look up a contact by Instagram, LinkedIn, or Facebook handle.",
    name: "get_contact_by_social",
  },
  {
    description: "Get the groups a contact belongs to.",
    name: "get_contact_groups",
  },
  {
    description: "Get the tags on a contact.",
    name: "get_contact_tags",
  },
  {
    description: "Get LinkedIn bio, work history, and education stored for a contact.",
    name: "get_contact_linkedin",
  },
  {
    description:
      "Create a contact for the signed-in user. Optional phones, emails, socials, and notes.",
    name: "create_contact",
  },
  {
    description:
      "Update a contact that belongs to the signed-in user, including channels and socials.",
    name: "update_contact",
  },
  {
    description:
      "Delete a contact that belongs to the signed-in user after the host confirms. Cannot delete your own card.",
    name: "delete_contact",
  },
  {
    description: "Preview which fields can be included when emailing a contact card.",
    name: "get_contact_share",
  },
  {
    description:
      "Email a contact card that belongs to the signed-in user after the host confirms. Cannot be undone.",
    name: "create_contact_share",
  },
  {
    description: "Get important dates for a contact that belongs to the signed-in user.",
    name: "get_important_dates",
  },
  {
    description: "Replace all important dates for a contact the signed-in user owns.",
    name: "update_important_dates",
  },
  {
    description: "Get upcoming important-date reminders. At most 25.",
    name: "get_upcoming_reminders",
  },
  {
    description:
      "Get interactions for the signed-in user. Optional personId filters to one contact. At most 25.",
    name: "get_interactions",
  },
  {
    description: "Read one interaction that belongs to the signed-in user.",
    name: "get_interaction",
  },
  {
    description:
      "Create an interaction with one or more contacts that belong to the signed-in user.",
    name: "create_interaction",
  },
  {
    description:
      "Update an interaction that belongs to the signed-in user. Optional participantIds replaces the participant list.",
    name: "update_interaction",
  },
  {
    description:
      "Delete an interaction that belongs to the signed-in user after the host confirms.",
    name: "delete_interaction",
  },
  {
    description: "Search groups by label. At most 25 matches; search is required.",
    name: "search_groups",
  },
  {
    description: "Browse groups that belong to the signed-in user. At most 25.",
    name: "get_groups",
  },
  {
    description: "Read one group that belongs to the signed-in user.",
    name: "get_group",
  },
  {
    description: "Create a group for organizing contacts.",
    name: "create_group",
  },
  {
    description: "Update a group that belongs to the signed-in user.",
    name: "update_group",
  },
  {
    description: "Delete a group after the host confirms. Does not delete the people in it.",
    name: "delete_group",
  },
  {
    description: "Get contacts in a group. At most 25.",
    name: "get_group_contacts",
  },
  {
    description: "Add contacts the signed-in user owns to a group.",
    name: "create_group_membership",
  },
  {
    description:
      "Remove contacts from a group after the host confirms. Does not delete the people.",
    name: "delete_group_membership",
  },
  {
    description: "Search tags by label. At most 25 matches; search is required.",
    name: "search_tags",
  },
  {
    description: "Browse tags that belong to the signed-in user. At most 25.",
    name: "get_tags",
  },
  {
    description: "Read one tag that belongs to the signed-in user.",
    name: "get_tag",
  },
  {
    description: "Create a tag. A color is assigned automatically.",
    name: "create_tag",
  },
  {
    description: "Update a tag that belongs to the signed-in user.",
    name: "update_tag",
  },
  {
    description: "Delete a tag after the host confirms. Does not delete the people who had it.",
    name: "delete_tag",
  },
  {
    description: "Get contacts with a tag. At most 25.",
    name: "get_tag_contacts",
  },
  {
    description: "Add a tag to contacts the signed-in user owns.",
    name: "create_tag_membership",
  },
  {
    description:
      "Remove a tag from contacts after the host confirms. Does not delete the people or the tag.",
    name: "delete_tag_membership",
  },
  {
    description: "Get relationships for one contact that belongs to the signed-in user.",
    name: "get_relationships",
  },
  {
    description: "Create a relationship between two contacts the signed-in user owns.",
    name: "create_relationship",
  },
  {
    description: "Update a relationship that belongs to the signed-in user.",
    name: "update_relationship",
  },
  {
    description: "Delete a relationship after the host confirms. Does not delete the people.",
    name: "delete_relationship",
  },
  {
    description: "Count overdue keep-in-touch contacts for the signed-in user.",
    name: "get_keep_in_touch_count",
  },
  {
    description: "Get contacts that have a keep-in-touch cadence. At most 25.",
    name: "get_keep_in_touch_contacts",
  },
  {
    description: "Set or clear a contact's keep-in-touch cadence and/or last interaction.",
    name: "update_keep_in_touch",
  },
] as const;

/** Request-time so Docker build placeholders are not frozen into beta/prod catalogs. */
export function GET() {
  const version = readBuildMetadata().version ?? websitePackage.version;

  return Response.json(
    {
      authentication: {
        pkce: true,
        type: "oauth2",
      },
      description:
        "Personal CRM contacts, groups, tags, relationships, keep-in-touch, important dates, and contact share email. OAuth 2.1 with PKCE. Read only searches and reads; Full access can create, update, and delete (host must confirm deletes and share send). Cannot delete your own contact card.",
      name: "Bondery",
      tools: TOOLS,
      transport: {
        type: "http",
        url: apiUrl(API_ROUTES.MCP),
      },
      version,
    },
    {
      headers: {
        "Cache-Control": "max-age=86400",
        "Content-Type": "application/mcp-server-card+json; charset=utf-8",
      },
    },
  );
}
