"use client";

import { PersonChip } from "@bondery/mantine-next";
import { type NodeViewProps, NodeViewWrapper } from "@tiptap/react";

function attrString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * Inline NodeView for the Mention extension.
 * Renders the mentioned person as a PersonChip Badge directly in the editor.
 */
export function MentionNodeView({ node }: NodeViewProps) {
  const firstName = attrString(node.attrs.firstName);
  const lastName = attrString(node.attrs.lastName);
  const label = attrString(node.attrs.label);
  const id = attrString(node.attrs.id);

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
          avatar: attrString(node.attrs.avatar) || null,
          firstName: firstName || label || id,
          headline: attrString(node.attrs.headline) || null,
          id,
          lastName: lastName || null,
          location: attrString(node.attrs.location) || null,
        }}
        showHoverCard={true}
        size="sm"
      />
    </NodeViewWrapper>
  );
}
