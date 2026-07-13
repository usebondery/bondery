"use client";

import { LogoIcon } from "@bondery/mantine-next";
import { Card, useMantineColorScheme, useMantineTheme } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconAddressBook,
  IconBrandApple,
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandX,
  IconMail,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

const SATELLITES = [
  // Removed Google to create top gap
  { color: "#0A66C2", icon: IconBrandLinkedin, id: "linkedin", label: "Job update" },
  { color: "#E4405F", icon: IconBrandInstagram, id: "instagram", label: "Birthday alert" },
  { color: "#000000", icon: IconBrandX, id: "x", label: "New handle" },
  { color: "#A2AAAD", icon: IconBrandApple, id: "apple", label: "Contact photo" },
  { color: "#D44638", icon: IconMail, id: "mail", label: "New email" },
  { color: "#1877F2", icon: IconBrandFacebook, id: "facebook", label: "Profile link" },
  { color: "#34D399", icon: IconAddressBook, id: "contacts", label: "Contact merged" },
];

export function SyncedConnectionsAnimation() {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % SATELLITES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const radius = isMobile ? 90 : 130;
  const centerSize = 80;
  const satelliteSize = 48;

  const activeSat = SATELLITES[activeIndex];

  return (
    <Card
      className="bg-transparent border-none shadow-none overflow-visible relative flex items-center justify-center p-0"
      padding="xl"
      radius="lg"
      style={{
        aspectRatio: "4/3",
        fontSize: "1rem", // Reset font size context if needed
        maxWidth: 500,
        width: "100%",
      }}
    >
      {/* Floating Notification Pill - Inside Top Gap */}
      <div className="absolute top-0 left-0 right-0 flex justify-center z-30 pointer-events-none h-12">
        <AnimatePresence mode="wait">
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-zinc-800 rounded-full shadow-lg border border-gray-100 dark:border-zinc-700 mt-2"
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            key={activeSat.id}
            transition={{ duration: 0.3 }}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white"
              style={{ backgroundColor: activeSat.color }}
            >
              <activeSat.icon size={14} />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">
              {activeSat.label}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative w-full h-full flex items-center justify-center">
        {/* Central Hub - Bondery Logo */}
        <motion.div
          className="relative z-20 bg-white dark:bg-zinc-800 rounded-2xl shadow-xl flex items-center justify-center border border-gray-100 dark:border-zinc-700"
          style={{ height: centerSize, width: centerSize }}
          transition={{ damping: 17, stiffness: 400, type: "spring" }}
          whileHover={{ scale: 1.1 }}
        >
          <LogoIcon className="text-zinc-900 dark:text-white" size={48} />

          <AnimatePresence>
            <motion.div
              animate={{ opacity: [0, 0.3, 0], scale: [1, 1.4, 1.6] }}
              className="absolute inset-0 rounded-2xl -z-10"
              initial={{ opacity: 0, scale: 0.8 }}
              key={`pulse-${activeIndex}`}
              style={{ backgroundColor: activeSat.color }}
              transition={{ delay: 1, duration: 0.8, ease: "easeOut" }}
            />
          </AnimatePresence>
        </motion.div>

        {/* Central SVG for Lines */}
        <svg
          className="absolute left-1/2 top-1/2 overflow-visible pointer-events-none z-10"
          style={{
            height: 600,
            marginLeft: -300,
            marginTop: -300,
            width: 600,
          }}
          viewBox="-300 -300 600 600"
        >
          {SATELLITES.map((sat, index) => {
            // Calculate angle for 8 slots, skipping index 0 (top)
            // New map: index 0 -> slot 1, index 1 -> slot 2 ... index 6 -> slot 7
            const slotIndex = index + 1;
            const angle = (slotIndex / 8) * 2 * Math.PI - Math.PI / 2;

            // Connect fully to centers (hidden behind z-index elements)
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            const isActive = activeIndex === index;

            return (
              <motion.line
                animate={{
                  opacity: isActive ? 1 : 0.3,
                  stroke: isActive ? sat.color : colorScheme === "dark" ? "#52525b" : "#d1d5db",
                }}
                initial={{ opacity: 0.3 }}
                key={`line-${sat.id}`}
                stroke={isActive ? sat.color : colorScheme === "dark" ? "#52525b" : "#d1d5db"}
                strokeWidth={isActive ? 2 : 1}
                transition={{ duration: 0.3 }}
                x1={0} // Start from absolute center
                x2={x}
                y1={0}
                y2={y}
              />
            );
          })}
        </svg>

        {/* Satellites */}
        {SATELLITES.map((sat, index) => {
          const slotIndex = index + 1;
          const angle = (slotIndex / 8) * 2 * Math.PI - Math.PI / 2;

          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          const isActive = index === activeIndex;

          return (
            <div className="absolute left-1/2 top-1/2" key={sat.id} style={{ height: 0, width: 0 }}>
              {/* Data Packet */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    animate={{
                      opacity: [1, 1, 0],
                      scale: [1, 1, 0],
                      x: [x, 0],
                      y: [y, 0],
                    }}
                    className="absolute w-3 h-3 rounded-full z-10 shadow-sm pointer-events-none"
                    exit={{ opacity: 0 }}
                    initial={{ opacity: 0, scale: 0, x: x, y: y }}
                    style={{
                      backgroundColor: sat.color,
                      marginLeft: -6,
                      marginTop: -6,
                    }}
                    transition={{
                      duration: 1,
                      ease: "easeInOut",
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Icon */}
              <motion.div
                animate={{
                  opacity: isActive ? 1 : 0.8, // Increased opacity slightly
                  scale: isActive ? 1.2 : 1,
                }}
                className="absolute bg-white dark:bg-zinc-800 rounded-full shadow-lg flex items-center justify-center border border-gray-100 dark:border-zinc-700 z-20 cursor-pointer"
                onClick={() => setActiveIndex(index)}
                style={{
                  height: satelliteSize,
                  marginLeft: -satelliteSize / 2,
                  marginTop: -satelliteSize / 2,
                  width: satelliteSize,
                  x: x,
                  y: y,
                }}
                transition={{ duration: 0.3 }}
                whileHover={{ opacity: 1, scale: 1.2, zIndex: 30 }}
              >
                <sat.icon
                  color={isActive ? sat.color : "#9ca3af"}
                  size={24}
                  style={{ transition: "color 0.3s" }}
                />
              </motion.div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
