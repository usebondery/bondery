"use client";

import { useState } from "react";
import { Badge, Popover } from "@mantine/core";
import { DatePicker } from "@mantine/dates";
import { IconCalendar } from "@tabler/icons-react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useDateFormatter as useFormatter } from "@/lib/i18n/useDateFormatter";
type InlineDateDisplayProps =
  | (NodeViewProps & { isDisplayOnly?: never })
  | { isDisplayOnly: true; timestamp: string };

/**
 * Renders a localised date badge.
 *
 * Two modes:
 * - **Editor mode** (default): used as a Tiptap NodeView. Clicking the badge
 *   opens a DatePicker popover so the user can change the date.
 * - **Display-only mode** (`isDisplayOnly={true}`): used outside the editor
 *   (e.g. in the AI chat). Renders a non-interactive badge from a plain
 *   `timestamp` prop. No Tiptap wrapper, no popover.
 */
export function InlineDateDisplay(props: InlineDateDisplayProps) {
  const formatter = useFormatter();
  const [opened, setOpened] = useState(false);

  if (props.isDisplayOnly) {
    const date = new Date(props.timestamp);
    const display = formatter.dateTime(date, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return (
      <span style={{ display: "inline-block", verticalAlign: "middle" }}>
        <Badge
          variant="outline"
          size="sm"
          leftSection={<IconCalendar size={12} stroke={1.5} />}
          styles={{ label: { textTransform: "none", fontWeight: 400 } }}
        >
          {display}
        </Badge>
      </span>
    );
  }

  // Editor mode — Tiptap NodeView
  const { node, updateAttributes } = props;
  const { timestamp } = node.attrs as { timestamp: string };
  const date = new Date(timestamp);
  const display = formatter.dateTime(date, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return (
    <NodeViewWrapper
      as="span"
      contentEditable={false}
      style={{ display: "inline-block", verticalAlign: "middle" }}
    >
      <Popover
        opened={opened}
        onChange={setOpened}
        withinPortal
        position="bottom-start"
        shadow="md"
      >
        <Popover.Target>
          <Badge
            variant="outline"
            size="sm"
            leftSection={<IconCalendar size={12} stroke={1.5} />}
            styles={{
              label: { textTransform: "none", fontWeight: 400 },
              root: { cursor: "pointer" },
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpened((o) => !o);
            }}
          >
            {display}
          </Badge>
        </Popover.Target>
        <Popover.Dropdown p="xs">
          <DatePicker
            value={date}
            onChange={(newDate) => {
              if (newDate) {
                updateAttributes({ timestamp: new Date(newDate).toISOString() });
                setOpened(false);
              }
            }}
          />
        </Popover.Dropdown>
      </Popover>
    </NodeViewWrapper>
  );
}
