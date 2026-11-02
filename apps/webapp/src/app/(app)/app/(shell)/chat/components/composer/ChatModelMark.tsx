"use client";

import { BonderyIcon } from "@bondery/branding/react";
import type { ChatModelId } from "@bondery/schemas";
import Image from "next/image";

/**
 * Brand marks for the model picker.
 *
 * Auto uses the real `BonderyIcon`. A local copy of the chip dropped the
 * gradient and the white lattice, so the mark stays in the branding package.
 * The Anthropic file is one filled orange shape, so it holds at this size.
 */

const ANTHROPIC_MARK_PATH = "/icons/brands/anthropic.svg";

export function AnthropicMark({ size = 14 }: { size?: number }) {
  return (
    <Image
      alt=""
      height={size}
      src={ANTHROPIC_MARK_PATH}
      style={{ display: "block", flexShrink: 0 }}
      width={size}
    />
  );
}

export function ChatModelMark({ modelId, size = 14 }: { modelId: ChatModelId; size?: number }) {
  if (modelId === "auto") {
    return <BonderyIcon height={size} style={{ display: "block", flexShrink: 0 }} width={size} />;
  }

  return <AnthropicMark size={size} />;
}
