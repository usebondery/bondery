"use client";

import { PersonChip } from "@bondery/mantine-next";
import { type NodeViewProps, NodeViewWrapper } from "@tiptap/react";

function attrString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export type PersonMentionAttrs = {
  avatar?: string | null;
  firstName?: string | null;
  headline?: string | null;
  id?: string | null;
  label?: string | null;
  lastName?: string | null;
  location?: string | null;
  mentionSuggestionChar?: string | null;
};

/**
 * Inline NodeView for the Mention extension.
 * Renders the mentioned person as a PersonChip Badge directly in the editor.
 */
export function MentionNodeView({ node }: NodeViewProps) {
  const attrs = node.attrs as PersonMentionAttrs;
  const firstName = attrString(attrs.firstName);
  const lastName = attrString(attrs.lastName);
  const label = attrString(attrs.label);
  const id = attrString(attrs.id);

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
          avatar: attrString(attrs.avatar) || null,
          firstName: firstName || label || id,
          headline: attrString(attrs.headline) || null,
          id,
          lastName: lastName || null,
          location: attrString(attrs.location) || null,
        }}
        showHoverCard={true}
        size="sm"
      />
    </NodeViewWrapper>
  );
}
