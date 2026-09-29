import { randomUUID } from "node:crypto";
import { tool } from "ai";
import type { z } from "zod";
import type { DomainContext } from "../../domains/_shared/context.js";
import { formatToolDomainError } from "./domain-context.js";

export function chatTool<TSchema extends z.ZodType>(
  ctx: DomainContext,
  options: {
    description: string;
    execute: (args: z.infer<TSchema>) => Promise<unknown>;
    inputSchema: TSchema;
  },
) {
  return tool({
    description: options.description,
    execute: async (args: z.infer<TSchema>) => {
      try {
        return await options.execute(args);
      } catch (error) {
        return formatToolDomainError(error, ctx.requestId ?? randomUUID());
      }
    },
    inputSchema: options.inputSchema,
  });
}
