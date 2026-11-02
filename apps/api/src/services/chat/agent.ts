import type { ServerResponse } from "node:http";
import { isStepCount, type ModelMessage, streamText } from "ai";
import type { DomainContext } from "../../domains/_shared/context.js";
import {
  buildToolActivity,
  type ChatToolActivity,
  isHardDeleteTool,
  resolveToolKind,
} from "./activity.js";
import { createChatTools } from "./create-chat-tools.js";
import type { ChatModelId } from "./models.js";
import { getChatModel } from "./provider.js";
import { buildChatSystemPrompt } from "./system-prompt.js";

/**
 * Records what the agent did during one turn, in product language.
 *
 * The route stores `activities` on the assistant message and reads
 * `writeInterrupted` after an abort, so a reload can say that a save may
 * already have landed.
 */
export interface ChatActivityTracker {
  activities: ChatToolActivity[];
  /** Tool names currently executing. */
  inFlight: Set<string>;
  /** Tool input keyed by tool name, used as a fallback label. */
  inputs: Map<string, unknown>;
  /** Text seen so far, including the step that was cut off. */
  text: string;
  writeInterrupted: boolean;
}

export function createChatActivityTracker(): ChatActivityTracker {
  return {
    activities: [],
    inFlight: new Set(),
    inputs: new Map(),
    text: "",
    writeInterrupted: false,
  };
}

/** Marks an in-flight write as possibly landed. Call this when a stream stops early. */
export function markWriteInterrupted(tracker: ChatActivityTracker): void {
  for (const toolName of tracker.inFlight) {
    if (resolveToolKind(toolName) === "write") {
      tracker.writeInterrupted = true;
      return;
    }
  }
}

export interface RunChatAgentOptions {
  abortSignal?: AbortSignal;
  apiKey?: string;
  modelId?: ChatModelId;
  tracker?: ChatActivityTracker;
}

export interface ChatAgentResult {
  pipeUIMessageStreamToResponse: (
    response: ServerResponse,
    options?: { onEnd?: (event: { isAborted: boolean; isCancelled?: true }) => void },
  ) => Promise<void>;
  text: PromiseLike<string>;
}

/**
 * Runs the AI chat agent with the given messages and domain context.
 * Returns a streaming text response using the Vercel AI SDK.
 */
export function runChatAgent(
  messages: ModelMessage[],
  ctx: DomainContext,
  options: RunChatAgentOptions = {},
): ChatAgentResult {
  const today = new Date().toISOString().split("T")[0];
  const tracker = options.tracker ?? createChatActivityTracker();

  return streamText({
    abortSignal: options.abortSignal,
    instructions: buildChatSystemPrompt({ myselfPersonId: ctx.user.id, today }),
    messages,
    model: getChatModel(options.apiKey, options.modelId),
    onChunk: ({ chunk }) => {
      if (chunk.type === "text-delta") {
        tracker.text += chunk.text;
      }
    },
    onToolExecutionEnd: (event) => {
      const toolName = event.toolCall.toolName;
      tracker.inFlight.delete(toolName);

      if (event.toolOutput.type !== "tool-result") {
        tracker.inputs.delete(toolName);
        return;
      }

      tracker.activities.push(
        buildToolActivity(toolName, event.toolOutput.output ?? tracker.inputs.get(toolName)),
      );
      tracker.inputs.delete(toolName);
    },
    onToolExecutionStart: (event) => {
      const toolName = event.toolCall.toolName;
      tracker.inFlight.add(toolName);
      tracker.inputs.set(toolName, event.toolCall.input);
    },
    stopWhen: isStepCount(10),
    toolApproval: ({ toolCall }) =>
      isHardDeleteTool(toolCall.toolName) ? "user-approval" : undefined,
    tools: createChatTools(ctx),
  });
}
