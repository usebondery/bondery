"use client";

import visuals from "@bondery/translations/locales/en/platform/website/WebsiteLandingVisuals.json" with {
  type: "json",
};
import { Group, Text } from "@mantine/core";
import { IconBrandLinkedin, IconMail } from "@tabler/icons-react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { formatMessage } from "@/lib/i18n/message";
import { PersonAvatar, personHeadline, SAMPLE_PEOPLE, type SamplePersonId } from "./sample-people";
import { Surface } from "./visuals";

/*
 * The "before and after" story for the spreadsheet tile: a plain gray sheet, then the same two
 * people as real contact records. The tile is decorative (`BentoCard` wraps it in
 * `aria-hidden`), so nothing here is focusable and no state is announced.
 *
 * The two layers never cross-fade. The sheet leaves, then the records arrive, so two identical
 * names never sit at two positions at the same time.
 */

type Phase = "records" | "sheet";

type Frame = {
  /** Offset from the start of the loop, in milliseconds. */
  at: number;
  phase: Phase;
};

const KEYFRAMES: readonly Frame[] = [
  { at: 0, phase: "sheet" },
  { at: 1800, phase: "records" },
  { at: 6300, phase: "sheet" },
];

const LOOP_MS = 8400;

/** Reduced motion rests here: both records settled, so the benefit is visible without motion. */
const RESTING_PHASE: Phase = "records";

/** Constant frame height both states fill exactly: sheet 36 + 3×56, records 3×68. */
const FRAME_HEIGHT = 204;
const SHEET_HEADER_HEIGHT = 36;
const SHEET_ROW_HEIGHT = 56;
const RECORD_ROW_HEIGHT = 68;

/** Per-row stagger, so each record lands just after the one above it. */
const ROW_STAGGER_S = 0.08;

const HOUSE_EASE = [0.22, 1, 0.36, 1] as const;

const SHEET_ROWS = [
  { company: "US Navy", person: "grace" as const, when: "Oct 12" },
  { company: "MIT", person: "margaret" as const, when: "Sep 28" },
  { company: "MGM", person: "hedy" as const, when: "Jul 20" },
] as const;

/** The sheet's people, in order, become the records in order. */
const RECORD_ORDER: readonly SamplePersonId[] = SHEET_ROWS.map((row) => row.person);

function metOn(when: string): ReactNode {
  return formatMessage(visuals.Spreadsheet.MetOn, { date: when });
}

/** The gray sheet: three plain columns, no history, one row per person. */
function SheetLayer({ reduced }: { reduced: boolean }) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      exit={{
        opacity: 0,
        transition: { duration: reduced ? 0 : 0.22, ease: "easeOut" },
        y: -6,
      }}
      initial={reduced ? false : { opacity: 0, y: 4 }}
      style={{ inset: 0, position: "absolute" }}
      transition={{ duration: reduced ? 0 : 0.3, ease: "easeOut" }}
    >
      <div
        className="grid grid-cols-3 items-center gap-2 px-2.5"
        style={{
          backgroundColor: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-5))",
          height: SHEET_HEADER_HEIGHT,
        }}
      >
        <Text c="dimmed" fw={600} size="xs" tt="uppercase">
          {visuals.Spreadsheet.Name}
        </Text>
        <Text c="dimmed" fw={600} size="xs" tt="uppercase">
          {visuals.Spreadsheet.When}
        </Text>
        <Text c="dimmed" fw={600} size="xs" tt="uppercase">
          {visuals.Spreadsheet.Company}
        </Text>
      </div>

      {SHEET_ROWS.map((row) => (
        <div
          className="border-line grid grid-cols-3 items-center gap-2 border-t px-2.5"
          key={row.person}
          style={{ height: SHEET_ROW_HEIGHT }}
        >
          <Text c="dimmed" size="xs" truncate>
            {SAMPLE_PEOPLE[row.person].name}
          </Text>
          <Text c="dimmed" size="xs" truncate>
            {row.when}
          </Text>
          <Text c="dimmed" size="xs" truncate>
            {row.company}
          </Text>
        </div>
      ))}
    </motion.div>
  );
}

function RecordRow({
  index,
  person,
  reduced,
  when,
}: {
  index: number;
  person: SamplePersonId;
  reduced: boolean;
  when: string;
}) {
  const delay = reduced ? 0 : index * ROW_STAGGER_S;

  return (
    <div
      className="border-line flex items-center gap-2.5 px-2.5"
      style={{
        borderTopWidth: index === 0 ? 0 : 1,
        height: RECORD_ROW_HEIGHT,
      }}
    >
      <motion.div
        animate={{ opacity: 1, scale: 1 }}
        initial={reduced ? false : { opacity: 0, scale: 0.88 }}
        style={{ flexShrink: 0 }}
        transition={{
          delay: delay + (reduced ? 0 : 0.06),
          duration: reduced ? 0 : 0.3,
          ease: HOUSE_EASE,
        }}
      >
        <PersonAvatar person={person} size={40} />
      </motion.div>

      <div className="min-w-0 flex-1">
        <Text fw={600} size="sm" truncate>
          {SAMPLE_PEOPLE[person].name}
        </Text>

        <motion.div
          animate={{ opacity: 1, y: 0 }}
          initial={reduced ? false : { opacity: 0, y: 4 }}
          transition={{
            delay: delay + (reduced ? 0 : 0.14),
            duration: reduced ? 0 : 0.24,
            ease: "easeOut",
          }}
        >
          <Text c="dimmed" size="xs" truncate>
            {personHeadline(person)}
          </Text>
        </motion.div>

        <motion.div
          animate={{ opacity: 1 }}
          initial={reduced ? false : { opacity: 0 }}
          transition={{
            delay: delay + (reduced ? 0 : 0.2),
            duration: reduced ? 0 : 0.24,
            ease: "easeOut",
          }}
        >
          <Group gap="sm" wrap="nowrap">
            <Text c="dimmed" size="xs" truncate>
              {metOn(when)}
            </Text>
            {/* Channels the sheet has no column for. Hidden on phones so the name never truncates. */}
            <Group className="hidden sm:flex" gap={8} wrap="nowrap">
              <IconMail color="var(--mantine-color-dimmed)" size={14} stroke={1.75} />
              <IconBrandLinkedin color="var(--mantine-color-dimmed)" size={14} stroke={1.75} />
            </Group>
          </Group>
        </motion.div>
      </div>
    </div>
  );
}

/** The same two people as contact records: face, role, and when you met. */
function RecordsLayer({ reduced }: { reduced: boolean }) {
  return (
    <motion.div
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{
        opacity: 0,
        transition: { duration: reduced ? 0 : 0.26, ease: "easeInOut" },
        y: -8,
      }}
      initial={reduced ? false : { opacity: 0, scale: 0.985, y: 12 }}
      style={{ inset: 0, position: "absolute" }}
      transition={{ duration: reduced ? 0 : 0.36, ease: HOUSE_EASE }}
    >
      {RECORD_ORDER.map((person, index) => (
        <RecordRow
          index={index}
          key={person}
          person={person}
          reduced={reduced}
          when={SHEET_ROWS[index]?.when ?? ""}
        />
      ))}
    </motion.div>
  );
}

/**
 * A gray spreadsheet that becomes the same two people as Bondery contacts. It loops, and it
 * holds still on the records when the visitor prefers reduced motion.
 */
export function SpreadsheetVisual() {
  const reduceMotion = useReducedMotion();
  const frameRef = useRef<HTMLDivElement | null>(null);
  const inView = useInView(frameRef, { amount: 0.4 });
  const [phase, setPhase] = useState<Phase>("sheet");

  const reduced = Boolean(reduceMotion);
  // Derived, so reduced motion and an off-screen tile need no state update in an effect.
  const shownPhase: Phase = reduced ? RESTING_PHASE : inView ? phase : "sheet";

  useEffect(() => {
    if (reduced) {
      return;
    }

    let timers: ReturnType<typeof setTimeout>[] = [];

    const clearTimers = () => {
      timers.forEach(clearTimeout);
      timers = [];
    };

    const startLoop = () => {
      clearTimers();
      timers = KEYFRAMES.map((keyframe) => setTimeout(() => setPhase(keyframe.phase), keyframe.at));
    };

    // A hidden tab pauses animation frames, so a mid-transition frame would freeze. Reset to a
    // settled frame and restart the story from the beginning when the tab comes back.
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        clearTimers();
        setPhase("sheet");
        return;
      }
      if (inView) {
        startLoop();
      }
    };

    if (inView) {
      startLoop();
    } else {
      clearTimers();
    }

    const loop = setInterval(() => {
      if (inView && document.visibilityState === "visible") {
        startLoop();
      }
    }, LOOP_MS);

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(loop);
      clearTimers();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [inView, reduced]);

  return (
    <div className="flex w-full justify-center" ref={frameRef}>
      <Surface
        className="w-full max-w-sm"
        p={0}
        style={{ height: FRAME_HEIGHT, overflow: "hidden", position: "relative" }}
      >
        <AnimatePresence initial={false} mode="wait">
          {shownPhase === "sheet" ? (
            <SheetLayer key="sheet" reduced={reduced} />
          ) : (
            <RecordsLayer key="records" reduced={reduced} />
          )}
        </AnimatePresence>
      </Surface>
    </div>
  );
}
