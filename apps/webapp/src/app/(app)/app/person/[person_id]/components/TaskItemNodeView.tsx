"use client";

import { Checkbox, Group } from "@mantine/core";
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";

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
      data-type="taskItem"
      data-checked={isChecked ? "true" : "false"}
      style={{
        listStyle: "none",
        listStyleType: "none",
        paddingInlineStart: 0,
        marginInlineStart: 0,
      }}
    >
      <Group gap="xs" align="flex-start" wrap="nowrap" style={{ minHeight: "1.5rem" }}>
        <Checkbox
          size="sm"
          checked={isChecked}
          // Use readOnly + onMouseDown to avoid editor blur before the attribute update settles.
          // preventDefault on mousedown keeps the editor focused so onBlur never fires prematurely.
          readOnly
          onChange={() => {}}
          onMouseDown={(event) => {
            event.preventDefault();
            if (editor.isEditable) {
              updateAttributes({ checked: !isChecked });
            }
          }}
          styles={{ input: { cursor: editor.isEditable ? "pointer" : "default" } }}
        />
        <NodeViewContent
          as="div"
          style={{
            flex: 1,
            minWidth: 0,
            textDecoration: isChecked ? "line-through" : "none",
            opacity: isChecked ? 0.6 : 1,
          }}
        />
      </Group>
    </NodeViewWrapper>
  );
}
