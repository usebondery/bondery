import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DATABASE_TLS_MODULE, findDbConnectionViolations } from "../../scripts/db-connections.ts";

const PG_IMPORT = 'import { Pool, Client } from "pg";\n';

describe("check-db-connections rules", () => {
  it("accepts pg connections that spread pgConnectionConfig", () => {
    const source = `${PG_IMPORT}const pool = new Pool({ ...pgConnectionConfig(url), max: 10 });\nconst client = new Client({ ...pgConnectionConfig(url) });`;
    assert.deepEqual(findDbConnectionViolations(source, "packages/db/src/x.ts"), []);
  });

  it("rejects a pg Pool built from a bare connection string", () => {
    const source = `${PG_IMPORT}const pool = new Pool({ connectionString: url });`;
    const [violation] = findDbConnectionViolations(source, "packages/db/src/x.ts");
    assert.equal(violation?.line, 2);
    assert.match(violation?.message ?? "", /pgConnectionConfig/);
  });

  it("rejects pg-boss without pgConnectionConfig", () => {
    const source = 'import { PgBoss } from "pg-boss";\nconst boss = new PgBoss(url);';
    assert.equal(findDbConnectionViolations(source, "apps/api/src/lib/jobs/boss.ts").length, 1);
  });

  it("ignores Client classes from other libraries", () => {
    const source =
      'import { Client } from "@modelcontextprotocol/sdk/client";\nconst c = new Client(info);';
    assert.deepEqual(findDbConnectionViolations(source, "apps/api/src/x.ts"), []);
  });

  it("rejects turning certificate checks off by hand", () => {
    const source = "const tls = { rejectUnauthorized: false };";
    assert.equal(findDbConnectionViolations(source, "apps/api/src/x.ts").length, 1);
  });

  it("lets the TLS module itself define the require mode", () => {
    const source = `${PG_IMPORT}return { ssl: { rejectUnauthorized: false } };`;
    assert.deepEqual(findDbConnectionViolations(source, DATABASE_TLS_MODULE), []);
  });

  it("requires prisma.config.ts to use prismaCliUrl", () => {
    const source =
      "export default defineConfig({ datasource: { url: process.env.DATABASE_URL } });";
    assert.match(
      findDbConnectionViolations(source, "packages/db/prisma.config.ts")[0]?.message ?? "",
      /prismaCliUrl/,
    );
  });

  it("rejects libpq TLS parameters that Prisma ignores silently", () => {
    const source =
      "const url = `${base}?sslmode=verify-full&sslrootcert=/ca.crt`;\nexport default defineConfig({ datasource: { url: prismaCliUrl(url) } });";
    assert.match(
      findDbConnectionViolations(source, "packages/db/prisma.config.ts")[0]?.message ?? "",
      /ignores/,
    );
  });
});
