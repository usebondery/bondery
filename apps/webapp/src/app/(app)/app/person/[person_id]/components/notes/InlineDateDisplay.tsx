"use client";

import { Badge, Popover } from "@mantine/core";
import { DatePicker } from "@mantine/dates";
import { IconCalendar } from "@tabler/icons-react";
import { type NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { useState } from "react";
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
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    return (
      <span style={{ display: "inline-block", verticalAlign: "middle" }}>
        <Badge
          leftSection={<IconCalendar size={12} stroke={1.5} />}
          size="sm"
          styles={{ label: { fontWeight: 400, textTransform: "none" } }}
          variant="outline"
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
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <NodeViewWrapper
      as="span"
      contentEditable={false}
      style={{ display: "inline-block", verticalAlign: "middle" }}
    >
      <Popover
        onChange={setOpened}
        opened={opened}
        position="bottom-start"
        shadow="md"
        withinPortal
      >
        <Popover.Target>
          <Badge
            leftSection={<IconCalendar size={12} stroke={1.5} />}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpened((o) => !o);
            }}
            size="sm"
            styles={{
              label: { fontWeight: 400, textTransform: "none" },
              root: { cursor: "pointer" },
            }}
            variant="outline"
          >
            {display}
          </Badge>
        </Popover.Target>
        <Popover.Dropdown p="xs">
          <DatePicker
            onChange={(newDate) => {
              if (newDate) {
                updateAttributes({ timestamp: new Date(newDate).toISOString() });
                setOpened(false);
              }
            }}
            value={date}
          />
        </Popover.Dropdown>
      </Popover>
    </NodeViewWrapper>
  );
}
