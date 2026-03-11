"use client";

import { Spoiler, Stack, Text } from "@mantine/core";
import { useTranslations } from "next-intl";

interface LinkedInBioSectionProps {
  bio: string;
}

/**
 * Renders the LinkedIn About / bio text above the work history section.
 * Preserves line breaks using `white-space: pre-wrap`.
 * Long bios are collapsed via a Spoiler with show/hide controls.
 *
 * @param bio - The raw bio text scraped from the LinkedIn About section.
 */
export function LinkedInBioSection({ bio }: LinkedInBioSectionProps) {
  const t = useTranslations("LinkedInData");

  return (
    <Stack gap="xs">
      <Text size="sm" fw={500}>
        {t("About")}
      </Text>
      <Spoiler maxHeight={60} showLabel={t("ShowMore")} hideLabel={t("ShowLess")}>
        <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
          {bio}
        </Text>
      </Spoiler>
    </Stack>
  );
}
