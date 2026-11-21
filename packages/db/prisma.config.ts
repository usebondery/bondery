import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

import { prismaCliUrl } from "./src/connection/database-tls.ts";

const packageRoot = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(packageRoot, ".env.local") });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

export default defineConfig({
  datasource: {
    // The Prisma schema engine has its own TLS parameters; prismaCliUrl translates
    // DATABASE_SSL_* into them (see src/connection/database-tls.ts).
    url: prismaCliUrl(databaseUrl),
  },
  migrations: {
    path: "prisma/migrations",
  },
  schema: "prisma",
});
