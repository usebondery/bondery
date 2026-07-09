"use client";

import { Badge, Box, Card, Group, Stack, Text, ThemeIcon, useMantineTheme } from "@mantine/core";
import { IconBell } from "@tabler/icons-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

type TimelineItem = {
  id: string;
  type: "activity" | "reminder";
  title: string;
  date: string;
  description?: string;
  emoji?: string;
  tag?: string;
  delay?: number;
  color?: string;
};

const TIMELINE_ITEMS: TimelineItem[] = [
  {
    color: "yellow",
    date: "Feb 15, 2026",
    delay: 0,
    description: "Built reminder digest prototype with the team.",
    emoji: "🏆",
    id: "1",
    tag: "COMPETITION",
    title: "Prototype hackathon",
    type: "activity",
  },
  {
    color: "teal",
    date: "Feb 20, 2026",
    delay: 1.5,
    description: "Discussed summer trip ideas and catch up.",
    emoji: "☕",
    id: "2",
    tag: "SOCIAL",
    title: "Coffee with Sarah",
    type: "activity",
  },
  {
    color: "blue",
    date: "Mar 3, 2026",
    delay: 3,
    description: "Send congratulations card",
    emoji: "🎓",
    id: "3",
    title: "Graduation",
    type: "reminder",
  },
];

export function TimelineAnimation() {
  const _theme = useMantineTheme();

  // State to control staggered animation appearance
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    // Reveal items one by one
    const timer = setInterval(() => {
      setVisibleCount((prev) => {
        if (prev >= TIMELINE_ITEMS.length) {
          return prev;
        }
        return prev + 1;
      });
    }, 1500);

    return () => clearInterval(timer);
  }, []);

  return (
    <Box
      style={{
        height: 400,
        maxWidth: 400,
        overflow: "hidden",
        position: "relative",
        width: "100%",
      }}
    >
      {/* Timeline Line */}
      <div
        style={{
          backgroundColor: "light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-4))",
          bottom: "20px",
          left: "24px",
          position: "absolute",
          top: "20px",
          width: "2px",
          zIndex: 0,
        }}
      />

      <Stack
        gap="md"
        px="xs"
        py="xl"
        style={{ paddingLeft: "40px", position: "relative", zIndex: 1 }}
      >
        {TIMELINE_ITEMS.map((item, index) => (
          <TimelineItemCard isVisible={index < visibleCount} item={item} key={item.id} />
        ))}
      </Stack>

      {/* Gradient fade at bottom to handle overflow smoothly if list gets long */}
      <div
        style={{
          background:
            "linear-gradient(to top, light-dark(white, var(--mantine-color-dark-7)), transparent)",
          bottom: 0,
          height: "60px",
          left: 0,
          pointerEvents: "none",
          position: "absolute",
          right: 0,
          zIndex: 2,
        }}
      />
    </Box>
  );
}

function TimelineItemCard({ item, isVisible }: { item: TimelineItem; isVisible: boolean }) {
  return (
    <motion.div
      animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      initial={{ opacity: 0, y: 20 }}
      style={{ position: "relative", width: "100%" }}
      transition={{ damping: 20, stiffness: 300, type: "spring" }}
    >
      {/* Timeline Dot */}
      <div
        style={{
          backgroundColor:
            item.type === "reminder"
              ? "var(--mantine-color-blue-6)"
              : "light-dark(var(--mantine-color-gray-4), var(--mantine-color-dark-3))",
          border: "2px solid light-dark(white, var(--mantine-color-dark-7))",
          borderRadius: "50%",
          height: "10px",
          left: "-34px",
          marginTop: "-5px",
          position: "absolute",
          top: "50%",
          width: "10px",
          zIndex: 2,
        }}
      />

      <Card
        padding="md"
        radius="md"
        style={{
          backgroundColor: "light-dark(var(--mantine-color-white), var(--mantine-color-dark-6))",
          borderColor:
            item.type === "reminder"
              ? "light-dark(var(--mantine-color-blue-2), var(--mantine-color-blue-8))"
              : "light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-4))",
          overflow: "visible",
        }}
        withBorder
      >
        {item.type === "activity" ? (
          <Group align="center" wrap="nowrap">
            {/* Emoji Circle - Colored */}
            <ThemeIcon
              color={item.color}
              radius="xl"
              size={40}
              style={{ flexShrink: 0 }}
              variant="light"
            >
              <span style={{ fontSize: 20 }}>{item.emoji}</span>
            </ThemeIcon>

            <div style={{ flex: 1 }}>
              {/* Title Row */}
              <Group align="center" justify="space-between" wrap="nowrap">
                <Text
                  c="light-dark(var(--mantine-color-dark-9), var(--mantine-color-white))"
                  fw={700}
                  size="sm"
                  truncate
                >
                  {item.title}
                </Text>
                <Text c="dimmed" fw={500} size="xs" style={{ marginLeft: 8, whiteSpace: "nowrap" }}>
                  {item.date}
                </Text>
              </Group>

              {/* Badge Row */}
              {item.tag && (
                <Badge color={item.color} mb={4} radius="sm" size="xs" variant="light">
                  {item.tag}
                </Badge>
              )}

              {/* Description */}
              <Text c="dimmed" lineClamp={2} size="xs">
                {item.description}
              </Text>
            </div>
          </Group>
        ) : (
          <Group align="center" wrap="nowrap">
            <Stack align="center" gap={0} style={{ flexShrink: 0, minWidth: 40 }}>
              <Text c="blue" fw={700} size="xs">
                MAR
              </Text>
              <Text fw={700} lh={1} size="lg">
                03
              </Text>
            </Stack>

            <div
              style={{
                borderLeft:
                  "1px solid light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-4))",
                flex: 1,
                paddingLeft: 8,
              }}
            >
              <Text
                c="light-dark(var(--mantine-color-dark-9), var(--mantine-color-white))"
                fw={600}
                size="sm"
              >
                {item.emoji} {item.title}
              </Text>
              <Text c="dimmed" lineClamp={1} size="xs">
                {item.description}
              </Text>
            </div>

            {/* Right side: Bell + "In 3 days" */}
            <Badge color="orange" leftSection={<IconBell size={12} />} variant="light">
              In 3 days
            </Badge>
          </Group>
        )}
      </Card>
    </motion.div>
  );
}
