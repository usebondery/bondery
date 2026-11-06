import { z } from "zod";

/** Reply to `create_agent_feedback`, shared by MCP and in-app chat. */
export const agentFeedbackResponseSchema = z.object({
  message: z.string(),
  reportId: z.string(),
});

export type AgentFeedbackResponse = z.infer<typeof agentFeedbackResponseSchema>;
