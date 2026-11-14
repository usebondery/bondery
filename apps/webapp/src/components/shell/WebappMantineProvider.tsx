"use client";

import { bonderyTheme } from "@bondery/mantine-next";
import type { MantineColorScheme } from "@mantine/core";
import { DirectionProvider, MantineProvider, v8CssVariablesResolver } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import type { ReactNode } from "react";
import { sessionColorSchemeManager } from "@/lib/theme/sessionColorSchemeManager";

interface WebappMantineProviderProps {
  children: ReactNode;
  defaultColorScheme: MantineColorScheme;
  direction: "ltr" | "rtl";
}

export function WebappMantineProvider({
  children,
  defaultColorScheme,
  direction,
}: WebappMantineProviderProps) {
  const colorSchemeManager = sessionColorSchemeManager();

  return (
    <DirectionProvider initialDirection={direction}>
      <MantineProvider
        colorSchemeManager={colorSchemeManager}
        cssVariablesResolver={v8CssVariablesResolver}
        defaultColorScheme={defaultColorScheme}
        theme={bonderyTheme}
      >
        <Notifications autoClose={6000} position="top-center" />
        {children}
      </MantineProvider>
    </DirectionProvider>
  );
}
