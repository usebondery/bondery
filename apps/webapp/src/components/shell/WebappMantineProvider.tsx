"use client";

import { bonderyTheme } from "@bondery/mantine-next";
import type { MantineColorScheme } from "@mantine/core";
import { MantineProvider, v8CssVariablesResolver } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { sessionColorSchemeManager } from "@/lib/theme/sessionColorSchemeManager";

interface WebappMantineProviderProps {
  children: ReactNode;
  defaultColorScheme: MantineColorScheme;
}

export function WebappMantineProvider({
  children,
  defaultColorScheme,
}: WebappMantineProviderProps) {
  const colorSchemeManager = useMemo(() => sessionColorSchemeManager(), []);

  return (
    <MantineProvider
      colorSchemeManager={colorSchemeManager}
      cssVariablesResolver={v8CssVariablesResolver}
      defaultColorScheme={defaultColorScheme}
      theme={bonderyTheme}
    >
      <Notifications autoClose={6000} position="top-center" />
      {children}
    </MantineProvider>
  );
}
