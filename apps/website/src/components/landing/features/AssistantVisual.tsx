"use client";

import { LogoIcon } from "@bondery/mantine-next";
import { Badge, Group, Indicator, Text, ThemeIcon } from "@mantine/core";
import { IconCheck, IconCoffee } from "@tabler/icons-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { PersonAvatar, SAMPLE_PEOPLE, type SamplePersonId } from "./sample-people";
import { Surface } from "./visuals";

type Chip = { person: SamplePersonId; detail: string };
type LoggedInteraction = { person: SamplePersonId; title: string; note: string };

type Scenario = {
  question: string;
  answer: string;
  chips?: readonly Chip[];
  logged?: LoggedInteraction;
};

const chip = (person: SamplePersonId, detail: string = SAMPLE_PEOPLE[person].headline): Chip => ({
  detail,
  person,
});

/*
 * One scenario per job the assistant does: find, recall, identify, remind, log,
 * and search by place or role. Everyone comes from the shared sample cast; headlines
 * are verbatim, while places and topics are invented and harmless.
 */
const SCENARIOS: readonly Scenario[] = [
  {
    answer: "Two people in your network.",
    chips: [chip("whitney"), chip("limor")],
    question: "Who could help me with UX design?",
  },
  {
    answer: "Oct 12, over coffee in Boston. She recommended a book on leadership.",
    question: "What did I last talk about with Grace?",
  },
  {
    answer: "You met at a science talk in Houston.",
    chips: [chip("katherine")],
    question: "Who is Katherine Johnson and where do I know her from?",
  },
  {
    answer: `${SAMPLE_PEOPLE.alan.birthday}. He loves running. Try a pair of trail shoes.`,
    question: "When is Alan's birthday? Any gift ideas?",
  },
  {
    answer: "Logged to Ada's timeline.",
    logged: { note: "Her upcoming launch", person: "ada", title: "Coffee with Ada" },
    question: "I met Ada for coffee and talked about her upcoming launch.",
  },
  {
    answer: "Two people.",
    chips: [chip("margaret", "Bangkok"), chip("hedy", "Chiang Mai")],
    question: "I'm visiting Thailand. Who do I know there?",
  },
  {
    answer: "Two investors.",
    chips: [chip("sheryl"), chip("marissa")],
    question: "What VC investors do I know?",
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

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      {/* Fixed height, so the tile does not jump between short and long answers. */}
      <div className="min-h-[17rem] sm:min-h-[12rem]">
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
                className="max-w-[85%] rounded-2xl rounded-br-sm px-4 py-2.5"
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
                <Surface className="min-w-0 flex-1 rounded-2xl! rounded-bl-sm!">
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
    <Group
      className="min-w-0 flex-1 rounded-lg border border-[var(--mantine-color-default-border)] px-2.5 py-2"
      gap="xs"
      wrap="nowrap"
    >
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
  );
}

function LoggedCard({ interaction }: { interaction: LoggedInteraction }) {
  return (
    <Group
      className="mt-3 rounded-lg border border-[var(--mantine-color-default-border)] px-2.5 py-2"
      gap="xs"
      justify="space-between"
      wrap="nowrap"
    >
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
        Logged
      </Badge>
    </Group>
  );
}
