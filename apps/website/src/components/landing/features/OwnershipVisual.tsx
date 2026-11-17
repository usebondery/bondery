"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";

/** How far the shackle is raised before it settles, in SVG units. */
const SHACKLE_LIFT = 26;

/**
 * A single flat padlock in the brand primary colour. The shackle starts raised and settles closed
 * once when scrolled into view. It stands for the whole privacy section without repeating
 * any of its points.
 */
export function OwnershipVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.6, once: true });
  const reduceMotion = useReducedMotion();
  const closed = reduceMotion || inView;

  return (
    <div aria-hidden="true" className="flex w-full justify-center" ref={ref}>
      <div className="relative h-[290px] w-[240px]">
        <svg
          className="absolute inset-0 size-full"
          fill="none"
          viewBox="0 0 240 290"
          xmlns="http://www.w3.org/2000/svg"
        >
          <motion.g
            animate={{ y: closed ? 0 : -SHACKLE_LIFT }}
            initial={false}
            transition={
              reduceMotion ? { duration: 0 } : { delay: 0.15, duration: 0.7, ease: "easeOut" }
            }
          >
            <path
              d="M72 130V86a48 48 0 0 1 96 0v44"
              strokeLinecap="round"
              strokeWidth={24}
              style={{
                stroke: "var(--mantine-primary-color-filled)",
              }}
            />
          </motion.g>

          <rect
            height={150}
            rx={28}
            style={{
              fill: "var(--mantine-primary-color-filled)",
            }}
            width={200}
            x={20}
            y={120}
          />
        </svg>
      </div>
    </div>
  );
}
