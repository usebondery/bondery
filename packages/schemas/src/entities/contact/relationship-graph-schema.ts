import { z } from "zod";
import { relationshipTypeSchema } from "./schema.js";
import type {
  RelationshipGraphEdge,
  RelationshipGraphGroup,
  RelationshipGraphHub,
  RelationshipGraphNode,
  RelationshipGraphResponse,
  RelationshipGraphUnlinkedPerson,
} from "./types.js";

export const relationshipGraphNodeSchema = z.object({
  avatar: z.string().nullable().describe("Avatar image URL, or null when unset"),
  firstName: z.string().describe("Given name"),
  headline: z.string().nullable().describe("Short role or description line"),
  id: z.string().describe("Contact identifier"),
  lastName: z.string().nullable().describe("Family name"),
  location: z.string().nullable().describe("Free-text location"),
  middleName: z.string().nullable().describe("Middle name"),
  myself: z.boolean().describe("True when this contact is the account owner"),
}) satisfies z.ZodType<RelationshipGraphNode>;

export const relationshipGraphEdgeSchema = z.object({
  id: z.string().describe("Relationship identifier"),
  relationshipType: relationshipTypeSchema,
  sourcePersonId: z.string().describe("Identifier of the source contact"),
  targetPersonId: z.string().describe("Identifier of the related contact"),
}) satisfies z.ZodType<RelationshipGraphEdge>;

export const relationshipGraphUnlinkedPersonSchema = z.object({
  firstName: z.string().describe("Given name"),
  id: z.string().describe("Contact identifier"),
  lastName: z.string().nullable().describe("Family name"),
}) satisfies z.ZodType<RelationshipGraphUnlinkedPerson>;

export const relationshipGraphHubSchema = z.object({
  id: z.string().describe("Hub identifier"),
  kind: z.enum(["company", "school"]).describe("Whether this hub is a company or a school"),
  label: z.string().describe("Display name of the company or school"),
  logoUrl: z.string().nullable().describe("Logo image URL, or null when unset"),
  memberCount: z.number().int().nonnegative().describe("Number of contacts in this hub"),
  personIds: z.array(z.string()).describe("Contact identifiers in this hub"),
}) satisfies z.ZodType<RelationshipGraphHub>;

export const relationshipGraphGroupSchema = z.object({
  color: z.string().nullable().describe("Hex color used for the group chip"),
  emoji: z.string().nullable().describe("Emoji shown on the group chip"),
  id: z.string().describe("Group identifier"),
  label: z.string().describe("Group name"),
  personIds: z.array(z.string()).describe("Contact identifiers in this group"),
}) satisfies z.ZodType<RelationshipGraphGroup>;

export const relationshipGraphResponseSchema = z.object({
  graph: z
    .object({
      edges: z.array(relationshipGraphEdgeSchema).describe("Relationships between contacts"),
      groups: z.array(relationshipGraphGroupSchema).describe("Group clusters"),
      hubs: z.array(relationshipGraphHubSchema).describe("Company and school hubs"),
      nodes: z.array(relationshipGraphNodeSchema).describe("Contacts in the graph"),
      truncated: z
        .boolean()
        .describe("True when the graph omits contacts to stay within the limit"),
      unlinked: z
        .array(relationshipGraphUnlinkedPersonSchema)
        .describe("Contacts with no relationship edge in this graph"),
      unlinkedCount: z
        .number()
        .int()
        .nonnegative()
        .describe("Number of contacts with no relationship edge"),
    })
    .describe("Relationship graph payload"),
}) satisfies z.ZodType<RelationshipGraphResponse>;
