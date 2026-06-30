import type { CreateDocumentOptions } from "zod-openapi";

/**
 * OpenAPI document options for published specs.
 * Strips Zod UUID regex patterns from docs while keeping runtime validation strict.
 */
export const openApiDocumentOpts: CreateDocumentOptions = {
  override: ({ jsonSchema }) => {
    if (jsonSchema.format === "uuid" && jsonSchema.pattern) {
      delete jsonSchema.pattern;
    }
  },
};
