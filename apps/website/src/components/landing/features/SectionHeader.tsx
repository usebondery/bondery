import { Badge, Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

type SectionHeaderProps = {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "center" | "left";
  titleId?: string;
};

/**
 * Heading for a landing page section, with an optional eyebrow badge and subtitle.
 */
export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "center",
  titleId,
}: SectionHeaderProps) {
  const centered = align === "center";

  return (
    <Stack
      align={centered ? "center" : "flex-start"}
      className={centered ? "mx-auto max-w-2xl" : "max-w-xl"}
      gap="md"
    >
      {eyebrow ? (
        <Badge radius="xl" size="lg" tt="none" variant="light">
          {eyebrow}
        </Badge>
      ) : null}
      <Title
        className="text-3xl! leading-tight! font-bold tracking-tight md:text-5xl!"
        id={titleId}
        order={2}
        style={{ textWrap: "balance" }}
        ta={centered ? "center" : "left"}
      >
        {title}
      </Title>
      {description ? (
        <Text c="dimmed" size="lg" style={{ textWrap: "pretty" }} ta={centered ? "center" : "left"}>
          {description}
        </Text>
      ) : null}
    </Stack>
  );
}
