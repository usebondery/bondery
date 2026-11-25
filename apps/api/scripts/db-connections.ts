// Detection rules for check-db-connections.ts (docs/deploy/configuration.mdx#postgres-tls).
//
// Every Postgres connection takes its TLS settings from @bondery/db's database-tls module:
// `pg` Pools and Clients and pg-boss spread `pgConnectionConfig(url)`, and the Prisma CLI URL
// comes from `prismaCliUrl(url)`. A connection built any other way would skip TLS or quietly
// downgrade it, so these rules reject it.

/** The module that implements the rules. It alone may set TLS options by hand. */

const TRAILING_OPEN_PAREN_PATTERN = /\s*\($/u;

const PG_IMPORT = /from\s+["'](?:pg|pg-boss)["']|require\(\s*["'](?:pg|pg-boss)["']\s*\)/u;
const CONSTRUCTOR = /\bnew\s+(?:pg\.)?(?:Pool|Client|PgBoss)\s*\(/gu;
/** The constructor's arguments must spread pgConnectionConfig(...) before the call closes. */
const CONFIGURED_ARGUMENT = /^\s*\{\s*\.\.\.pgConnectionConfig\(/u;
const INSECURE_TLS = /rejectUnauthorized\s*:\s*false/u;
/** libpq TLS parameters that Prisma's schema engine ignores without an error. */
const LIBPQ_TLS_IN_URL = /[?&](?:sslmode=verify-(?:full|ca)|sslrootcert=)/u;

type DbConnectionViolation = {
  line: number;
  message: string;
};

function lineOf(source: string, index: number): number {
  return source.slice(0, index).split("\n").length;
}

export type { DbConnectionViolation };
export const DATABASE_TLS_MODULE = "packages/db/src/connection/database-tls.ts";

/** Violations in one source file. `path` is repo-relative with forward slashes. */
export function findDbConnectionViolations(source: string, path: string): DbConnectionViolation[] {
  if (path === DATABASE_TLS_MODULE) {
    return [];
  }
  const violations: DbConnectionViolation[] = [];

  if (PG_IMPORT.test(source)) {
    for (const match of source.matchAll(CONSTRUCTOR)) {
      const argumentsStart = (match.index ?? 0) + match[0].length;
      if (!CONFIGURED_ARGUMENT.test(source.slice(argumentsStart))) {
        violations.push({
          line: lineOf(source, match.index ?? 0),
          message: `${match[0].replace(TRAILING_OPEN_PAREN_PATTERN, "")} must take { ...pgConnectionConfig(url) } from @bondery/db, so TLS comes from DATABASE_SSL_*`,
        });
      }
    }
  }

  const insecure = INSECURE_TLS.exec(source);
  if (insecure) {
    violations.push({
      line: lineOf(source, insecure.index),
      message:
        "rejectUnauthorized: false turns off certificate checks. Postgres TLS modes live in @bondery/db (DATABASE_SSL_MODE=require)",
    });
  }

  if (path.endsWith("prisma.config.ts") && !source.includes("prismaCliUrl(")) {
    violations.push({
      line: 1,
      message:
        "prisma.config.ts must build the datasource URL with prismaCliUrl(url) from database-tls",
    });
  }

  const libpq = LIBPQ_TLS_IN_URL.exec(source);
  if (libpq && path.endsWith("prisma.config.ts")) {
    violations.push({
      line: lineOf(source, libpq.index),
      message:
        "Prisma's schema engine ignores sslmode=verify-* and sslrootcert without an error. Use prismaCliUrl(url)",
    });
  }

  return violations;
}
