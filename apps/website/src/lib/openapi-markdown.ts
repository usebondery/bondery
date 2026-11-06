import type { Document } from "fumadocs-openapi";

type OperationItem = {
  method: string;
  path: string;
};

type ReferenceLike = { $ref: string };

type SchemaLike = {
  items?: SchemaLike;
  properties?: Record<string, SchemaLike>;
  required?: string[];
  type?: string | string[];
  $ref?: string;
};

type ParameterLike = {
  description?: string;
  in?: string;
  name?: string;
  required?: boolean;
  schema?: SchemaLike | false;
};

type ContentLike = Record<string, { schema?: SchemaLike } | ReferenceLike | undefined>;

type ResponseLike = { description?: string };

type OperationLike = {
  deprecated?: boolean;
  description?: string;
  parameters?: (ParameterLike | ReferenceLike)[];
  requestBody?: { content?: ContentLike } | ReferenceLike;
  responses?: Record<string, ResponseLike | ReferenceLike>;
  summary?: string;
  tags?: string[];
};

type PathItemLike = Record<string, OperationLike | undefined> & {
  parameters?: (ParameterLike | ReferenceLike)[];
};

type DocumentLike = {
  paths?: Record<string, PathItemLike | undefined>;
  webhooks?: Record<string, PathItemLike | undefined>;
};

function isReference(value: unknown): value is ReferenceLike {
  return typeof value === "object" && value !== null && "$ref" in value;
}

/** Compact type label for a parameter or body field. */
function typeLabel(schema: SchemaLike | false | undefined): string {
  if (!schema) {
    return "any";
  }
  if (schema.$ref) {
    return schema.$ref.split("/").at(-1) ?? "object";
  }
  const type = Array.isArray(schema.type) ? schema.type.join(" | ") : schema.type;
  if (type === "array") {
    return `${typeLabel(schema.items)}[]`;
  }
  return type ?? "any";
}

function parameterLine(parameter: ParameterLike | ReferenceLike): string | undefined {
  if (isReference(parameter) || !parameter.name) {
    return undefined;
  }
  // The auth header is documented once in `docs/api/authentication`.
  if (parameter.in === "header" && parameter.name.toLowerCase() === "authorization") {
    return undefined;
  }

  const required = parameter.required ? " (required)" : "";
  const where = parameter.in ? ` in ${parameter.in}` : "";
  const description = parameter.description ? `: ${parameter.description}` : "";

  return `- \`${parameter.name}\` — ${typeLabel(parameter.schema)}${where}${required}${description}`;
}

function bodyLines(requestBody: OperationLike["requestBody"]): string[] {
  if (!requestBody || isReference(requestBody)) {
    return [];
  }

  const content = requestBody.content ?? {};
  const mediaTypes = Object.keys(content);
  if (mediaTypes.length === 0) {
    return [];
  }

  const lines = [`**Request body** — ${mediaTypes.join(", ")}`, ""];
  const first = content[mediaTypes[0] ?? ""];
  const schema = first && !isReference(first) ? first.schema : undefined;
  const fields =
    schema && !("$ref" in (schema as object)) ? (schema as SchemaLike).properties : undefined;

  if (fields) {
    const required = new Set(schema && "required" in schema ? (schema.required ?? []) : []);
    for (const [name, fieldSchema] of Object.entries(fields)) {
      const suffix = required.has(name) ? " (required)" : "";
      lines.push(`- \`${name}\` — ${typeLabel(fieldSchema)}${suffix}`);
    }
    lines.push("");
  }

  return lines;
}

function responseLines(responses: OperationLike["responses"]): string[] {
  const entries = Object.entries(responses ?? {});
  if (entries.length === 0) {
    return [];
  }

  const lines = ["**Responses**", ""];
  for (const [status, response] of entries) {
    if (isReference(response)) {
      lines.push(`- \`${status}\``);
      continue;
    }
    lines.push(`- \`${status}\`${response.description ? `: ${response.description}` : ""}`);
  }
  lines.push("");

  return lines;
}

function operationMarkdown(document: DocumentLike, item: OperationItem): string {
  const method = item.method.toLowerCase();
  const pathItem = document.paths?.[item.path] ?? document.webhooks?.[item.path];
  const operation = pathItem?.[method] as OperationLike | undefined;

  if (!operation) {
    return `## ${item.method.toUpperCase()} ${item.path}\n\nOperation not found in the OpenAPI document.\n`;
  }

  const lines: string[] = [`## ${item.method.toUpperCase()} ${item.path}`, ""];

  if (operation.summary) {
    lines.push(operation.summary, "");
  }
  if (operation.description) {
    lines.push(operation.description, "");
  }
  if (operation.deprecated) {
    lines.push("**Deprecated.**", "");
  }
  if (operation.tags?.length) {
    lines.push(`Tags: ${operation.tags.join(", ")}`, "");
  }

  const merged = [...(pathItem?.parameters ?? []), ...(operation.parameters ?? [])];
  const parameters = merged
    .map((parameter) => parameterLine(parameter))
    .filter((line): line is string => line !== undefined);

  if (parameters.length > 0) {
    lines.push("**Parameters**", "", ...parameters, "");
  }

  lines.push(...bodyLines(operation.requestBody), ...responseLines(operation.responses));

  return lines.join("\n");
}

/**
 * Markdown for one generated OpenAPI page.
 *
 * `OpenAPIPage` is a client component, so the processed page Markdown carries no
 * operation detail. Build it from the OpenAPI document instead.
 */
export function openApiPageMarkdown(document: Document, item: OperationItem): string {
  const paths = (document as unknown as DocumentLike).paths;

  return operationMarkdown({ paths }, item).trim();
}
