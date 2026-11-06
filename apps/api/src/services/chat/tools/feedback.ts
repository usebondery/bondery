import { randomUUID } from "node:crypto";
import { agentFeedbackRequestSchema } from "@bondery/schemas";
import type { DomainContext } from "../../../domains/_shared/context.js";
import { agentFeedbackResponseSchema } from "../../assistant-tools/feedback.js";
import { chatTool } from "../chat-tool.js";

export function createFeedbackTools(ctx: DomainContext) {
  return {
    create_agent_feedback: chatTool(ctx, {
      description:
        "Report a problem with these tools so the Bondery team can review it. Use this when a tool returns a wrong result, an argument is unclear, or a capability is missing. Describe the problem; do not send contact data.",
      execute: async (args) => {
        // Loaded on demand: the email renderer is heavy and unused until a
        // report is sent.
        const { sendFeedbackEmail } = await import("../../notifications/feedback.js");
        const reportId = randomUUID();
        await sendFeedbackEmail({
          agentReport: {
            actual: args.actual,
            expected: args.expected,
            kind: args.kind,
            requestId: args.requestId,
            toolName: args.toolName,
          },
          generalFeedback: args.generalFeedback,
          npsScore: args.npsScore,
          userEmail: ctx.user.email,
          userId: ctx.user.id,
        });
        return agentFeedbackResponseSchema.parse({
          message: "Report received. The Bondery team will review it.",
          reportId,
        });
      },
      inputSchema: agentFeedbackRequestSchema,
    }),
  };
}
