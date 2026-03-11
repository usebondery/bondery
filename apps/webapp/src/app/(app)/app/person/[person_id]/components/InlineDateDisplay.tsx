"use client";

import { useState } from "react";
import { Badge, Popover } from "@mantine/core";
import { DatePicker } from "@mantine/dates";
import { IconCalendar } from "@tabler/icons-react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useFormatter } from "next-intl";

/**
 * Inline NodeView for the InlineDateExtension.
 * Renders the stored timestamp as a localised date badge directly in the editor.
 * Clicking the badge opens a DatePicker popover to change the date.
 */
export function InlineDateDisplay({ node, updateAttributes }: NodeViewProps) {
  const { timestamp } = node.attrs as { timestamp: string };
  const formatter = useFormatter();
  const [opened, setOpened] = useState(false);

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
