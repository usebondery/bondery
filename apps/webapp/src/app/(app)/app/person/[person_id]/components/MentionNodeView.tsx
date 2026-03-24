"use client";

import { PersonChip } from "@bondery/mantine-next";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";

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
        person={{
          id,
          firstName: label,
          lastName: null,
          avatar: avatar || null,
          headline: headline || null,
          location: location || null,
        }}
        size="sm"
        isClickable={true}
        openInNewTab={true}
        showHoverCard={true}
      />
    </NodeViewWrapper>
  );
}
