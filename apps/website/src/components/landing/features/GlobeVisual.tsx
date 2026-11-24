"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";
import { GLOBE_CITIES, GLOBE_DOTS, GLOBE_RADIUS } from "./globe-data";
import { PersonAvatar, type SamplePersonId } from "./sample-people";

/** Who sits where. Cities are projected in `globe-data.ts`. */
const PINS: ReadonlyArray<{ city: keyof typeof GLOBE_CITIES; person: SamplePersonId }> = [
  { city: "london", person: "ada" },
  { city: "cairo", person: "grace" },
  { city: "lagos", person: "alan" },
  { city: "nairobi", person: "katherine" },
  { city: "mumbai", person: "margaret" },
];

const PIN_RING_STYLE = {
  border: "3px solid var(--mantine-primary-color-filled)",
  boxShadow: "0 0 0 2px light-dark(var(--mantine-color-white), var(--mantine-color-dark-6))",
} as const;

/**
 * A quiet dotted globe with contact photos on it, for the "Find anyone" tile. Land is a
 * pre-computed dot grid (see `globe-data.ts`), so it renders instantly: no map engine, no
 * tiles, no network. The photos pop in once, one after another, when scrolled into view;
 * under reduced motion they are simply there.
 */
export function GlobeVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.5, once: true });
  const reduceMotion = useReducedMotion();
  const shown = reduceMotion || inView;

  return (
    <div aria-hidden="true" className="size-globe sm:size-globe-sm relative" ref={ref}>
      <svg className="absolute inset-0 size-full" fill="none" viewBox="0 0 100 100">
        <circle
          cx={50}
          cy={50}
          r={GLOBE_RADIUS}
          strokeWidth={0.6}
          style={{
            fill: "light-dark(var(--mantine-color-white), var(--mantine-color-dark-6))",
            stroke: "light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-4))",
          }}
        />
        <g style={{ fill: "light-dark(var(--mantine-color-gray-4), var(--mantine-color-dark-3))" }}>
          {GLOBE_DOTS.map(([x, y, r]) => (
            <circle cx={x} cy={y} key={`${x}-${y}`} r={r} />
          ))}
        </g>
      </svg>

      {PINS.map(({ city, person }, index) => {
        const [x, y] = GLOBE_CITIES[city];
        return (
          <motion.div
            animate={{ opacity: shown ? 1 : 0, scale: shown ? 1 : 0.6 }}
            className="absolute -translate-1/2"
            initial={false}
            key={city}
            style={{ left: `${x}%`, top: `${y}%` }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { delay: 0.2 + index * 0.12, duration: 0.35, ease: "easeOut" }
            }
          >
            <PersonAvatar person={person} size={36} style={PIN_RING_STYLE} />
          </motion.div>
        );
      })}
    </div>
  );
}
