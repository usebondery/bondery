import { z } from "zod";
import { createdAtSchema } from "#entities/_shared/schema.js";
import { EXAMPLE_LIVENESS_STATUS_RESPONSE } from "#openapi/fixtures/schema-examples.js";

const buildMetadataFields = {
  gitSha: z.string().optional().describe("Git commit SHA of this build"),
  version: z.string().optional().describe("Application version of this build"),
};

export const livenessStatusSchema = z
  .object({
    status: z.literal("ok").describe("Service is live"),
    timestamp: createdAtSchema.describe("Time this status was produced"),
    ...buildMetadataFields,
  })
  .meta({ example: EXAMPLE_LIVENESS_STATUS_RESPONSE });

export const readinessStatusOkSchema = z.object({
  status: z.literal("ok").describe("Service is ready"),
  timestamp: createdAtSchema.describe("Time this status was produced"),
  ...buildMetadataFields,
});

export const readinessStatusUnhealthySchema = z.object({
  error: z.string().describe("Why the service is not ready"),
  status: z.literal("unhealthy").describe("Service is not ready"),
  timestamp: createdAtSchema.describe("Time this status was produced"),
  ...buildMetadataFields,
});

export const readinessStatusSchema = z.union([
  readinessStatusOkSchema,
  readinessStatusUnhealthySchema,
]);
