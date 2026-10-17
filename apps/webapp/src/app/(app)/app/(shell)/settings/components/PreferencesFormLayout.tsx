"use client";

import { Box, SimpleGrid, Stack } from "@mantine/core";
import type { ReactNode } from "react";

/**
 * Preferences section layout: mobile-first full-width fields, then two columns from Mantine `sm`.
 * Pair Mantine spacing with Tailwind width / min-width utilities so combobox targets truncate correctly.
 */
export function PreferencesFormBody({ children }: { children: ReactNode }) {
  return (
    <Stack className="w-full" gap="lg">
      {children}
    </Stack>
  );
}

export function PreferencesFieldRow({ children }: { children: ReactNode }) {
  return (
    <SimpleGrid className="w-full" cols={{ base: 1, sm: 2 }} spacing="md">
      {children}
    </SimpleGrid>
  );
}

export function PreferencesField({ children }: { children: ReactNode }) {
  return <Box className="min-w-0 w-full">{children}</Box>;
}

/** Theme segmented control: full width on mobile, compact cap on `sm+`. */
export function PreferencesThemeField({ children }: { children: ReactNode }) {
  return <Box className="min-w-0 w-full sm:max-w-96">{children}</Box>;
}
