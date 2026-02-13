"use client";

import { useEffect } from "react";
import { useMantineColorScheme } from "@mantine/core";
import type { ColorSchemePreference } from "@bondery/types";

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
