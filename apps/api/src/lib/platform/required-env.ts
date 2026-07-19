/** Required API environment variables — single source: env manifest. */

import { getRequiredVarsForTarget } from "@bondery/helpers/env";

export function getApiRequiredEnvVars(
  environment: "production" | "development",
): readonly string[] {
  return getRequiredVarsForTarget("api", environment);
}
