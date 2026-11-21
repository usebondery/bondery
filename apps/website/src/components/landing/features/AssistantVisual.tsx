"use client";

import { LogoIcon } from "@bondery/mantine-next";
import visuals from "@bondery/translations/locales/en/platform/website/WebsiteLandingVisuals.json" with {
  type: "json",
};
import { Badge, Group, Indicator, Text, ThemeIcon } from "@mantine/core";
import { IconCheck, IconCoffee } from "@tabler/icons-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { formatText } from "@/lib/i18n/message";
import {
  PersonAvatar,
  personBirthday,
  personHeadline,
  SAMPLE_PEOPLE,
  type SamplePersonId,
} from "./sample-people";
import { Surface } from "./visuals";

type Chip = { person: SamplePersonId; detail: string };
type LoggedInteraction = { person: SamplePersonId; title: string; note: string };

type Scenario = {
  question: string;
  answer: string;
  chips?: readonly Chip[];
  logged?: LoggedInteraction;
};

const chip = (person: SamplePersonId, detail: string = personHeadline(person)): Chip => ({
  detail,
  person,
});

/*
 * One scenario per job the assistant does: find, recall, identify, remind, log,
 * and search by place or role. Everyone comes from the shared sample cast; headlines
 * are verbatim, while places and topics are invented and harmless.
 */
const SCENARIO_COPY = visuals.Assistant.Scenarios;

const SCENARIOS: readonly Scenario[] = [
  {
    answer: SCENARIO_COPY.UxDesign.Answer,
    chips: [chip("whitney"), chip("limor")],
    question: SCENARIO_COPY.UxDesign.Question,
  },
  {
    answer: SCENARIO_COPY.Grace.Answer,
    question: SCENARIO_COPY.Grace.Question,
  },
  {
    answer: SCENARIO_COPY.Katherine.Answer,
    chips: [chip("katherine")],
    question: SCENARIO_COPY.Katherine.Question,
  },
  {
    answer: formatText(SCENARIO_COPY.Alan.Answer, { birthday: personBirthday("alan") }),
    question: SCENARIO_COPY.Alan.Question,
  },
  {
    answer: SCENARIO_COPY.LogCoffee.Answer,
    logged: {
      note: SCENARIO_COPY.LogCoffee.LoggedNote,
      person: "ada",
      title: SCENARIO_COPY.LogCoffee.LoggedTitle,
    },
    question: SCENARIO_COPY.LogCoffee.Question,
  },
  {
    answer: SCENARIO_COPY.Thailand.Answer,
    chips: [
      chip("margaret", SCENARIO_COPY.Thailand.Bangkok),
      chip("hedy", SCENARIO_COPY.Thailand.ChiangMai),
    ],
    question: SCENARIO_COPY.Thailand.Question,
  },
  {
    answer: SCENARIO_COPY.Investors.Answer,
    chips: [chip("sheryl"), chip("marissa")],
    question: SCENARIO_COPY.Investors.Question,
  },
];

const CYCLE_MS = 5500;

/**
 * A chat that cycles through the questions people ask their network, each answered
 * from their own contacts. It holds still when the visitor prefers reduced motion.
 */
export function AssistantVisual() {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduceMotion) {
      return;
    }
    const interval = setInterval(() => {
      setIndex((current) => (current + 1) % SCENARIOS.length);
    }, CYCLE_MS);
    return () => clearInterval(interval);
  }, [reduceMotion]);

  const scenario = SCENARIOS[index];
  if (!scenario) {
    return null;
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      {/* Fixed height, so the tile does not jump between short and long answers. */}
      <div className="min-h-assistant sm:min-h-assistant-sm">
        <AnimatePresence mode="wait">
          <motion.div
            animate={{ opacity: 1 }}
            className="flex flex-col gap-3"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            key={index}
            transition={{ duration: reduceMotion ? 0 : 0.25 }}
          >
            <div className="flex justify-end">
              <div
                className="max-w-chat rounded-2xl rounded-br-sm px-4 py-2.5"
                style={{ backgroundColor: "var(--mantine-primary-color-filled)" }}
              >
                <Text c="white" size="sm">
                  {scenario.question}
                </Text>
              </div>
            </div>

            <motion.div
              animate={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
              transition={{ delay: reduceMotion ? 0 : 0.6, duration: reduceMotion ? 0 : 0.3 }}
            >
              <Group align="flex-end" gap="sm" wrap="nowrap">
                <ThemeIcon radius="xl" size={32} variant="light">
                  <LogoIcon size={16} />
                </ThemeIcon>
                <Surface
                  className="min-w-0 flex-1"
                  radius={0}
                  style={{ borderRadius: "1rem 1rem 0.25rem 1rem" }}
                >
                  <Text size="sm">{scenario.answer}</Text>
                  {scenario.chips ? (
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      {scenario.chips.map((item) => (
                        <PersonChip detail={item.detail} key={item.person} person={item.person} />
                      ))}
                    </div>
                  ) : null}
                  {scenario.logged ? <LoggedCard interaction={scenario.logged} /> : null}
                </Surface>
              </Group>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function PersonChip({ person, detail }: Chip) {
  return (
    <div className="border-line min-w-0 flex-1 rounded-lg border px-2.5 py-2">
      <Group gap="xs" wrap="nowrap">
        <PersonAvatar person={person} size={30} />
        <div className="min-w-0">
          <Text fw={600} size="xs" truncate>
            {SAMPLE_PEOPLE[person].name}
          </Text>
          <Text c="dimmed" size="xs" truncate>
            {detail}
          </Text>
        </div>
      </Group>
    </div>
  );
}

function LoggedCard({ interaction }: { interaction: LoggedInteraction }) {
  return (
    <div className="border-line mt-3 rounded-lg border px-2.5 py-2">
      <Group gap="xs" justify="space-between" wrap="nowrap">
        <Group className="min-w-0" gap="xs" wrap="nowrap">
          <Indicator
            color="yellow"
            inline
            label={<IconCoffee size={9} stroke={2.5} />}
            offset={3}
            position="bottom-end"
            size={14}
            withBorder
          >
            <PersonAvatar person={interaction.person} size={30} />
          </Indicator>
          <div className="min-w-0">
            <Text fw={600} size="xs" truncate>
              {interaction.title}
            </Text>
            <Text c="dimmed" size="xs" truncate>
              {interaction.note}
            </Text>
          </div>
        </Group>
        <Badge
          className="shrink-0"
          color="teal"
          leftSection={<IconCheck size={12} />}
          size="sm"
          tt="none"
          variant="light"
          visibleFrom="sm"
        >
          {visuals.Assistant.Logged}
        </Badge>
      </Group>
    </div>
  );
}
