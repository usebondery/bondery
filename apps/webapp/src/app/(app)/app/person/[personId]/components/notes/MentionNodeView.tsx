"use client";

import { PersonChip } from "@bondery/mantine-next";
import { type NodeViewProps, NodeViewWrapper } from "@tiptap/react";

/**
 * Inline NodeView for the Mention extension.
 * Renders the mentioned person as a PersonChip Badge directly in the editor.
 */
export function MentionNodeView({ node }: NodeViewProps) {
  const { id, label, avatar, headline, location } = node.attrs as {
    id: string;
    label: string;
    avatar: string | null;
    headline: string | null;
    location: string | null;
  };

  return (
    <NodeViewWrapper
      as="span"
      contentEditable={false}
      style={{ display: "inline-block", verticalAlign: "middle" }}
    >
      <PersonChip
        isClickable={true}
        openInNewTab={true}
        person={{
          avatar: avatar || null,
          firstName: label,
          headline: headline || null,
          id,
          lastName: null,
          location: location || null,
        }}
        showHoverCard={true}
        size="sm"
      />
    </NodeViewWrapper>
  );
}
