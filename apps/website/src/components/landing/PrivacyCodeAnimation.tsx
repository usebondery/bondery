"use client";

import { Card, useMantineTheme } from "@mantine/core";
import { useHover, useMediaQuery } from "@mantine/hooks";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

const CODE_LINES = [
  { label: "encryption", secret: "*******", value: "AES-256" },
  { label: "location", secret: "**", value: '"EU"' },
  { label: "tracking", secret: "*****", value: "false" },
  { label: "owner", secret: "***", value: '"YOU"' },
];

export function PrivacyCodeAnimation() {
  const [isRevealed, setIsRevealed] = useState(false);
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);
  const { hovered, ref } = useHover();

  // Auto-cycle on mobile or if user prefers reduced motion (though we can't easily detect that here without a hook)
  useEffect(() => {
    if (hovered) {
      setIsRevealed(true);
      return;
    }

    if (isMobile) {
      const interval = setInterval(() => {
        setIsRevealed((prev) => !prev);
      }, 3000);
      return () => clearInterval(interval);
    }

    setIsRevealed(false);
  }, [hovered, isMobile]);

  return (
    <Card
      className="bg-gray-900 text-green-400 font-mono text-sm leading-relaxed overflow-hidden relative shadow-xl border border-gray-800"
      padding="xl"
      radius="lg"
      ref={ref}
      style={{
        aspectRatio: "4/3",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        maxWidth: 500,
        width: "100%",
      }}
    >
      {/* Subtle background grid or glow */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0, 255, 0, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 0, 0.1) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      {/* Scanline effect */}
      <motion.div
        animate={{ top: ["0%", "100%"] }}
        className="absolute left-0 right-0 h-1 bg-green-500/20 blur-sm pointer-events-none"
        style={{ width: "100%" }}
        transition={{ duration: 3, ease: "linear", repeat: Infinity }}
      />

      <div className="relative z-10 space-y-2">
        <div className="flex items-center gap-2 mb-4 opacity-50">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-xs ml-2">privacy.config.ts</span>
        </div>

        <div className="pl-0">
          <span className="text-purple-400">export const</span>{" "}
          <span className="text-blue-400">userData</span> = {"{"}
        </div>

        {CODE_LINES.map((line) => (
          <div className="pl-4 flex" key={line.label}>
            <span className="text-blue-300 mr-2">{line.label}:</span>
            <CodeValue revealed={isRevealed} secret={line.secret} value={line.value} />
            <span className="text-gray-500">,</span>
          </div>
        ))}

        <div className="pl-0">{"};"}</div>
      </div>

      {/* Status Badge */}
      <motion.div
        animate={{
          backgroundColor: isRevealed ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
          color: isRevealed ? "#4ade80" : "#f87171",
        }}
        className="absolute bottom-4 right-4 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2"
      >
        <div
          className={`w-2 h-2 rounded-full ${isRevealed ? "bg-green-400" : "bg-red-400"} animate-pulse`}
        />
        {isRevealed ? "SECURE" : "PROTECTED"}
      </motion.div>
    </Card>
  );
}

function CodeValue({
  value,
  secret,
  revealed,
}: {
  value: string;
  secret: string;
  revealed: boolean;
}) {
  // A simple scramble effect could be done here, but swapping text layout
  // with AnimatePresence is cleaner and easier to read.
  return (
    <div className="relative inline-block min-w-[60px]">
      <AnimatePresence mode="wait">
        {revealed ? (
          <motion.span
            animate={{ opacity: 1, y: 0 }}
            className="text-green-300 font-bold"
            exit={{ opacity: 0, y: -5 }}
            initial={{ opacity: 0, y: 5 }}
            key="value"
            transition={{ duration: 0.2 }}
          >
            {value}
          </motion.span>
        ) : (
          <motion.span
            animate={{ opacity: 1, y: 0 }}
            className="text-gray-600 tracking-widest"
            exit={{ opacity: 0, y: -5 }}
            initial={{ opacity: 0, y: 5 }}
            key="secret"
            transition={{ duration: 0.2 }}
          >
            {secret}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
