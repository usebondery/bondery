"use client";

import { Checkbox, Group } from "@mantine/core";
import { NodeViewContent, type NodeViewProps, NodeViewWrapper } from "@tiptap/react";

/**
 * NodeView for TaskItem extension.
 * Renders each task list entry with a Mantine Checkbox instead of the
 * native <input type="checkbox">, keeping the visual style consistent.
 * Checked items also get a strikethrough on their text.
 */
export function TaskItemNodeView({ node, updateAttributes, editor }: NodeViewProps) {
  const isChecked = Boolean(node.attrs.checked);

  return (
    <NodeViewWrapper
      as="li"
      data-checked={isChecked ? "true" : "false"}
      data-type="taskItem"
      style={{
        listStyle: "none",
        listStyleType: "none",
        marginInlineStart: 0,
        paddingInlineStart: 0,
      }}
    >
      <Group align="flex-start" gap="xs" style={{ minHeight: "1.5rem" }} wrap="nowrap">
        <Checkbox
          checked={isChecked}
          onChange={() => {}}
          onMouseDown={(event) => {
            event.preventDefault();
            if (editor.isEditable) {
              updateAttributes({ checked: !isChecked });
            }
          }}
          // Use readOnly + onMouseDown to avoid editor blur before the attribute update settles.
          // preventDefault on mousedown keeps the editor focused so onBlur never fires prematurely.
          readOnly
          size="sm"
          styles={{ input: { cursor: editor.isEditable ? "pointer" : "default" } }}
        />
        <NodeViewContent
          as="div"
          style={{
            flex: 1,
            minWidth: 0,
            opacity: isChecked ? 0.6 : 1,
            textDecoration: isChecked ? "line-through" : "none",
          }}
        />
      </Group>
    </NodeViewWrapper>
  );
}
