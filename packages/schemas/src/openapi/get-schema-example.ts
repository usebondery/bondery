import type { z } from "zod";

/** Read an OpenAPI example attached via Zod `.meta({ example })`. */
export function getSchemaExample(schema: z.ZodType): unknown | undefined {
  const meta = schema.meta();
  if (meta && typeof meta === "object" && "example" in meta) {
    return meta.example;
  }
  return undefined;
}
