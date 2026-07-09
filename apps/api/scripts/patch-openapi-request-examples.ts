/**
 * Hoists request-body examples from JSON Schema to media-type level.
 *
 * fastify-zod-openapi emits Zod `.meta({ example })` on the schema object;
 * GitBook and check-openapi expect `content.application/json.example` (same as
 * response examples from jsonResponse()).
 */

type JsonContent = {
  schema?: Record<string, unknown>;
  example?: unknown;
};

type OpenApiSpec = {
  paths?: Record<
    string,
    Record<
      string,
      {
        requestBody?: {
          content?: Record<string, JsonContent>;
        };
      }
    >
  >;
};

export function patchOpenApiRequestExamples(spec: OpenApiSpec): void {
  for (const methods of Object.values(spec.paths ?? {})) {
    for (const [method, operation] of Object.entries(methods)) {
      if (!["post", "put", "patch"].includes(method)) {
        continue;
      }

      const requestJson = operation?.requestBody?.content?.["application/json"];
      if (!requestJson || requestJson.example !== undefined) {
        continue;
      }

      const schema = requestJson.schema;
      if (!schema || typeof schema !== "object" || !("example" in schema)) {
        continue;
      }

      requestJson.example = schema.example;
      delete schema.example;
    }
  }
}
