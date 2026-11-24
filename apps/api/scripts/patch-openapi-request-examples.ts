/**
 * Hoists request-body examples from JSON Schema to media-type level, and applies
 * operation-level fixtures when routes register raw Zod body schemas.
 *
 * fastify-zod-openapi emits Zod `.meta({ example })` on the schema object;
 * GitBook and check-openapi expect `content.application/json.example` (same as
 * response examples from jsonResponse()).
 */

import { OPENAPI_OPERATION_REQUEST_EXAMPLES } from "./openapi-operation-request-examples.js";

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

function operationKey(method: string, path: string): string {
  return `${method.toUpperCase()} ${path}`;
}

export function patchOpenApiRequestExamples(spec: OpenApiSpec): void {
  for (const [path, methods] of Object.entries(spec.paths ?? {})) {
    for (const [method, operation] of Object.entries(methods)) {
      if (!["post", "put", "patch"].includes(method)) {
        continue;
      }

      const requestJson = operation?.requestBody?.content?.["application/json"];
      if (!requestJson || requestJson.example !== undefined) {
        continue;
      }

      const { schema } = requestJson;
      if (schema && typeof schema === "object" && "example" in schema) {
        requestJson.example = schema.example;
        delete schema.example;
        continue;
      }

      const fixture = OPENAPI_OPERATION_REQUEST_EXAMPLES[operationKey(method, path)];
      if (fixture !== undefined) {
        requestJson.example = fixture;
      }
    }
  }
}
