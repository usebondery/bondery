"use client";

import { useMantineTheme, useMantineColorScheme, Card } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconBrandLinkedin,
  IconBrandInstagram,
  IconBrandX,
  IconBrandApple,
  IconMail,
  IconBrandFacebook,
  IconAddressBook,
} from "@tabler/icons-react";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";
import { LogoIcon } from "@bondery/mantine-next";

const SATELLITES = [
  // Removed Google to create top gap
  { id: "linkedin", icon: IconBrandLinkedin, color: "#0A66C2", label: "Job update" },
  { id: "instagram", icon: IconBrandInstagram, color: "#E4405F", label: "Birthday alert" },
  { id: "x", icon: IconBrandX, color: "#000000", label: "New handle" },
  { id: "apple", icon: IconBrandApple, color: "#A2AAAD", label: "Contact photo" },
  { id: "mail", icon: IconMail, color: "#D44638", label: "New email" },
  { id: "facebook", icon: IconBrandFacebook, color: "#1877F2", label: "Profile link" },
  { id: "contacts", icon: IconAddressBook, color: "#34D399", label: "Contact merged" },
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
      padding="xl"
      radius="lg"
      className="bg-transparent border-none shadow-none overflow-visible relative flex items-center justify-center p-0"
      style={{
        width: "100%",
        maxWidth: 500,
        aspectRatio: "4/3",
        fontSize: "1rem", // Reset font size context if needed
      }}
    >
      {/* Floating Notification Pill - Inside Top Gap */}
      <div className="absolute top-0 left-0 right-0 flex justify-center z-30 pointer-events-none h-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSat.id}
            initial={{ opacity: 0, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-zinc-800 rounded-full shadow-lg border border-gray-100 dark:border-zinc-700 mt-2"
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
          style={{ width: centerSize, height: centerSize }}
          whileHover={{ scale: 1.1 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <LogoIcon size={48} className="text-zinc-900 dark:text-white" />

          <AnimatePresence>
            <motion.div
              key={`pulse-${activeIndex}`}
              className="absolute inset-0 rounded-2xl -z-10"
              style={{ backgroundColor: activeSat.color }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: [0, 0.3, 0], scale: [1, 1.4, 1.6] }}
              transition={{ duration: 0.8, delay: 1, ease: "easeOut" }}
            />
          </AnimatePresence>
        </motion.div>

        {/* Central SVG for Lines */}
        <svg
          className="absolute left-1/2 top-1/2 overflow-visible pointer-events-none z-10"
          style={{
            width: 600,
            height: 600,
            marginLeft: -300,
            marginTop: -300,
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
                key={`line-${index}`}
                x1={0} // Start from absolute center
                y1={0}
                x2={x}
                y2={y}
                stroke={isActive ? sat.color : colorScheme === "dark" ? "#52525b" : "#d1d5db"}
                strokeWidth={isActive ? 2 : 1}
                initial={{ opacity: 0.3 }}
                animate={{
                  opacity: isActive ? 1 : 0.3,
                  stroke: isActive ? sat.color : colorScheme === "dark" ? "#52525b" : "#d1d5db",
                }}
                transition={{ duration: 0.3 }}
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
            <div key={index} className="absolute left-1/2 top-1/2" style={{ width: 0, height: 0 }}>
              {/* Data Packet */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    className="absolute w-3 h-3 rounded-full z-10 shadow-sm pointer-events-none"
                    style={{
                      backgroundColor: sat.color,
                      marginLeft: -6,
                      marginTop: -6,
                    }}
                    initial={{ x: x, y: y, opacity: 0, scale: 0 }}
                    animate={{
                      x: [x, 0],
                      y: [y, 0],
                      opacity: [1, 1, 0],
                      scale: [1, 1, 0],
                    }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: 1,
                      ease: "easeInOut",
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Icon */}
              <motion.div
                className="absolute bg-white dark:bg-zinc-800 rounded-full shadow-lg flex items-center justify-center border border-gray-100 dark:border-zinc-700 z-20 cursor-pointer"
                style={{
                  width: satelliteSize,
                  height: satelliteSize,
                  marginLeft: -satelliteSize / 2,
                  marginTop: -satelliteSize / 2,
                  x: x,
                  y: y,
                }}
                animate={{
                  scale: isActive ? 1.2 : 1,
                  opacity: isActive ? 1 : 0.8, // Increased opacity slightly
                }}
                whileHover={{ scale: 1.2, opacity: 1, zIndex: 30 }}
                transition={{ duration: 0.3 }}
                onClick={() => setActiveIndex(index)}
              >
                <sat.icon
                  size={24}
                  color={isActive ? sat.color : "#9ca3af"}
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
