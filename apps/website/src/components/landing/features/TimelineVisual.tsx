"use client";

import { PersonChip } from "@bondery/mantine-next";
import visuals from "@bondery/translations/locales/en/platform/website/WebsiteLandingVisuals.json" with {
  type: "json",
};
import { Box, Group, Paper, Stack, Text, Timeline } from "@mantine/core";
import type { CSSProperties } from "react";
import { Reveal } from "./Reveal";
import { SAMPLE_PEOPLE, type SamplePersonId } from "./sample-people";

/*
 * A static copy of the webapp's interactions timeline
 * (`apps/webapp/src/components/interactions/InteractionsList.tsx` and `ActivityCard.tsx`):
 * a Mantine Timeline (bullet 12, line 2, default-border colour) of bordered cards with a
 * tinted emoji strip for the interaction type, a bold title, a short date, a dimmed note and
 * the participants as `PersonChip`s. Type colours and emoji come from the webapp's
 * `ACTIVITY_TYPE_CONFIG`. The real card's actions menu is left out: this is decorative and
 * sits inside an `aria-hidden` tile, so nothing here may be focusable.
 */

/*
 * `--tl-color` is the webapp's line colour. Mantine spaces timeline items (and draws the line
 * between them) with `--mantine-spacing-xl`; a tighter value here fits three cards in the tile.
 */
const TIMELINE_LINE_VARS = {
  "--mantine-spacing-xl": "10px",
  "--tl-color": "var(--mantine-color-default-border)",
} as CSSProperties;

type TimelineEntry = {
  /** `ACTIVITY_TYPE_CONFIG[type]` in the webapp. */
  type: { color: string; emoji: string };
  date: string;
  note: string;
  people: readonly SamplePersonId[];
  title: string;
};

const ENTRIES: readonly TimelineEntry[] = [
  {
    date: visuals.Timeline.Coffee.Date,
    note: visuals.Timeline.Coffee.Note,
    people: ["ada"],
    title: visuals.Timeline.Coffee.Title,
    type: { color: "orange", emoji: "☕" }, // Coffee
  },
  {
    date: visuals.Timeline.Call.Date,
    note: visuals.Timeline.Call.Note,
    people: ["alan"],
    title: visuals.Timeline.Call.Title,
    type: { color: "blue", emoji: "📞" }, // Call
  },
  {
    date: visuals.Timeline.Party.Date,
    note: visuals.Timeline.Party.Note,
    people: ["grace", "margaret"],
    title: visuals.Timeline.Party.Title,
    type: { color: "pink", emoji: "🎉" }, // Party/Social
  },
];

function toPreview(id: SamplePersonId) {
  const { name, photo } = SAMPLE_PEOPLE[id];
  const [firstName = "", ...rest] = name.split(" ");

  return { avatar: photo, firstName, id, lastName: rest.join(" ") };
}

function TimelineCard({ entry }: { entry: TimelineEntry }) {
  return (
    <Paper
      className="w-full"
      p={0}
      radius="md"
      shadow="none"
      style={{
        backgroundColor: "light-dark(var(--mantine-color-white), var(--mantine-color-dark-6))",
        overflow: "hidden",
      }}
      withBorder
    >
      <Group align="stretch" gap={0} wrap="nowrap">
        <Box
          bg={`var(--mantine-color-${entry.type.color}-light)`}
          style={{
            alignItems: "center",
            display: "flex",
            flexShrink: 0,
            fontSize: 16,
            justifyContent: "center",
            width: 40,
          }}
        >
          {entry.type.emoji}
        </Box>

        <Stack gap={4} px="xs" py={8} style={{ flex: 1, minWidth: 0 }}>
          <Stack gap={0}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-2">
              <Text fw={700} size="sm">
                {entry.title}
              </Text>
              <Text c="dimmed" className="shrink-0" size="xs">
                {entry.date}
              </Text>
            </div>
            <Text c="dimmed" size="xs" truncate>
              {entry.note}
            </Text>
          </Stack>

          <Group gap={4} wrap="wrap">
            {entry.people.map((id) => (
              <PersonChip key={id} person={toPreview(id)} size="sm" />
            ))}
          </Group>
        </Stack>
      </Group>
    </Paper>
  );
}

/** A contact's interaction history, as the webapp's timeline shows it. */
export function TimelineVisual() {
  return (
    <div className="w-full max-w-sm">
      <Timeline active={ENTRIES.length} bulletSize={12} lineWidth={2} style={TIMELINE_LINE_VARS}>
        {ENTRIES.map((entry, index) => (
          <Timeline.Item key={entry.title}>
            <Reveal delay={index * 0.12}>
              <TimelineCard entry={entry} />
            </Reveal>
          </Timeline.Item>
        ))}
      </Timeline>
    </div>
  );
}
