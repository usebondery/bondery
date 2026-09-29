import type { DomainContext } from "../../../domains/_shared/context.js";
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
} from "../../assistant-tools/contacts.js";
import { chatTool } from "../chat-tool.js";

export function createContactTools(ctx: DomainContext) {
  return {
    create_contact: chatTool(ctx, {
      description:
        "Create a new contact. Optional phones, emails, socials, notes, and profile fields in the same call.",
      execute: (input) => executeCreateContact(ctx, input),
      inputSchema: createContactInputSchema,
    }),
    delete_contact: chatTool(ctx, {
      description:
        "Delete a contact you own. Cannot delete your own card. Confirm with the user in the thread before calling.",
      execute: (args) => executeDeleteContact(ctx, args),
      inputSchema: deleteContactInputSchema,
    }),
    get_contact: chatTool(ctx, {
      description: "Get one contact that belongs to the signed-in user.",
      execute: (args) => executeGetContact(ctx, args),
      inputSchema: getContactInputSchema,
    }),
    get_contact_by_social: chatTool(ctx, {
      description:
        "Look up a contact you own by Instagram, LinkedIn, or Facebook handle. Returns { exists, contact? }.",
      execute: (args) => executeGetContactBySocial(ctx, args),
      inputSchema: getContactBySocialInputSchema,
    }),
    get_contact_groups: chatTool(ctx, {
      description: "Get the groups a contact you own belongs to.",
      execute: (args) => executeGetContactGroups(ctx, args),
      inputSchema: getContactInputSchema,
    }),
    get_contact_linkedin: chatTool(ctx, {
      description:
        "Get LinkedIn bio, work history, and education already stored for a contact you own.",
      execute: (args) => executeGetContactLinkedin(ctx, args),
      inputSchema: getContactLinkedinInputSchema,
    }),
    get_contact_tags: chatTool(ctx, {
      description: "Get the tags on a contact you own.",
      execute: (args) => executeGetContactTags(ctx, args),
      inputSchema: getContactInputSchema,
    }),
    search_contacts: chatTool(ctx, {
      description:
        "Search contacts by name or free text. Requires search. Returns at most 25 matches.",
      execute: (args) => executeSearchContacts(ctx, args),
      inputSchema: searchContactsInputSchema,
    }),
    update_contact: chatTool(ctx, {
      description:
        "Update a contact you own. Identity, notes, language, timezone, geo, keep-in-touch, socials, and channel arrays (phones, emails, addresses; [] clears). Dates use update_important_dates.",
      execute: (args) => executeUpdateContact(ctx, args),
      inputSchema: updateContactInputSchema,
    }),
  };
}
