"use client";

import { BonderyIcon } from "@bondery/branding/react";
import { Box } from "@mantine/core";
import { IconBrandLinkedin } from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";

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
const BONDERY = { radius: 16, size: 68, x: 90, y: NODE_Y };
const LINKEDIN = { size: 60, x: 210, y: NODE_Y };

export function ExtensionLinkedInAnimation() {
  const t = useSettingsPageTranslations("Integration.ChromeExtensionModal");
  const labels = useMemo(
    () => [
      t("AnimationProfilePicture"),
      t("AnimationWorkHistory"),
      t("AnimationEducation"),
      t("AnimationJobTitle"),
    ],
    [t],
  );
  const [labelIndex, setLabelIndex] = useState(0);
  const [bubbleKey, setBubbleKey] = useState(0);
  const [pulseKey, setPulseKey] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setLabelIndex((prev) => (prev + 1) % labels.length);
      setBubbleKey((prev) => prev + 1);
      setPulseKey((prev) => prev + 1);
    }, 4000); // match website cadence
    return () => clearInterval(interval);
  }, [labels.length]);

  return (
    <Box style={{ height: PILL_H + ANIM_H, margin: "0 auto", position: "relative", width: 300 }}>
      {/* Notification Pill */}
      <Box
        style={{
          alignItems: "center",
          display: "flex",
          height: PILL_H,
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 8 }}
            initial={{ opacity: 0, scale: 0.9, y: -8 }}
            key={labels[labelIndex]}
            style={{
              alignItems: "center",
              backgroundColor: NODE_BG,
              border: `1px solid ${BORDER_COL}`,
              borderRadius: 999,
              boxShadow: "var(--mantine-shadow-sm)",
              display: "flex",
              gap: 8,
              padding: "6px 14px",
              whiteSpace: "nowrap",
            }}
            transition={{ duration: 0.3 }}
          >
            <div
              style={{
                alignItems: "center",
                backgroundColor: LINKEDIN_BLUE,
                borderRadius: "50%",
                display: "flex",
                flexShrink: 0,
                height: 22,
                justifyContent: "center",
                width: 22,
              }}
            >
              <IconBrandLinkedin color="white" size={13} />
            </div>
            <span style={{ color: TEXT_COL, fontSize: 13, fontWeight: 500 }}>
              {labels[labelIndex]}
            </span>
          </motion.div>
        </AnimatePresence>
      </Box>

      {/* Animation area: nodes, line, bubble */}
      <Box style={{ height: ANIM_H, left: 0, position: "absolute", right: 0, top: PILL_H }}>
        {/* Connecting line */}
        <svg
          style={{
            height: "100%",
            inset: 0,
            overflow: "visible",
            pointerEvents: "none",
            position: "absolute",
            width: "100%",
            zIndex: 10,
          }}
        >
          <line
            stroke={LINE_COL}
            strokeWidth={1.5}
            x1={BONDERY.x}
            x2={LINKEDIN.x}
            y1={BONDERY.y}
            y2={LINKEDIN.y}
          />
        </svg>

        {/* Data bubble: LinkedIn → Bondery */}
        <AnimatePresence>
          <motion.div
            animate={{
              opacity: [0, 1, 1, 0],
              scale: [0, 1, 1, 0],
              x: [LINKEDIN.x - 5, BONDERY.x - 5],
            }}
            exit={{ opacity: 0 }}
            initial={{ opacity: 0, scale: 0, x: LINKEDIN.x - 5 }}
            key={bubbleKey}
            style={{
              backgroundColor: LINKEDIN_BLUE,
              borderRadius: "50%",
              height: 10,
              left: 0,
              pointerEvents: "none",
              position: "absolute",
              top: BONDERY.y - 5,
              width: 10,
              zIndex: 25,
            }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
          />
        </AnimatePresence>

        {/* Bondery node */}
        <motion.div
          style={{
            alignItems: "center",
            backgroundColor: NODE_BG,
            border: `1px solid ${BORDER_COL}`,
            borderRadius: BONDERY.radius,
            boxShadow: "var(--mantine-shadow-md)",
            display: "flex",
            height: BONDERY.size,
            justifyContent: "center",
            left: BONDERY.x - BONDERY.size / 2,
            position: "absolute",
            top: BONDERY.y - BONDERY.size / 2,
            width: BONDERY.size,
            zIndex: 20,
          }}
          transition={{ damping: 17, stiffness: 400, type: "spring" }}
          whileHover={{ scale: 1.05 }}
        >
          <BonderyIcon height={40} width={40} />

          <AnimatePresence>
            <motion.div
              animate={{ opacity: [0, 0.3, 0], scale: [1, 1.4, 1.6] }}
              initial={{ opacity: 0, scale: 0.8 }}
              key={`pulse-${pulseKey}`}
              style={{
                backgroundColor: GRAPE,
                borderRadius: BONDERY.radius,
                inset: 0,
                position: "absolute",
                zIndex: -1,
              }}
              transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
            />
          </AnimatePresence>
        </motion.div>

        {/* LinkedIn node */}
        <motion.div
          style={{
            alignItems: "center",
            backgroundColor: LINKEDIN_BLUE,
            borderRadius: "50%",
            boxShadow: "var(--mantine-shadow-md)",
            display: "flex",
            height: LINKEDIN.size,
            justifyContent: "center",
            left: LINKEDIN.x - LINKEDIN.size / 2,
            position: "absolute",
            top: LINKEDIN.y - LINKEDIN.size / 2,
            width: LINKEDIN.size,
            zIndex: 20,
          }}
          transition={{ damping: 17, stiffness: 400, type: "spring" }}
          whileHover={{ scale: 1.05 }}
        >
          <IconBrandLinkedin color="white" size={30} />
        </motion.div>
      </Box>
    </Box>
  );
}
