"use client";

import { AnthropicIcon } from "@bondery/branding/react";
import { LogoIcon } from "@bondery/mantine-next";
import { Avatar, Badge, Box, Card, Group, Stack, Text } from "@mantine/core";
import { IconCheck, IconClock, IconMessageCircle } from "@tabler/icons-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

type Phase = "answered" | "card" | "exit" | "question" | "saved";

type Frame = {
  /** Offset from the start of the loop, in milliseconds. */
  at: number;
  beat: 0 | 1;
  phase: Phase;
};

const KEYFRAMES: readonly Frame[] = [
  { at: 0, beat: 0, phase: "question" },
  { at: 1000, beat: 0, phase: "answered" },
  { at: 1550, beat: 0, phase: "card" },
  { at: 4400, beat: 1, phase: "question" },
  { at: 5550, beat: 1, phase: "answered" },
  { at: 5790, beat: 1, phase: "saved" },
  { at: 9200, beat: 1, phase: "exit" },
];

const LOOP_MS = 9600;

/** Reduced motion rests here: the read benefit, fully settled. */
const RESTING_FRAME: Frame = { at: 1550, beat: 0, phase: "card" };

const QUESTION = ["Who should I catch up with?", "We had coffee today. Save it."] as const;
const ANSWER = ["Anna. You last talked six weeks ago.", "Saved to Anna's history."] as const;

const HAIRLINE = "light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-4))";
const BUBBLE_SURFACE = "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))";

export function AssistantBriefingAnimation() {
  const reduceMotion = useReducedMotion();
  const [frame, setFrame] = useState<Frame>(KEYFRAMES[0]);

  useEffect(() => {
    if (reduceMotion) {
      return;
    }

    let timers: ReturnType<typeof setTimeout>[] = [];

    const schedule = () => {
      timers.forEach(clearTimeout);
      timers = KEYFRAMES.map((keyframe) => setTimeout(() => setFrame(keyframe), keyframe.at));
    };

    schedule();
    const loop = setInterval(schedule, LOOP_MS);

    return () => {
      clearInterval(loop);
      timers.forEach(clearTimeout);
    };
  }, [reduceMotion]);

  const active = reduceMotion ? RESTING_FRAME : frame;
  const isTyping = active.phase === "question";
  const isSaved = active.phase === "saved" || active.phase === "exit";
  const isLeaving = active.phase === "exit" && !reduceMotion;

  return (
    <Card
      aria-hidden="true"
      padding="lg"
      radius="lg"
      shadow="xl"
      style={{
        aspectRatio: "4/3",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        maxWidth: 500,
        minHeight: 280,
        overflow: "hidden",
        width: "100%",
      }}
      withBorder
    >
      <Stack gap="sm">
        <ConnectionStrip active={active} reduced={Boolean(reduceMotion)} />

        <motion.div
          animate={{ opacity: isLeaving ? 0 : 1 }}
          initial={false}
          transition={{ duration: 0.3 }}
        >
          <Stack gap={6}>
            <QuestionBubble active={active} />
            <AnswerBubble active={active} isTyping={isTyping} />
            <ContactCard isSaved={isSaved} />
          </Stack>
        </motion.div>
      </Stack>
    </Card>
  );
}

/** Assistant → Bondery → assistant, without a wall of text explaining the pipe. */
function ConnectionStrip({ active, reduced }: { active: Frame; reduced: boolean }) {
  const travel =
    reduced || active.phase === "card" || active.phase === "exit"
      ? { left: "50%" }
      : active.phase === "question"
        ? { left: ["10%", "86%"] }
        : { left: ["86%", "10%"] };

  return (
    <Group gap="xs" wrap="nowrap">
      <Group
        gap={4}
        style={{
          border: `1px solid ${HAIRLINE}`,
          borderRadius: 999,
          flexShrink: 0,
          padding: "3px 8px",
        }}
        wrap="nowrap"
      >
        <AnthropicIcon size={11} />
        <Text fw={600} style={{ fontSize: 10, lineHeight: 1.2 }}>
          Claude
        </Text>
      </Group>

      <Box
        style={{
          backgroundColor: HAIRLINE,
          flex: 1,
          height: 1,
          position: "relative",
        }}
      >
        {!reduced && active.phase !== "exit" ? (
          <motion.div
            animate={travel}
            initial={false}
            style={{
              backgroundColor: "var(--mantine-primary-color-filled)",
              borderRadius: 999,
              height: 5,
              marginLeft: -2.5,
              marginTop: -2,
              position: "absolute",
              top: 0,
              width: 5,
            }}
            transition={{ duration: 0.9, ease: "easeInOut" }}
          />
        ) : null}
      </Box>

      <Box
        style={{
          alignItems: "center",
          border: `1px solid ${HAIRLINE}`,
          borderRadius: 8,
          display: "flex",
          flexShrink: 0,
          height: 24,
          justifyContent: "center",
          width: 24,
        }}
      >
        <LogoIcon size={14} />
      </Box>
    </Group>
  );
}

function QuestionBubble({ active }: { active: Frame }) {
  return (
    <Box style={{ display: "flex", justifyContent: "flex-end" }}>
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          initial={{ opacity: 0, y: 8 }}
          key={active.beat}
          style={{ maxWidth: "85%" }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          <Box
            style={{
              backgroundColor: "var(--mantine-primary-color-light)",
              borderBottomRightRadius: 4,
              borderRadius: 10,
              color: "var(--mantine-primary-color-light-color)",
              padding: "6px 10px",
            }}
          >
            <Text fw={500} style={{ fontSize: "clamp(11.5px, 3vw, 13px)", lineHeight: 1.35 }}>
              {QUESTION[active.beat]}
            </Text>
          </Box>
        </motion.div>
      </AnimatePresence>
    </Box>
  );
}

function AnswerBubble({ active, isTyping }: { active: Frame; isTyping: boolean }) {
  return (
    <Box style={{ display: "flex", justifyContent: "flex-start" }}>
      <Box
        style={{
          backgroundColor: BUBBLE_SURFACE,
          border: `1px solid ${HAIRLINE}`,
          borderBottomLeftRadius: 4,
          borderRadius: 10,
          maxWidth: "90%",
          padding: "6px 10px",
        }}
      >
        <Group gap={4} mb={2} wrap="nowrap">
          <AnthropicIcon size={10} />
          <Text c="dimmed" fw={500} style={{ fontSize: 10, lineHeight: 1.2 }}>
            Claude
          </Text>
        </Group>

        <AnimatePresence initial={false} mode="wait">
          {isTyping ? (
            <motion.div
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              key="typing"
              style={{ paddingBottom: 3, paddingTop: 3 }}
              transition={{ duration: 0.15 }}
            >
              <TypingDots />
            </motion.div>
          ) : (
            <motion.div
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              key="answer"
              transition={{ duration: 0.24 }}
            >
              <Text fw={500} style={{ fontSize: "clamp(11.5px, 3vw, 13px)", lineHeight: 1.35 }}>
                {ANSWER[active.beat]}
              </Text>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>
    </Box>
  );
}

function TypingDots() {
  return (
    <Group gap={3} h={13} wrap="nowrap">
      {[0, 1, 2].map((dot) => (
        <motion.div
          animate={{ opacity: [0.25, 1, 0.25] }}
          key={dot}
          style={{
            backgroundColor: "var(--mantine-color-dimmed)",
            borderRadius: 999,
            height: 4,
            width: 4,
          }}
          transition={{
            delay: dot * 0.12,
            duration: 0.9,
            ease: "easeInOut",
            repeat: Number.POSITIVE_INFINITY,
          }}
        />
      ))}
    </Group>
  );
}

function ContactCard({ isSaved }: { isSaved: boolean }) {
  return (
    <Card padding={10} radius="md" shadow="sm" withBorder>
      <Group gap={10} wrap="nowrap">
        <Avatar color="branding-primary" radius="md" size={32} variant="light">
          AK
        </Avatar>

        <Box style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs" justify="space-between" wrap="nowrap">
            <Text fw={600} style={{ fontSize: "clamp(11.5px, 3vw, 13px)" }} truncate>
              Anna Kowalski
            </Text>

            <Box style={{ flexShrink: 0, minWidth: 104, textAlign: "right" }}>
              <AnimatePresence initial={false} mode="wait">
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  initial={{ opacity: 0, y: 4 }}
                  key={isSaved ? "saved" : "due"}
                  transition={{ duration: 0.2 }}
                >
                  {isSaved ? (
                    <Badge
                      color="teal"
                      leftSection={<IconCheck size={10} />}
                      size="xs"
                      variant="light"
                    >
                      In touch today
                    </Badge>
                  ) : (
                    <Badge
                      color="orange"
                      leftSection={<IconClock size={10} />}
                      size="xs"
                      variant="light"
                    >
                      Due a catch-up
                    </Badge>
                  )}
                </motion.div>
              </AnimatePresence>
            </Box>
          </Group>

          <Group gap="xs" justify="space-between" mt={2} wrap="nowrap">
            <Text c="dimmed" style={{ fontSize: 10.5, lineHeight: 1.3 }} truncate>
              Berlin · met at Web Summit
            </Text>

            <Group gap={4} style={{ flexShrink: 0 }} wrap="nowrap">
              <IconMessageCircle size={11} style={{ color: "var(--mantine-color-dimmed)" }} />
              <Text c="dimmed" style={{ fontSize: 10.5 }}>
                Last talked
              </Text>
              <Box style={{ minWidth: 62, textAlign: "right" }}>
                <AnimatePresence initial={false} mode="wait">
                  <motion.div
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    initial={{ opacity: 0, y: 4 }}
                    key={isSaved ? "today" : "weeks"}
                    transition={{ duration: 0.2 }}
                  >
                    <Text fw={600} style={{ fontSize: 10.5 }}>
                      {isSaved ? "today" : "6 weeks ago"}
                    </Text>
                  </motion.div>
                </AnimatePresence>
              </Box>
            </Group>
          </Group>
        </Box>
      </Group>
    </Card>
  );
}
