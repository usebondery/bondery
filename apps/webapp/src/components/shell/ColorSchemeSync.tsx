"use client";

import type { ColorSchemePreference } from "@bondery/schemas";
import { useMantineColorScheme } from "@mantine/core";
import { useEffect } from "react";

interface ColorSchemeSyncProps {
  colorScheme: ColorSchemePreference;
}

export function ColorSchemeSync({ colorScheme }: ColorSchemeSyncProps) {
  const { setColorScheme } = useMantineColorScheme();

  useEffect(() => {
    setColorScheme(colorScheme);
  }, [colorScheme, setColorScheme]);

  return null;
}
