import { randomUUID } from "node:crypto";
import { agentFeedbackRequestSchema } from "@bondery/schemas";
import type { McpServer } from "@modelcontextprotocol/server";
import type { DomainContext } from "../../../domains/_shared/context.js";
import { agentFeedbackResponseSchema } from "../../../services/assistant-tools/feedback.js";
import { mcpJsonResult, runMcpTool } from "./json.js";
import { mcpToolMeta } from "./mcp-tool-meta.js";

/**
 * Agent defect report. Same delivery path as `POST /me/feedback`, so a report
 * from an assistant lands in the inbox we already read.
 *
 * Not a write tool: it changes no CRM data. A Read only token can report a
 * broken read tool, so this tool uses `runMcpTool`, not `runMcpWriteTool`.
 *
 * See `.agents/skills/bondery-ux/references/common/agent-interfaces.md`.
 */
export function registerFeedbackMcpTools(server: McpServer, ctx: DomainContext): void {
  server.registerTool(
    "create_agent_feedback",
    {
      ...mcpToolMeta("create", "Report a tool problem"),
      description:
        "Report a problem with these tools so the Bondery team can review it. Use this when a tool returns a wrong result, an argument or description is unclear, or a capability you need is missing. Describe the problem, and do not send contact data. Returns a report id.",
      inputSchema: agentFeedbackRequestSchema,
      outputSchema: agentFeedbackResponseSchema,
    },
    async (args) =>
      runMcpTool(ctx, async () => {
        // Loaded on demand: the email renderer is heavy and unused until a
        // report is sent.
        const { sendFeedbackEmail } = await import("../../../services/notifications/feedback.js");
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
        const reply = agentFeedbackResponseSchema.parse({
          message:
            "Report received. The Bondery team will review it. Do not retry the failing call with the same arguments.",
          reportId,
        });
        return mcpJsonResult(reply);
      }),
  );
}
