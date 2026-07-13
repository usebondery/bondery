/**
 * Replaces empty error response schemas with component $refs.
 *
 * fastify-zod-openapi emits `schema: {}` when the same Zod component is reused
 * across routes (only the first route gets a $ref). Examples are still correct;
 * this patch fixes the schema half for GitBook and CI.
 */

type JsonContent = {
  schema?: unknown;
  example?: unknown;
};

type OpenApiSpec = {
  paths?: Record<
    string,
    Record<
      string,
      {
        responses?: Record<
          string,
          {
            content?: Record<string, JsonContent>;
          }
        >;
      }
    >
  >;
};

function isEmptySchema(schema: unknown): boolean {
  return (
    schema === undefined ||
    (typeof schema === "object" &&
      schema !== null &&
      !Array.isArray(schema) &&
      Object.keys(schema).length === 0)
  );
}

export function patchOpenApiErrorSchemas(spec: OpenApiSpec): void {
  for (const methods of Object.values(spec.paths ?? {})) {
    for (const operation of Object.values(methods)) {
      if (!operation?.responses) {
        continue;
      }

      for (const [status, response] of Object.entries(operation.responses)) {
        const statusCode = Number(status);
        if (!Number.isInteger(statusCode) || statusCode < 400) {
          continue;
        }

        const jsonContent = response.content?.["application/json"];
        if (!jsonContent || !isEmptySchema(jsonContent.schema)) {
          continue;
        }

        const example = jsonContent.example;
        if (example && typeof example === "object" && example !== null && "contact" in example) {
          jsonContent.schema = { $ref: "#/components/schemas/SyncConflictError" };
        } else {
          jsonContent.schema = { $ref: "#/components/schemas/ApiError" };
        }
      }
    }
  }
}
