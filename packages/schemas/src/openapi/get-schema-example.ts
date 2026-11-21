import type { z } from "zod";
import { getRegisteredSchemaExample } from "./schema-example-registry.js";

/** Read an OpenAPI example attached via Zod `.meta({ example })` or the fixture registry. */
export function getSchemaExample(schema: z.ZodType): unknown {
  const registered = getRegisteredSchemaExample(schema);
  if (registered !== undefined) {
    return registered;
  }

  const meta = schema.meta();
  if (meta && typeof meta === "object" && "example" in meta) {
    return meta.example;
  }
  return undefined;
}
