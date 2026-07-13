import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const apiSrc = join(import.meta.dirname, "..", "src");
const outPath = join(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "packages",
  "schemas",
  "src",
  "errors",
  "api-error-codes.generated.ts",
);

type CodeMeta = { httpStatus: number; usages: Set<string> };
const codeMeta = new Map<string, CodeMeta>();

/** Snake_case API error codes used across the API after the catalog migration. */
const CODE = "[a-z][a-z0-9_]*";

function addCode(code: string, httpStatus: number, usage: string) {
  const existing = codeMeta.get(code) ?? { httpStatus, usages: new Set<string>() };
  existing.usages.add(usage);
  if (httpStatus !== 500) {
    existing.httpStatus = httpStatus;
  }
  codeMeta.set(code, existing);
}

function walk(dir: string) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      walk(path);
      continue;
    }
    if (!entry.endsWith(".ts")) {
      continue;
    }
    const content = readFileSync(path, "utf8");

    for (const m of content.matchAll(new RegExp(`badRequest\\([^)]*?,\\s*"(${CODE})"`, "g"))) {
      addCode(m[1], 400, "badRequest");
    }
    for (const m of content.matchAll(new RegExp(`notFound\\([^)]*?,\\s*"(${CODE})"`, "g"))) {
      addCode(m[1], 404, "notFound");
    }
    for (const m of content.matchAll(new RegExp(`forbidden\\([^)]*?,\\s*"(${CODE})"`, "g"))) {
      addCode(m[1], 403, "forbidden");
    }
    for (const m of content.matchAll(new RegExp(`unauthorized\\([^)]*?,\\s*"(${CODE})"`, "g"))) {
      addCode(m[1], 401, "unauthorized");
    }
    for (const m of content.matchAll(new RegExp(`conflict\\([^)]*?,\\s*"(${CODE})"`, "g"))) {
      addCode(m[1], 409, "conflict");
    }
    for (const m of content.matchAll(
      new RegExp(`new DomainError\\([\\s\\S]*?,\\s*(\\d+),\\s*"(${CODE})"`, "g"),
    )) {
      addCode(m[2], Number(m[1]), "DomainError");
    }
    for (const m of content.matchAll(new RegExp(`internal\\(\\s*"(${CODE})"`, "g"))) {
      addCode(m[1], 500, "internal");
    }
    for (const m of content.matchAll(new RegExp(`code:\\s*"(${CODE})"`, "g"))) {
      const code = m[1];
      if (code === "rate_limit_exceeded") {
        addCode(code, 429, "rateLimit");
      }
      if (code === "sync_conflict") {
        addCode(code, 409, "syncConflict");
      }
      if (code === "validation_error") {
        addCode(code, 400, "validation");
      }
      if (code === "extension_outdated") {
        addCode(code, 426, "extension");
      }
      if (code === "sync_protocol_mismatch" || code === "sqlite_schema_mismatch") {
        addCode(code, 426, "syncProtocol");
      }
      if (code === "not_found") {
        addCode(code, 404, "notFound");
      }
    }
  }
}

walk(apiSrc);

addCode("sync_protocol_mismatch", 426, "syncProtocol");
addCode("sqlite_schema_mismatch", 426, "syncSchema");

function extractAllCodes(dir: string): Set<string> {
  const codes = new Set<string>();
  function scan(scanDir: string) {
    for (const entry of readdirSync(scanDir)) {
      const path = join(scanDir, entry);
      if (statSync(path).isDirectory()) {
        scan(path);
        continue;
      }
      if (!entry.endsWith(".ts")) {
        continue;
      }
      const content = readFileSync(path, "utf8");
      const patterns = [
        new RegExp(
          `(?:internal|badRequest|notFound|forbidden|conflict|unauthorized)\\([^)]*?,\\s*"(${CODE})"`,
          "g",
        ),
        new RegExp(
          `(?:internal|badRequest|notFound|forbidden|conflict|unauthorized)\\(\\s*"(${CODE})"`,
          "g",
        ),
        new RegExp(`new DomainError\\([\\s\\S]*?,\\s*"(${CODE})"`, "g"),
        new RegExp(`code:\\s*"(${CODE})"`, "g"),
      ];
      for (const pattern of patterns) {
        for (const match of content.matchAll(pattern)) {
          codes.add(match[1]);
        }
      }
    }
  }
  scan(dir);
  return codes;
}

for (const code of extractAllCodes(apiSrc)) {
  if (!codeMeta.has(code)) {
    addCode(code, 500, "extracted");
  }
}

const STATUS_OVERRIDES: Record<string, number> = {
  BAD_GATEWAY: 502,
  EXTENSION_OUTDATED: 426,
};

function httpStatusFor(code: string, meta: CodeMeta): number {
  if (STATUS_OVERRIDES[code]) {
    return STATUS_OVERRIDES[code];
  }
  if (code === "rate_limit_exceeded") {
    return 429;
  }
  if (code === "sync_conflict" || code === "conflict") {
    return 409;
  }
  if (code === "service_unavailable") {
    return 503;
  }
  if (code === "validation_error" || code === "bad_request") {
    return 400;
  }
  if (
    code === "extension_outdated" ||
    code === "sync_protocol_mismatch" ||
    code === "sqlite_schema_mismatch"
  ) {
    return 426;
  }
  if (code.endsWith("_NOT_FOUND") || code === "not_found") {
    return 404;
  }
  if (
    code === "auth_required" ||
    code === "invalid_api_key" ||
    code === "service_auth_required" ||
    code === "service_auth_invalid" ||
    code === "JWT_SESSION_UNAVAILABLE"
  ) {
    return 401;
  }
  if (code === "admin_required" || code.includes("FORBIDDEN") || code === "chat_quota_exceeded") {
    return 403;
  }
  if (code === "api_key_method_forbidden" || code === "api_key_route_forbidden") {
    return 403;
  }
  if (code === "service_unavailable") {
    return 503;
  }
  if (code.includes("ALREADY_EXISTS") || code.includes("DUPLICATE")) {
    return 409;
  }
  if (code.includes("LIMIT_EXCEEDED")) {
    if (code === "rate_limit_exceeded") {
      return 429;
    }
    if (code === "api_key_limit_exceeded") {
      return 400;
    }
    return 409;
  }
  if (
    code.includes("INVALID") ||
    code.includes("_NO_FIELDS") ||
    code.includes("_REQUIRED") ||
    code.includes("SELF_FORBIDDEN") ||
    code.includes("SAME_CONTACT")
  ) {
    return 400;
  }
  return meta.httpStatus;
}

function typeFor(status: number): string {
  if (status === 400) {
    return "invalid_request_error";
  }
  if (status === 401) {
    return "authentication_error";
  }
  if (status === 403) {
    return "authorization_error";
  }
  if (status === 404) {
    return "not_found_error";
  }
  if (status === 409) {
    return "conflict_error";
  }
  if (status === 426) {
    return "invalid_request_error";
  }
  if (status === 429) {
    return "rate_limit_error";
  }
  if (status === 502 || status === 503) {
    return "service_unavailable_error";
  }
  return "api_error";
}

function toSnake(code: string): string {
  return code.toLowerCase();
}

function messageTemplate(code: string): string {
  return code
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const entries = [...codeMeta.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([code, meta]) => {
    const httpStatus = httpStatusFor(code, meta);
    const snake = toSnake(code);
    return {
      code: snake,
      docPath: `/docs/api/errors/${snake}`,
      httpStatus,
      legacyCode: code,
      messageTemplate: messageTemplate(code),
      type: typeFor(httpStatus),
    };
  });

const lines = entries.map(
  (e) =>
    `  ${JSON.stringify(e.code)}: { code: ${JSON.stringify(e.code)}, type: ${JSON.stringify(e.type)}, httpStatus: ${e.httpStatus}, docPath: ${JSON.stringify(e.docPath)}, messageTemplate: ${JSON.stringify(e.messageTemplate)} },`,
);

const file = `/** Generated by apps/api/scripts/generate-api-error-catalog.ts — do not edit manually. */
import type { ApiErrorType } from "./api-error-types.js";

export interface ApiErrorDefinition {
  code: string;
  type: ApiErrorType;
  httpStatus: number;
  docPath: string;
  messageTemplate: string;
}

export const API_ERROR_CODE_ENTRIES = {
${lines.join("\n")}
} as const satisfies Record<string, ApiErrorDefinition>;

export type ApiErrorCode = keyof typeof API_ERROR_CODE_ENTRIES;

export const API_ERROR_CODES = Object.keys(API_ERROR_CODE_ENTRIES) as ApiErrorCode[];

export function getErrorDefinition(code: ApiErrorCode): ApiErrorDefinition {
  return API_ERROR_CODE_ENTRIES[code];
}

export function getErrorDocPath(code: ApiErrorCode): string {
  return API_ERROR_CODE_ENTRIES[code].docPath;
}

export function isApiErrorCode(value: string): value is ApiErrorCode {
  return Object.hasOwn(API_ERROR_CODE_ENTRIES, value);
}
`;

writeFileSync(outPath, file, "utf8");
console.error(`Wrote ${entries.length} codes to ${outPath}`);
