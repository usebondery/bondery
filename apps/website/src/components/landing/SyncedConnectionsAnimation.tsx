"use client";

import { LogoIcon } from "@bondery/mantine-next";
import { Box, Card, Group, Text } from "@mantine/core";
import { IconApi, IconBrandInstagram, IconBrandLinkedin } from "@tabler/icons-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import NextImage from "next/image";
import { useEffect, useState } from "react";

type SourceId = "api" | "instagram" | "linkedin";

type Source = {
  color: string;
  icon: typeof IconApi;
  id: SourceId;
  label: string;
};

const SOURCES: readonly Source[] = [
  { color: "#0A66C2", icon: IconBrandLinkedin, id: "linkedin", label: "LinkedIn" },
  { color: "#E4405F", icon: IconBrandInstagram, id: "instagram", label: "Instagram" },
  { color: "#7C3AED", icon: IconApi, id: "api", label: "API" },
];

const SOURCE_BY_ID = new Map(SOURCES.map((source) => [source.id, source]));

type Person = {
  detail: string;
  name: string;
  photo: string;
  sources: readonly SourceId[];
};

const PEOPLE: readonly Person[] = [
  {
    detail: "Product designer · Berlin",
    name: "Anna Kowalski",
    photo: "/images/persons/person_job.jpg",
    sources: ["linkedin", "api"],
  },
  {
    detail: "Met at Web Summit",
    name: "Marek Novák",
    photo: "/images/persons/person_buddy.jpg",
    sources: ["instagram"],
  },
  {
    detail: "Climbing partner · Brno",
    name: "Lucie Dvořáková",
    photo: "/images/persons/person_birthday.jpg",
    sources: ["instagram", "linkedin"],
  },
  {
    detail: "Founder · Prague",
    name: "Tomáš Horák",
    photo: "/images/persons/person_restaurant.jpg",
    sources: ["api"],
  },
];

const VISIBLE_CARDS = 3;
const CARD_INTERVAL_MS = 2000;
const HAIRLINE = "light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-4))";
const SURFACE = "light-dark(var(--mantine-color-white), var(--mantine-color-dark-6))";
const PILL_SURFACE = "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))";

type PreviewCard = { id: number; person: Person };

/** Newest first. Each entry carries its own id so enter and exit animations stay distinct. */
function buildInitialCards(): PreviewCard[] {
  return Array.from({ length: VISIBLE_CARDS }, (_, index) => ({
    id: index,
    person: PEOPLE[index % PEOPLE.length] as Person,
  }));
}

export function SyncedConnectionsAnimation() {
  const reduceMotion = useReducedMotion();
  const [cards, setCards] = useState<PreviewCard[]>(buildInitialCards);

  useEffect(() => {
    if (reduceMotion) {
      return;
    }

    let nextId = VISIBLE_CARDS;

    const interval = setInterval(() => {
      setCards((previous) => [
        { id: nextId, person: PEOPLE[nextId % PEOPLE.length] as Person },
        ...previous.slice(0, VISIBLE_CARDS - 1),
      ]);
      nextId += 1;
    }, CARD_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [reduceMotion]);

  return (
    <Card
      className="bg-transparent border-none shadow-none overflow-visible relative flex items-center justify-center p-0"
      padding="md"
      radius="lg"
      style={{ aspectRatio: "4/3", maxWidth: 500, minHeight: 380, width: "100%" }}
    >
      <Box style={{ width: "100%" }}>
        <Group justify="space-between" wrap="nowrap">
          {SOURCES.map((source) => (
            <SourceChip key={source.id} source={source} />
          ))}
        </Group>

        <InboundStreams animated={!reduceMotion} />

        <Group justify="center">
          <Hub animated={!reduceMotion} />
        </Group>

        <OutboundStream animated={!reduceMotion} />

        <Box style={{ position: "relative" }}>
          <Box component="ul" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            <AnimatePresence initial={false} mode="popLayout">
              {cards.map((card, index) => (
                <PersonPreview
                  animated={!reduceMotion}
                  isNewest={index === 0}
                  key={card.id}
                  person={card.person}
                />
              ))}
            </AnimatePresence>
          </Box>

          <Box
            aria-hidden="true"
            style={{
              background: `linear-gradient(to top, light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8)), transparent)`,
              bottom: -4,
              height: 26,
              left: 0,
              pointerEvents: "none",
              position: "absolute",
              right: 0,
            }}
          />
        </Box>
      </Box>
    </Card>
  );
}

function SourceChip({ source }: { source: Source }) {
  return (
    <Group
      gap={5}
      style={{
        border: `1px solid ${HAIRLINE}`,
        borderRadius: 999,
        flexShrink: 0,
        padding: "3px 9px",
      }}
      wrap="nowrap"
    >
      <source.icon color={source.color} size={12} />
      <Text fw={600} style={{ fontSize: 10, lineHeight: 1.2 }}>
        {source.label}
      </Text>
    </Group>
  );
}

/** Three streams converge on the hub. Dots travel the diagonal, then repeat, so flow never stops. */
function InboundStreams({ animated }: { animated: boolean }) {
  const paths = [
    { delay: 0, from: 16.7 },
    { delay: 0.5, from: 50 },
    { delay: 1, from: 83.3 },
  ];

  return (
    <Box style={{ height: 56, position: "relative", width: "100%" }}>
      <svg
        aria-hidden="true"
        preserveAspectRatio="none"
        style={{ height: "100%", inset: 0, position: "absolute", width: "100%" }}
        viewBox="0 0 100 56"
      >
        {paths.map((path) => (
          <line
            key={`line-${path.from}`}
            stroke={HAIRLINE}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
            x1={path.from}
            x2={50}
            y1={0}
            y2={56}
          />
        ))}

        {animated
          ? paths.map((path) => (
              <motion.circle
                animate={{ cx: [path.from, 50], cy: [0, 56], opacity: [0, 1, 1, 0] }}
                fill="var(--mantine-primary-color-filled)"
                initial={false}
                key={`dot-${path.from}`}
                r={2.4}
                transition={{
                  delay: path.delay,
                  duration: 1.5,
                  ease: "easeIn",
                  repeat: Number.POSITIVE_INFINITY,
                  repeatDelay: 0.4,
                  times: [0, 1],
                }}
              />
            ))
          : null}
      </svg>
    </Box>
  );
}

function Hub({ animated }: { animated: boolean }) {
  return (
    <Box style={{ position: "relative", zIndex: 1 }}>
      {animated ? (
        <motion.div
          animate={{ opacity: [0.35, 0, 0.35], scale: [1, 1.45, 1] }}
          aria-hidden="true"
          style={{
            border: "1px solid var(--mantine-primary-color-filled)",
            borderRadius: 14,
            inset: 0,
            position: "absolute",
          }}
          transition={{ duration: 2.6, ease: "easeOut", repeat: Number.POSITIVE_INFINITY }}
        />
      ) : null}

      <Box
        style={{
          alignItems: "center",
          backgroundColor: SURFACE,
          border: `1px solid ${HAIRLINE}`,
          borderRadius: 12,
          boxShadow: "var(--mantine-shadow-md)",
          display: "flex",
          height: 44,
          justifyContent: "center",
          position: "relative",
          width: 44,
        }}
      >
        <LogoIcon size={24} />
      </Box>
    </Box>
  );
}

/** The hub hands the finished contact down to the list. */
function OutboundStream({ animated }: { animated: boolean }) {
  return (
    <Box style={{ height: 28, position: "relative", width: "100%" }}>
      <svg
        aria-hidden="true"
        preserveAspectRatio="none"
        style={{ height: "100%", inset: 0, position: "absolute", width: "100%" }}
        viewBox="0 0 100 28"
      >
        <line
          stroke={HAIRLINE}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
          x1={50}
          x2={50}
          y1={0}
          y2={28}
        />

        {animated ? (
          <motion.circle
            animate={{ cy: [0, 28], opacity: [0, 1, 1, 0] }}
            cx={50}
            fill="var(--mantine-primary-color-filled)"
            initial={false}
            r={2.4}
            transition={{
              duration: 1.2,
              ease: "easeIn",
              repeat: Number.POSITIVE_INFINITY,
            }}
          />
        ) : null}
      </svg>
    </Box>
  );
}

function PersonPreview({
  animated,
  isNewest,
  person,
}: {
  animated: boolean;
  isNewest: boolean;
  person: Person;
}) {
  return (
    <motion.li
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 8 }}
      initial={animated ? { opacity: 0, scale: 0.96, y: -12 } : { opacity: 1, scale: 1, y: 0 }}
      layout={animated}
      style={{ paddingBottom: 6 }}
      transition={{ damping: 26, stiffness: 300, type: "spring" }}
    >
      <Card
        padding={8}
        radius="md"
        shadow={isNewest ? "sm" : undefined}
        style={{
          borderColor: isNewest
            ? "light-dark(var(--mantine-primary-color-2), var(--mantine-primary-color-8))"
            : undefined,
        }}
        withBorder
      >
        <Group gap={9} wrap="nowrap">
          <NextImage
            alt=""
            className="rounded-lg object-cover"
            height={34}
            src={person.photo}
            style={{ flexShrink: 0 }}
            width={34}
          />

          <Box style={{ flex: 1, minWidth: 0 }}>
            <Text fw={600} style={{ fontSize: 11.5, lineHeight: 1.35 }} truncate>
              {person.name}
            </Text>
            <Text c="dimmed" style={{ fontSize: 10, lineHeight: 1.35 }} truncate>
              {person.detail}
            </Text>
          </Box>

          <Group aria-hidden="true" gap={4} style={{ flexShrink: 0 }} wrap="nowrap">
            {person.sources.map((sourceId) => {
              const source = SOURCE_BY_ID.get(sourceId);
              if (!source) {
                return null;
              }

              return (
                <Box
                  key={sourceId}
                  style={{
                    alignItems: "center",
                    backgroundColor: PILL_SURFACE,
                    border: `1px solid ${HAIRLINE}`,
                    borderRadius: 999,
                    display: "flex",
                    height: 18,
                    justifyContent: "center",
                    width: 18,
                  }}
                >
                  <source.icon color={source.color} size={10} />
                </Box>
              );
            })}
          </Group>
        </Group>
      </Card>
    </motion.li>
  );
}
