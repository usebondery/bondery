"use client";

import { Spoiler, Stack, Text } from "@mantine/core";
import { useLinkedInDataTranslations } from "@/lib/i18n/generated/hooks";

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
  const t = useLinkedInDataTranslations();

  return (
    <Stack gap="xs">
      <Text fw={500} size="sm">
        {t("About")}
      </Text>
      <Spoiler hideLabel={t("ShowLess")} maxHeight={60} showLabel={t("ShowMore")}>
        <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
          {bio}
        </Text>
      </Spoiler>
    </Stack>
  );
}
