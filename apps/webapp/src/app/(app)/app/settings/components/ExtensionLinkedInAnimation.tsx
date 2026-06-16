"use client";

import { useEffect, useState } from "react";
import { Box } from "@mantine/core";
import { motion, AnimatePresence } from "motion/react";
import { IconBrandLinkedin } from "@tabler/icons-react";
import { BonderyIcon } from "@bondery/branding/react";

const LABELS = ["Profile picture", "Work history", "Education", "Job title"];
const LINKEDIN_BLUE = "#0A66C2";

// Use Mantine CSS custom properties so colors respond to the color scheme at
// the CSS level — this is reliable even inside modal portals where
// useMantineColorScheme() may not reflect the current scheme correctly.
const NODE_BG = "var(--mantine-color-default)";
const BORDER_COL = "var(--mantine-color-default-border)";
const LINE_COL = "var(--mantine-color-default-border)";
const TEXT_COL = "var(--mantine-color-text)";
const GRAPE = "var(--mantine-color-grape-5)";

const PILL_H = 44;
const ANIM_H = 110; // trimmed to remove excess bottom space
const NODE_Y = 55;
const BONDERY = { x: 90, y: NODE_Y, size: 68, radius: 16 };
const LINKEDIN = { x: 210, y: NODE_Y, size: 60 };

export function ExtensionLinkedInAnimation() {
  const [labelIndex, setLabelIndex] = useState(0);
  const [bubbleKey, setBubbleKey] = useState(0);
  const [pulseKey, setPulseKey] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setLabelIndex((prev) => (prev + 1) % LABELS.length);
      setBubbleKey((prev) => prev + 1);
      setPulseKey((prev) => prev + 1);
    }, 4000); // match website cadence
    return () => clearInterval(interval);
  }, []);

  return (
    <Box style={{ width: 300, margin: "0 auto", position: "relative", height: PILL_H + ANIM_H }}>
      {/* Notification Pill */}
      <Box
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: PILL_H,
          pointerEvents: "none",
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={LABELS[labelIndex]}
            initial={{ opacity: 0, y: -8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              backgroundColor: NODE_BG,
              border: `1px solid ${BORDER_COL}`,
              borderRadius: 999,
              boxShadow: "var(--mantine-shadow-sm)",
              whiteSpace: "nowrap",
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                backgroundColor: LINKEDIN_BLUE,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <IconBrandLinkedin size={13} color="white" />
            </div>
            <span style={{ fontSize: 13, fontWeight: 500, color: TEXT_COL }}>
              {LABELS[labelIndex]}
            </span>
          </motion.div>
        </AnimatePresence>
      </Box>

      {/* Animation area: nodes, line, bubble */}
      <Box style={{ position: "absolute", top: PILL_H, left: 0, right: 0, height: ANIM_H }}>
        {/* Connecting line */}
        <svg
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            overflow: "visible",
            zIndex: 10,
            pointerEvents: "none",
          }}
        >
          <line
            x1={BONDERY.x}
            y1={BONDERY.y}
            x2={LINKEDIN.x}
            y2={LINKEDIN.y}
            stroke={LINE_COL}
            strokeWidth={1.5}
          />
        </svg>

        {/* Data bubble: LinkedIn → Bondery */}
        <AnimatePresence>
          <motion.div
            key={bubbleKey}
            style={{
              position: "absolute",
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: LINKEDIN_BLUE,
              top: BONDERY.y - 5,
              left: 0,
              zIndex: 25,
              pointerEvents: "none",
            }}
            initial={{ x: LINKEDIN.x - 5, opacity: 0, scale: 0 }}
            animate={{
              x: [LINKEDIN.x - 5, BONDERY.x - 5],
              opacity: [0, 1, 1, 0],
              scale: [0, 1, 1, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
          />
        </AnimatePresence>

        {/* Bondery node */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
          style={{
            position: "absolute",
            left: BONDERY.x - BONDERY.size / 2,
            top: BONDERY.y - BONDERY.size / 2,
            width: BONDERY.size,
            height: BONDERY.size,
            borderRadius: BONDERY.radius,
            backgroundColor: NODE_BG,
            border: `1px solid ${BORDER_COL}`,
            boxShadow: "var(--mantine-shadow-md)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 20,
          }}
        >
          <BonderyIcon width={40} height={40} />

          <AnimatePresence>
            <motion.div
              key={`pulse-${pulseKey}`}
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: BONDERY.radius,
                backgroundColor: GRAPE,
                zIndex: -1,
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: [0, 0.3, 0], scale: [1, 1.4, 1.6] }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            />
          </AnimatePresence>
        </motion.div>

        {/* LinkedIn node */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
          style={{
            position: "absolute",
            left: LINKEDIN.x - LINKEDIN.size / 2,
            top: LINKEDIN.y - LINKEDIN.size / 2,
            width: LINKEDIN.size,
            height: LINKEDIN.size,
            borderRadius: "50%",
            backgroundColor: LINKEDIN_BLUE,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 20,
            boxShadow: "var(--mantine-shadow-md)",
          }}
        >
          <IconBrandLinkedin size={30} color="white" />
        </motion.div>
      </Box>
    </Box>
  );
}
