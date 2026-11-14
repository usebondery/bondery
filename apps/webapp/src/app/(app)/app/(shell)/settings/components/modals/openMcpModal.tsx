"use client";

import { modals } from "@mantine/modals";
import { createModalId } from "@/lib/modals";
import { McpModal } from "./McpModal";
import { McpModalTitle } from "./McpModalTitle";

export function openMcpModal(options: { apiBaseUrl: string }) {
  const modalId = createModalId("mcp");

  modals.open({
    children: <McpModal apiBaseUrl={options.apiBaseUrl} modalId={modalId} />,
    modalId,
    size: "lg",
    title: <McpModalTitle />,
  });
}
