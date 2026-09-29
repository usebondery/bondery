/** Shared dummy env for API integration tests (no .env file required). */

import { applyApiBootEnv } from "@bondery/helpers/env";

export function loadTestEnv(): void {
  applyApiBootEnv();
  // `.env.development.local` sets NODE_ENV=development. That enables the
  // pino-pretty worker, which keeps the event loop alive after inject tests.
  process.env.NODE_ENV = "test";
}
