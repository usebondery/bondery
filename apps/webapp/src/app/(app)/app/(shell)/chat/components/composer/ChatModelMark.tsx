"use client";

import { AnthropicIcon, BonderyIcon } from "@bondery/branding/react";
import type { ChatModelId } from "@bondery/schemas";

/**
 * Brand marks for the model picker.
 *
 * Auto uses `BonderyIcon`. Claude models use `AnthropicIcon`, which renders
 * the official SVG in `@bondery/branding`.
 */

export function AnthropicMark({ size = 14 }: { size?: number }) {
  return <AnthropicIcon size={size} style={{ display: "block", flexShrink: 0 }} />;
}

export function ChatModelMark({ modelId, size = 14 }: { modelId: ChatModelId; size?: number }) {
  if (modelId === "auto") {
    return <BonderyIcon height={size} style={{ display: "block", flexShrink: 0 }} width={size} />;
  }

  return <AnthropicMark size={size} />;
}
