import { type JsonSchema, sample } from "@fumadocs/json-schema";

/**
 * Fixed demo identifiers. They match the response fixtures on the same page, so a
 * copied request and the example response describe the same record.
 */
export const PATH_PLACEHOLDERS: Readonly<Record<string, string>> = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  relationshipId: "990e8400-e29b-41d4-a716-446655440003",
  sessionId: "aa0e8400-e29b-41d4-a716-446655440004",
  tagId: "880e8400-e29b-41d4-a716-446655440002",
};

/**
 * Routes that read `request.file()` and document no JSON body. The sample asks for
 * a local image instead of a body, so the copied command works as written.
 */
export const MULTIPART_SAMPLE_ROUTES: ReadonlySet<string> = new Set([
  "POST /contacts/{id}/photo",
  "POST /me/photo",
]);

const DEFAULT_PATH_PLACEHOLDER = PATH_PLACEHOLDERS.id;
const FALLBACK_BASE_URL = "https://api.usebondery.com";
const BEARER_VALUE = "Bearer YOUR_API_TOKEN";
const MULTIPART_FIELD = "file";
const MULTIPART_FILE = "photo.jpg";
const SHORT_QUERY_VALUE = "example";
/** Python literal indent. Matches the four-space `headers` block below it. */
const PYTHON_INDENT = "    ";

export interface SampleRequest {
  curl: string;
  javascript: string;
  python: string;
}

export interface SampleRequestParameter {
  /** Absent only in a malformed document. Such an item is skipped. */
  name?: string;
  required?: boolean;
  schema?: unknown;
}

export interface SampleRequestParameterGroup {
  in?: string;
  items: ReadonlyArray<SampleRequestParameter>;
}

export interface SampleRequestInput {
  method: string;
  parameters: ReadonlyArray<SampleRequestParameterGroup>;
  path: string;
  requestBody?: { content: Record<string, SampleRequestBodyMedia> };
  security: ReadonlyArray<ReadonlyArray<{ key: string }>>;
  servers?: ReadonlyArray<{ description?: string; url?: string }>;
}

/** The bundled document rewrites a single `example` into `examples.default.value`. */
export interface SampleRequestBodyMedia {
  example?: unknown;
  examples?: Record<string, unknown>;
  schema?: unknown;
}

interface RenderInput {
  authenticated: boolean;
  body: unknown;
  method: string;
  multipart: boolean;
  url: string;
}

interface RequestHeader {
  name: string;
  value: string;
}

/** True when the route takes a file field instead of a JSON body. */
export function isMultipartSample(method: string, path: string): boolean {
  return MULTIPART_SAMPLE_ROUTES.has(`${method.trim().toUpperCase()} ${path.trim()}`);
}

/**
 * Build copy-ready request samples from a parsed operation.
 *
 * The fumadocs generators read documented header parameters only. They never emit
 * `Authorization`, and they resolve the URL from `servers[0]`, which is the local
 * development host. This builder reads the operation and always targets production.
 */
export function buildSampleRequest(input: SampleRequestInput): SampleRequest | null {
  const method = input.method.trim().toUpperCase();
  const path = input.path.trim();

  if (method.length === 0 || path.length === 0) {
    return null;
  }

  const multipart = isMultipartSample(method, path);
  const render: RenderInput = {
    authenticated: input.security.some((group) => group.length > 0),
    body: multipart ? undefined : pickBody(input.requestBody),
    method,
    multipart,
    url: buildUrl(input, path),
  };

  return {
    curl: toCurl(render),
    javascript: toJavascript(render),
    python: toPython(render),
  };
}

function buildUrl(input: SampleRequestInput, path: string): string {
  const query = new URLSearchParams();

  for (const group of input.parameters) {
    if (group.in !== "query") {
      continue;
    }

    for (const item of group.items) {
      if (item.name === undefined || item.name.length === 0) {
        continue;
      }
      const value = queryValue(item.schema, item.required === true);
      if (value !== undefined) {
        query.append(item.name, value);
      }
    }
  }

  const queryString = query.toString();
  const suffix = queryString.length > 0 ? `?${queryString}` : "";

  return `${resolveBaseUrl(input.servers)}${fillPath(path)}${suffix}`;
}

function resolveBaseUrl(servers: SampleRequestInput["servers"]): string {
  const list = servers ?? [];
  const production = list.find(
    (server) => server.description !== undefined && /production/i.test(server.description),
  );
  const chosen = production ?? list[list.length - 1];
  const url = chosen?.url?.trim();

  return url === undefined || url.length === 0 ? FALLBACK_BASE_URL : url.replace(/\/+$/, "");
}

function fillPath(path: string): string {
  return path.replace(/\{([^{}]+)\}/g, (_match: string, name: string) => {
    return PATH_PLACEHOLDERS[name] ?? DEFAULT_PATH_PLACEHOLDER;
  });
}

/**
 * Query defaults come from the schema. A required parameter without a default gets
 * a small placeholder value, so the sample stays short but still runs.
 */
function queryValue(schema: unknown, required: boolean): string | undefined {
  const record = asRecord(schema);

  if (!record) {
    return undefined;
  }

  if (record.default !== undefined) {
    return scalarValue(record.default);
  }

  if (!required) {
    return undefined;
  }

  if (Array.isArray(record.enum) && record.enum.length > 0) {
    return scalarValue(record.enum[0]);
  }

  const types = Array.isArray(record.type) ? record.type : [record.type];
  const type = types.find((entry) => entry !== "null");

  if (type === "integer" || type === "number") {
    return "1";
  }

  if (type === "boolean") {
    return "true";
  }

  if (record.format === "uuid") {
    return DEFAULT_PATH_PLACEHOLDER;
  }

  return SHORT_QUERY_VALUE;
}

/**
 * Prefer the documented example. The bundled document stores a single `example`
 * under `examples.default.value`, so both shapes must be read.
 */
function pickBody(requestBody: SampleRequestInput["requestBody"]): unknown {
  const media = requestBody?.content["application/json"];

  if (!media) {
    return undefined;
  }

  if (media.example !== undefined) {
    return media.example;
  }

  const firstExample = Object.values(media.examples ?? {}).find(
    (entry) => asRecord(entry)?.value !== undefined,
  );

  if (firstExample !== undefined) {
    return asRecord(firstExample)?.value;
  }

  if (media.schema === undefined) {
    return undefined;
  }

  return sample(media.schema as JsonSchema, { skipNonRequired: true });
}

function requestHeaders(authenticated: boolean, hasBody: boolean): RequestHeader[] {
  const headers: RequestHeader[] = [];

  if (authenticated) {
    headers.push({ name: "Authorization", value: BEARER_VALUE });
  }

  if (hasBody) {
    headers.push({ name: "Content-Type", value: "application/json" });
  }

  return headers;
}

function toCurl({ authenticated, body, method, multipart, url }: RenderInput): string {
  const lines = [`curl -X ${method} "${url}"`];

  if (authenticated) {
    lines.push(`-H "Authorization: ${BEARER_VALUE}"`);
  }

  if (multipart) {
    lines.push(`-F "${MULTIPART_FIELD}=@${MULTIPART_FILE}"`);
  }

  if (body !== undefined) {
    lines.push('-H "Content-Type: application/json"');
    lines.push(`-d '${indentBody(formatJson(body))}'`);
  }

  return lines.join(" \\\n  ");
}

function toJavascript({ authenticated, body, method, multipart, url }: RenderInput): string {
  const headers = requestHeaders(authenticated, body !== undefined);
  const lines = [`const response = await fetch("${url}", {`, `  method: "${method}",`];

  if (headers.length > 0) {
    lines.push("  headers: {");
    for (const header of headers) {
      lines.push(`    ${JSON.stringify(header.name)}: ${JSON.stringify(header.value)},`);
    }
    lines.push("  },");
  }

  if (multipart) {
    lines.push("  body: form,");
  } else if (body !== undefined) {
    lines.push(...jsonBodyLines(body));
  }

  lines.push("});", "", "const data = await response.json();", "console.log(data);");

  if (!multipart) {
    return lines.join("\n");
  }

  return [
    "const form = new FormData();",
    `form.append(${JSON.stringify(MULTIPART_FIELD)}, photo); // photo: File or Blob`,
    "",
    ...lines,
  ].join("\n");
}

function toPython({ authenticated, body, method, multipart, url }: RenderInput): string {
  const headers = requestHeaders(authenticated, body !== undefined);
  const blocks: string[][] = [["import requests"], [`url = ${JSON.stringify(url)}`]];

  if (headers.length > 0) {
    const headerLines = headers.map(
      (header) => `    ${JSON.stringify(header.name)}: ${JSON.stringify(header.value)},`,
    );
    blocks.push(["headers = {", ...headerLines, "}"]);
  }

  const argumentsList = [JSON.stringify(method), "url"];

  if (multipart) {
    blocks.push([`files = {${JSON.stringify(MULTIPART_FIELD)}: open("${MULTIPART_FILE}", "rb")}`]);
    argumentsList.push("files=files");
  } else if (body !== undefined) {
    blocks.push([`payload = ${formatPython(body)}`]);
    argumentsList.push("json=payload");
  }

  if (headers.length > 0) {
    argumentsList.push("headers=headers");
  }

  blocks.push([`response = requests.request(${argumentsList.join(", ")})`, "print(response.text)"]);

  return blocks.map((block) => block.join("\n")).join("\n\n");
}

/** JSON body lines for the `JSON.stringify(...)` argument of the JavaScript sample. */
function jsonBodyLines(body: unknown): string[] {
  const formatted = formatJson(body).split("\n");

  if (formatted.length === 1) {
    return [`  body: JSON.stringify(${formatted[0]}),`];
  }

  const lines = [`  body: JSON.stringify(${formatted[0]}`];
  const middle = formatted.slice(1, -1);

  for (const line of middle) {
    lines.push(`  ${line}`);
  }

  lines.push("  }),");

  return lines;
}

function formatJson(value: unknown): string {
  const json = JSON.stringify(value, null, 2);
  return json === undefined ? String(value) : json;
}

/**
 * Python literal for a JSON value. `json=payload` sends JSON, but `true` and `null`
 * are not Python tokens, so the visible payload must use `True` and `None`.
 */
function formatPython(value: unknown): string {
  if (value === null || value === undefined) {
    return "None";
  }

  if (value === true) {
    return "True";
  }

  if (value === false) {
    return "False";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "None";
  }

  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "[]";
    }
    const items = value.map((item) => indentLines(formatPython(item), PYTHON_INDENT));
    return `[\n${items.map((item) => `${PYTHON_INDENT}${item},`).join("\n")}\n]`;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return "{}";
    }
    const lines = entries.map(([key, item]) => {
      return `${PYTHON_INDENT}${JSON.stringify(key)}: ${indentLines(formatPython(item), PYTHON_INDENT)},`;
    });
    return `{\n${lines.join("\n")}\n}`;
  }

  return "None";
}

function indentLines(value: string, indent: string): string {
  return value.split("\n").join(`\n${indent}`);
}

/**
 * Lines after the first in a shell body get the two-space continuation indent, so the
 * copied command reads as one block instead of a body flush against the left edge.
 */
function indentBody(value: string): string {
  const [first, ...rest] = value.split("\n");
  if (rest.length === 0) {
    return value;
  }
  return [first, ...rest.map((line) => `  ${line}`)].join("\n");
}

function scalarValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}
