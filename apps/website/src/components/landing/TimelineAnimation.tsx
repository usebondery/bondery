"use client";

import { useMantineTheme, Card, Text, Group, Stack, Badge, Box, ThemeIcon } from "@mantine/core";
import { IconBell } from "@tabler/icons-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

type TimelineItem = {
  id: string;
  type: "event" | "reminder";
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
    id: "1",
    type: "event",
    title: "Prototype hackathon",
    date: "Feb 15, 2026",
    description: "Built reminder digest prototype with the team.",
    emoji: "🏆",
    tag: "COMPETITION",
    delay: 0,
    color: "yellow",
  },
  {
    id: "2",
    type: "event",
    title: "Coffee with Sarah",
    date: "Feb 20, 2026",
    description: "Discussed summer trip ideas and catch up.",
    emoji: "☕",
    tag: "SOCIAL",
    delay: 1.5,
    color: "teal",
  },
  {
    id: "3",
    type: "reminder",
    title: "Graduation",
    date: "Mar 3, 2026",
    description: "Send congratulations card",
    emoji: "🎓",
    delay: 3,
    color: "blue",
  },
];

export function TimelineAnimation() {
  const theme = useMantineTheme();

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
        position: "relative",
        width: "100%",
        maxWidth: 400,
        height: 400,
        overflow: "hidden",
      }}
    >
      {/* Timeline Line */}
      <div
        style={{
          position: "absolute",
          left: "24px",
          top: "20px",
          bottom: "20px",
          width: "2px",
          backgroundColor: "light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-4))",
          zIndex: 0,
        }}
      />

      <Stack
        gap="md"
        py="xl"
        px="xs"
        style={{ position: "relative", zIndex: 1, paddingLeft: "40px" }}
      >
        {TIMELINE_ITEMS.map((item, index) => (
          <TimelineItemCard key={item.id} item={item} isVisible={index < visibleCount} />
        ))}
      </Stack>

      {/* Gradient fade at bottom to handle overflow smoothly if list gets long */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "60px",
          background:
            "linear-gradient(to top, light-dark(white, var(--mantine-color-dark-7)), transparent)",
          pointerEvents: "none",
          zIndex: 2,
        }}
      />
    </Box>
  );
}

function TimelineItemCard({ item, isVisible }: { item: TimelineItem; isVisible: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      style={{ width: "100%", position: "relative" }}
    >
      {/* Timeline Dot */}
      <div
        style={{
          position: "absolute",
          left: "-34px",
          top: "50%",
          marginTop: "-5px",
          width: "10px",
          height: "10px",
          borderRadius: "50%",
          backgroundColor:
            item.type === "reminder"
              ? "var(--mantine-color-blue-6)"
              : "light-dark(var(--mantine-color-gray-4), var(--mantine-color-dark-3))",
          border: "2px solid light-dark(white, var(--mantine-color-dark-7))",
          zIndex: 2,
        }}
      />

      <Card
        padding="md"
        radius="md"
        withBorder
        style={{
          overflow: "visible",
          borderColor:
            item.type === "reminder"
              ? "light-dark(var(--mantine-color-blue-2), var(--mantine-color-blue-8))"
              : "light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-4))",
          backgroundColor: "light-dark(var(--mantine-color-white), var(--mantine-color-dark-6))",
        }}
      >
        {item.type === "event" ? (
          <Group align="center" wrap="nowrap">
            {/* Emoji Circle - Colored */}
            <ThemeIcon
              size={40}
              radius="xl"
              variant="light"
              color={item.color}
              style={{ flexShrink: 0 }}
            >
              <span style={{ fontSize: 20 }}>{item.emoji}</span>
            </ThemeIcon>

            <div style={{ flex: 1 }}>
              {/* Title Row */}
              <Group justify="space-between" align="center" wrap="nowrap">
                <Text
                  fw={700}
                  size="sm"
                  c="light-dark(var(--mantine-color-dark-9), var(--mantine-color-white))"
                  truncate
                >
                  {item.title}
                </Text>
                <Text size="xs" c="dimmed" fw={500} style={{ whiteSpace: "nowrap", marginLeft: 8 }}>
                  {item.date}
                </Text>
              </Group>

              {/* Badge Row */}
              {item.tag && (
                <Badge variant="light" size="xs" color={item.color} radius="sm" mb={4}>
                  {item.tag}
                </Badge>
              )}

              {/* Description */}
              <Text size="xs" c="dimmed" lineClamp={2}>
                {item.description}
              </Text>
            </div>
          </Group>
        ) : (
          <Group wrap="nowrap" align="center">
            <Stack gap={0} align="center" style={{ minWidth: 40, flexShrink: 0 }}>
              <Text size="xs" fw={700} c="blue">
                MAR
              </Text>
              <Text size="lg" fw={700} lh={1}>
                03
              </Text>
            </Stack>

            <div
              style={{
                flex: 1,
                paddingLeft: 8,
                borderLeft:
                  "1px solid light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-4))",
              }}
            >
              <Text
                fw={600}
                size="sm"
                c="light-dark(var(--mantine-color-dark-9), var(--mantine-color-white))"
              >
                {item.emoji} {item.title}
              </Text>
              <Text size="xs" c="dimmed" lineClamp={1}>
                {item.description}
              </Text>
            </div>

            {/* Right side: Bell + "In 3 days" */}
            <Badge variant="light" color="orange" leftSection={<IconBell size={12} />}>
              In 3 days
            </Badge>
          </Group>
        )}
      </Card>
    </motion.div>
  );
}
