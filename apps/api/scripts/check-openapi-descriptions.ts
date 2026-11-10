/**
 * Fails when a published OpenAPI property or parameter has no description.
 *
 * Checks the generated spec, not the Zod source. `.extend()`, `.pick()`, and
 * copied `.shape` fields drop a parent `.describe()`, so the spec is the
 * artifact readers see.
 *
 * A property that is only a `$ref` is skipped. The target schema's fields are
 * checked when that schema is walked.
 *
 * Usage: pnpm run check:openapi-descriptions -w api
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { createCheck } from "../../../scripts/check/check-report.mjs";

const check = createCheck("check-openapi-descriptions");

const __dirname = dirname(fileURLToPath(import.meta.url));
const specPath = join(__dirname, "../../../packages/openapi-spec/openapi.yaml");

const HTTP_METHODS = new Set(["get", "post", "put", "patch", "delete", "head", "options", "trace"]);

const MAX_REPORTED = 40;

type SchemaNode = {
  $ref?: string;
  additionalProperties?: SchemaNode | boolean;
  allOf?: SchemaNode[];
  anyOf?: SchemaNode[];
  description?: string;
  items?: SchemaNode;
  oneOf?: SchemaNode[];
  properties?: Record<string, SchemaNode>;
};

type ParameterNode = {
  description?: string;
  in?: string;
  name?: string;
  schema?: SchemaNode;
};

type OperationNode = {
  parameters?: ParameterNode[];
  requestBody?: { content?: Record<string, { schema?: SchemaNode }> };
  responses?: Record<string, { content?: Record<string, { schema?: SchemaNode }> }>;
};

type OpenApiSpec = {
  components?: { schemas?: Record<string, SchemaNode> };
  paths?: Record<string, Record<string, OperationNode | ParameterNode[] | undefined>>;
};

function hasDescription(node: { description?: string } | undefined): boolean {
  return typeof node?.description === "string" && node.description.trim().length > 0;
}

function walkSchema(node: SchemaNode | undefined, path: string, missing: string[]): void {
  if (!node || node.$ref) {
    return;
  }

  if (node.properties) {
    for (const [name, property] of Object.entries(node.properties)) {
      const propertyPath = `${path}.${name}`;
      if (!property.$ref && !hasDescription(property)) {
        missing.push(propertyPath);
      }
      walkSchema(property, propertyPath, missing);
    }
  }

  if (node.items) {
    walkSchema(node.items, `${path}[]`, missing);
  }

  if (node.additionalProperties && typeof node.additionalProperties === "object") {
    walkSchema(node.additionalProperties, `${path}.additionalProperties`, missing);
  }

  for (const key of ["allOf", "anyOf", "oneOf"] as const) {
    const variants = node[key];
    if (!variants) {
      continue;
    }
    variants.forEach((variant, index) => {
      walkSchema(variant, `${path}.${key}[${index}]`, missing);
    });
  }
}

function walkParameters(
  parameters: ParameterNode[] | undefined,
  path: string,
  missing: string[],
): void {
  if (!parameters) {
    return;
  }

  for (const parameter of parameters) {
    const parameterPath = `${path}.param[${parameter.in ?? "?"}].${parameter.name ?? "?"}`;
    if (
      !hasDescription(parameter) &&
      !hasDescription(parameter.schema) &&
      !parameter.schema?.$ref
    ) {
      missing.push(parameterPath);
    }
    walkSchema(parameter.schema, parameterPath, missing);
  }
}

function walkOperation(operation: OperationNode, path: string, missing: string[]): void {
  walkParameters(operation.parameters, path, missing);

  for (const [contentType, content] of Object.entries(operation.requestBody?.content ?? {})) {
    walkSchema(content.schema, `${path}.requestBody[${contentType}]`, missing);
  }

  for (const [status, response] of Object.entries(operation.responses ?? {})) {
    for (const [contentType, content] of Object.entries(response.content ?? {})) {
      walkSchema(content.schema, `${path}.response[${status}][${contentType}]`, missing);
    }
  }
}

const spec = parse(readFileSync(specPath, "utf8")) as OpenApiSpec;
const missing: string[] = [];

for (const [name, schema] of Object.entries(spec.components?.schemas ?? {})) {
  walkSchema(schema, `components.schemas.${name}`, missing);
}

for (const [path, methods] of Object.entries(spec.paths ?? {})) {
  walkParameters(methods.parameters as ParameterNode[] | undefined, path, missing);

  for (const [method, operation] of Object.entries(methods)) {
    if (!HTTP_METHODS.has(method) || !operation || Array.isArray(operation)) {
      continue;
    }
    walkOperation(operation, `${method.toUpperCase()} ${path}`, missing);
  }
}

const unique = [...new Set(missing)].sort();

for (const path of unique.slice(0, MAX_REPORTED)) {
  check.add(`${path}: missing description`);
}

if (unique.length > MAX_REPORTED) {
  check.add(`... and ${unique.length - MAX_REPORTED} more`);
}

check.ok(unique.length === 0 ? "every property and parameter has a description" : undefined);
