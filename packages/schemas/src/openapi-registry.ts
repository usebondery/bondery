import { z } from "zod";
import { contactSchema } from "./entities/contact.js";
import { groupSchema } from "./entities/group.js";
import { tagSchema } from "./entities/tag.js";
import { interactionSchema } from "./entities/activity.js";

/**
 * Registers shared read-model schemas for OpenAPI component $refs.
 * Call once during API bootstrap before routes are registered.
 */
export function registerOpenApiComponentSchemas(): void {
  z.globalRegistry.add(contactSchema, {
    id: "Contact",
    description: "Contact read model",
  });
  z.globalRegistry.add(groupSchema, {
    id: "Group",
    description: "Group read model",
  });
  z.globalRegistry.add(tagSchema, {
    id: "Tag",
    description: "Tag read model",
  });
  z.globalRegistry.add(interactionSchema, {
    id: "Interaction",
    description: "Interaction read model",
  });
}
