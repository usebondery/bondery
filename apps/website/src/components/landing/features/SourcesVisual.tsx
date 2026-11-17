"use client";

import { Badge, Image, Indicator, Paper, Text, ThemeIcon } from "@mantine/core";
import {
  type Icon,
  IconAddressBook,
  IconApi,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconMail,
  IconPhone,
} from "@tabler/icons-react";
import { useReducedMotion } from "motion/react";
import { BRAND_ICONS } from "./brand-icons";
import { PersonAvatar, SAMPLE_PEOPLE, type SamplePersonId } from "./sample-people";

type SourceId = "linkedin" | "instagram" | "whatsapp" | "vcard" | "api";

type Source = {
  id: SourceId;
  label: string;
  /** A real brand mark. Sources without one use a Tabler icon. */
  brand?: keyof typeof BRAND_ICONS;
  icon?: Icon;
  /** Not shipped yet. Dimmed, labelled "Soon", and nothing flows from it. */
  soon?: boolean;
};

const SOURCES: readonly Source[] = [
  { brand: "linkedin", id: "linkedin", label: "LinkedIn" },
  { brand: "instagram", id: "instagram", label: "Instagram" },
  { brand: "whatsapp", id: "whatsapp", label: "WhatsApp", soon: true },
  { icon: IconAddressBook, id: "vcard", label: "vCard" },
  { icon: IconApi, id: "api", label: "API" },
];

type ChannelId = "linkedin" | "instagram" | "phone" | "email";

/** The webapp contacts table colours: LinkedIn blue, Instagram pink, phone blue, email red. */
const CHANNELS: Record<ChannelId, { color: string; icon: Icon }> = {
  email: { color: "red", icon: IconMail },
  instagram: { color: "pink", icon: IconBrandInstagram },
  linkedin: { color: "blue", icon: IconBrandLinkedin },
  phone: { color: "blue", icon: IconPhone },
};

/** Fixed column order, so each channel lines up down the rows like the table. */
const CHANNEL_ORDER: readonly ChannelId[] = ["linkedin", "instagram", "phone", "email"];

type Row = { person: SamplePersonId; channels: readonly ChannelId[]; merged?: boolean };

/** What each demo person was found with. One person was found twice and merged into one. */
const ROWS: readonly Row[] = [
  { channels: ["linkedin", "instagram"], merged: true, person: "grace" },
  { channels: ["instagram"], person: "ada" },
  { channels: ["phone", "email"], person: "margaret" },
  { channels: ["linkedin"], person: "katherine" },
];

const TILE_STYLE = {
  backgroundColor: "light-dark(var(--mantine-color-white), var(--mantine-color-dark-6))",
  borderColor: "light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-4))",
} as const;

const LINE_STYLE = {
  stroke: "light-dark(var(--mantine-color-gray-4), var(--mantine-color-dark-3))",
} as const;

/* Desktop geometry: five 44px tiles with 8px gaps, so tile centres sit 52px apart. */
const DESKTOP_HEIGHT = 252;
const DESKTOP_WIDTH = 72;
const tileCentreY = (index: number) => 22 + index * 52;

/* Phone geometry: five equal columns, tile centres 60 apart in a 300 wide box. */
const PHONE_WIDTH = 300;
const PHONE_HEIGHT = 52;
const tileCentreX = (index: number) => 30 + index * 60;

const DOT_DURATION = 3.2;

function SourceMark({ source, size }: { source: Source; size: number }) {
  if (source.brand) {
    return <Image alt="" h={size} src={BRAND_ICONS[source.brand].src} w={size} />;
  }
  const SourceIcon = source.icon;

  return SourceIcon ? <SourceIcon size={size} stroke={1.6} /> : null;
}

function SourceTile({ source, stacked }: { source: Source; stacked: boolean }) {
  return (
    <div
      className={
        stacked
          ? "flex flex-col items-center gap-1.5"
          : "flex items-center gap-2.5 whitespace-nowrap"
      }
    >
      <Indicator
        color="gray.7"
        disabled={!source.soon || !stacked}
        label="Soon"
        offset={stacked ? 2 : 4}
        position="top-end"
        size={16}
        withBorder
      >
        <div
          className="flex size-11 items-center justify-center rounded-xl border"
          style={{ ...TILE_STYLE, opacity: source.soon ? 0.5 : 1 }}
        >
          <SourceMark size={22} source={source} />
        </div>
      </Indicator>
      <Text c="dimmed" fw={500} size="xs" style={stacked ? { fontSize: 10 } : undefined}>
        {source.label}
      </Text>
      {source.soon && !stacked ? (
        <Badge className="shrink-0" color="gray" radius="xl" size="xs" tt="none" variant="default">
          Soon
        </Badge>
      ) : null}
    </div>
  );
}

/** A thin path with one dot travelling along it. No dot under reduced motion or for sources that are not live. */
function Connector({
  d,
  delay,
  live,
  reduceMotion,
}: {
  d: string;
  delay: number;
  live: boolean;
  reduceMotion: boolean | null;
}) {
  return (
    <>
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeDasharray={live ? undefined : "3 4"}
        strokeWidth={1.25}
        style={LINE_STYLE}
      />
      {live && !reduceMotion ? (
        <circle fill="var(--mantine-primary-color-filled)" r={3}>
          <animateMotion
            begin={`${delay}s`}
            calcMode="spline"
            dur={`${DOT_DURATION}s`}
            keyPoints="0;1;1"
            keySplines="0.45 0 0.55 1;0 0 1 1"
            keyTimes="0;0.75;1"
            path={d}
            repeatCount="indefinite"
          />
        </circle>
      ) : null}
    </>
  );
}

function DesktopFlow({ reduceMotion }: { reduceMotion: boolean | null }) {
  const targetY = DESKTOP_HEIGHT / 2;

  return (
    <svg
      aria-hidden="true"
      className="hidden shrink-0 sm:block"
      height={DESKTOP_HEIGHT}
      viewBox={`0 0 ${DESKTOP_WIDTH} ${DESKTOP_HEIGHT}`}
      width={DESKTOP_WIDTH}
    >
      {SOURCES.map((source, index) => {
        const y = tileCentreY(index);
        const mid = DESKTOP_WIDTH / 2;

        return (
          <Connector
            d={`M0 ${y} C${mid} ${y} ${mid} ${targetY} ${DESKTOP_WIDTH} ${targetY}`}
            delay={index * 0.45}
            key={source.id}
            live={!source.soon}
            reduceMotion={reduceMotion}
          />
        );
      })}
    </svg>
  );
}

function PhoneFlow({ reduceMotion }: { reduceMotion: boolean | null }) {
  return (
    <svg
      aria-hidden="true"
      className="block h-auto w-full max-w-[300px] sm:hidden"
      viewBox={`0 0 ${PHONE_WIDTH} ${PHONE_HEIGHT}`}
    >
      {SOURCES.map((source, index) => {
        const x = tileCentreX(index);
        const mid = PHONE_HEIGHT / 2;

        return (
          <Connector
            d={`M${x} 0 C${x} ${mid} ${PHONE_WIDTH / 2} ${mid} ${PHONE_WIDTH / 2} ${PHONE_HEIGHT}`}
            delay={index * 0.45}
            key={source.id}
            live={!source.soon}
            reduceMotion={reduceMotion}
          />
        );
      })}
    </svg>
  );
}

function ContactRow({ row, hiddenOnPhone }: { row: Row; hiddenOnPhone: boolean }) {
  const { headline, name } = SAMPLE_PEOPLE[row.person];

  return (
    <div className={`${hiddenOnPhone ? "hidden sm:flex" : "flex"} items-center gap-3`}>
      <PersonAvatar person={row.person} size={34} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Text fw={600} size="sm" truncate>
            {name}
          </Text>
          {row.merged ? (
            <Badge radius="xl" size="xs" tt="none" variant="light">
              Merged
            </Badge>
          ) : null}
        </div>
        <Text c="dimmed" size="xs" truncate>
          {headline}
        </Text>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {CHANNEL_ORDER.map((id) => {
          const { color, icon: ChannelIcon } = CHANNELS[id];

          // Empty slots keep the columns aligned on wide screens and collapse on phones.
          return row.channels.includes(id) ? (
            <ThemeIcon color={color} key={id} size={28} variant="light">
              <ChannelIcon size={16} />
            </ThemeIcon>
          ) : (
            <span className="hidden size-7 sm:block" key={id} />
          );
        })}
      </div>
    </div>
  );
}

/**
 * Sources on one side flow into a single Bondery contact list on the other. Sources sit in a
 * column beside the card on wide screens and in a row above it on phones. Under reduced motion
 * the lines are static and no dots travel.
 */
export function SourcesVisual() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex w-full max-w-3xl flex-col items-center sm:h-[252px] sm:flex-row sm:items-stretch">
      <div className="hidden w-[164px] shrink-0 flex-col justify-between sm:flex">
        {SOURCES.map((source) => (
          <SourceTile key={source.id} source={source} stacked={false} />
        ))}
      </div>
      <div className="grid w-full max-w-[300px] grid-cols-5 sm:hidden">
        {SOURCES.map((source) => (
          <SourceTile key={source.id} source={source} stacked />
        ))}
      </div>

      <DesktopFlow reduceMotion={reduceMotion} />
      <PhoneFlow reduceMotion={reduceMotion} />

      <Paper
        className="flex! w-full flex-col! sm:flex-1"
        p="md"
        radius="lg"
        shadow="md"
        style={{
          backgroundColor: "light-dark(var(--mantine-color-white), var(--mantine-color-dark-6))",
        }}
        withBorder
      >
        <div className="flex flex-1 flex-col justify-evenly gap-3 sm:gap-0">
          {ROWS.map((row, index) => (
            <ContactRow hiddenOnPhone={index === ROWS.length - 1} key={row.person} row={row} />
          ))}
        </div>
      </Paper>
    </div>
  );
}
