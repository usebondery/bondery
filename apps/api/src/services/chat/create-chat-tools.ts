import type { DomainContext } from "../../domains/_shared/context.js";
import { createContactTools } from "./tools/contacts.js";
import { createGroupTools } from "./tools/groups.js";
import { createImportantDateTools } from "./tools/important-dates.js";
import { createInteractionTools } from "./tools/interactions.js";
import { createKeepInTouchTools } from "./tools/keep-in-touch.js";
import { createRelationshipTools } from "./tools/relationships.js";
import { createShareTools } from "./tools/sharing.js";
import { createTagTools } from "./tools/tags.js";

export function createChatTools(ctx: DomainContext) {
  return {
    ...createContactTools(ctx),
    ...createShareTools(ctx),
    ...createInteractionTools(ctx),
    ...createGroupTools(ctx),
    ...createTagTools(ctx),
    ...createImportantDateTools(ctx),
    ...createKeepInTouchTools(ctx),
    ...createRelationshipTools(ctx),
  };
}
