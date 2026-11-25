/**
 * CI guard: enforce standardized API error patterns and catalog-only codes.
 *
 * Usage: pnpm exec tsx scripts/check-route-errors.ts
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { API_ERROR_CODES, isApiErrorCode } from "@bondery/schemas/errors";

import { createCheck } from "../../../scripts/check/check-report.mjs";

const REPLY_STATUS_D_D_PATTERN = /reply\.status\(5\d\d\)/u;
const STATUSCODE_S_PATTERN = /statusCode\s*=/u;
const AS_ERROR_PATTERN = /as Error/u;
const NEW_DOMAINERROR_PATTERN = /new DomainError\((?<group1>[^)]*)\)/u;
const NEW_DOMAINERROR_MESSAGE_S_PATTERN = /new DomainError\([^,]+\.message,\s*500/u;
const HANDLEDOMAINERROR_PATTERN = /handleDomainError/u;

const check = createCheck("check-route-errors");

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiSrc = join(__dirname, "..", "src");
const routesRoot = join(apiSrc, "routes");
const authFiles = [
  join(apiSrc, "lib", "platform", "auth", "strategies.ts"),
  join(apiSrc, "lib", "platform", "auth", "api-key-access.ts"),
  join(apiSrc, "lib", "platform", "auth", "native-session.ts"),
];
const schemasRoot = join(__dirname, "..", "..", "..", "packages", "schemas", "src");

/** A DomainError takes three arguments: message, status and code. */
const DOMAIN_ERROR_REQUIRED_ARG_COUNT = 3;

const violations: string[] = [];
const catalogCodes = new Set<string>(API_ERROR_CODES);

function collectTsFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...collectTsFiles(full));
      continue;
    }
    if (entry.endsWith(".ts") && !entry.endsWith(".test.ts")) {
      files.push(full);
    }
  }
  return files;
}

function checkCatalogCodes(filePath: string): void {
  const rel = relative(apiSrc, filePath).replace(/\\/gu, "/");
  const content = readFileSync(filePath, "utf8");
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const loc = `${rel}:${i + 1}`;

    for (const match of line.matchAll(
      /(?:internal|badRequest|notFound|forbidden|conflict|unauthorized)\([^)]*?,\s*"(?<group1>[a-z][a-z0-9_]+)"/gu,
    )) {
      if (!isApiErrorCode(match[1])) {
        violations.push(`${loc}: unknown API error code "${match[1]}"`);
      }
    }

    for (const match of line.matchAll(
      /(?:internal|badRequest|notFound|forbidden|conflict|unauthorized)\(\s*"(?<group1>[a-z][a-z0-9_]+)"/gu,
    )) {
      if (!isApiErrorCode(match[1])) {
        violations.push(`${loc}: unknown API error code "${match[1]}"`);
      }
    }

    for (const match of line.matchAll(
      /new DomainError\([^)]*?,\s*"(?<group1>[a-z][a-z0-9_]+)"/gu,
    )) {
      if (!isApiErrorCode(match[1])) {
        violations.push(`${loc}: unknown API error code "${match[1]}"`);
      }
    }
  }
}

function checkFile(
  filePath: string,
  rules: {
    banHandleDomainError?: boolean;
    banReply5xx?: boolean;
    banErrorStatusCode?: boolean;
    banDomainErrorMissingCode?: boolean;
    banDomainError500Leak?: boolean;
  },
): void {
  const rel = relative(apiSrc, filePath).replace(/\\/gu, "/");
  const content = readFileSync(filePath, "utf8");
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const loc = `${rel}:${i + 1}`;

    if (rules.banHandleDomainError && HANDLEDOMAINERROR_PATTERN.test(line)) {
      violations.push(`${loc}: handleDomainError is banned — use throw + global mapper`);
    }

    if (rules.banReply5xx && REPLY_STATUS_D_D_PATTERN.test(line)) {
      violations.push(
        `${loc}: reply.status(5xx) is banned — throw internal() or serviceUnavailable()`,
      );
    }

    if (
      rules.banErrorStatusCode &&
      STATUSCODE_S_PATTERN.test(line) &&
      AS_ERROR_PATTERN.test(line)
    ) {
      violations.push(`${loc}: Error + statusCode pattern is banned in auth files`);
    }

    if (rules.banDomainErrorMissingCode) {
      const match = line.match(NEW_DOMAINERROR_PATTERN);
      if (match) {
        const [, args] = match;
        const argCount = args.split(",").length;
        if (argCount < DOMAIN_ERROR_REQUIRED_ARG_COUNT) {
          violations.push(`${loc}: DomainError missing required code argument`);
        }
      }
    }

    if (rules.banDomainError500Leak && NEW_DOMAINERROR_MESSAGE_S_PATTERN.test(line)) {
      violations.push(
        `${loc}: DomainError with .message on 500 leaks internals — use internal(code, cause)`,
      );
    }
  }
}

for (const file of collectTsFiles(routesRoot)) {
  checkFile(file, { banHandleDomainError: true, banReply5xx: true });
  checkCatalogCodes(file);
}

for (const file of authFiles) {
  checkFile(file, { banErrorStatusCode: true });
  checkCatalogCodes(file);
}

for (const file of collectTsFiles(join(apiSrc, "domains"))) {
  checkFile(file, {
    banDomainError500Leak: true,
    banDomainErrorMissingCode: true,
  });
  checkCatalogCodes(file);
}

for (const file of collectTsFiles(join(apiSrc, "services"))) {
  checkFile(file, {
    banDomainError500Leak: true,
    banDomainErrorMissingCode: true,
  });
  checkCatalogCodes(file);
}

for (const file of collectTsFiles(join(apiSrc, "lib"))) {
  checkCatalogCodes(file);
}

const fixturesPath = join(schemasRoot, "openapi", "fixtures", "errors.ts");
if (statSync(fixturesPath).isFile()) {
  const fixtures = readFileSync(fixturesPath, "utf8");
  if (!fixtures.includes("error:")) {
    violations.push("fixtures/errors.ts: examples must use nested { error: { ... } } envelope");
  }
}

for (const violation of violations) {
  check.add(violation);
}

check.ok(`${catalogCodes.size} catalog codes`);
