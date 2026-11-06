"use client";

import { bonderyTheme, CodeHighlightProvider } from "@bondery/mantine-next";
import { MantineProvider, v8CssVariablesResolver } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import type { ReactNode } from "react";

/** Mantine, notifications, and code highlighting. Every website page renders inside this. */
export function MantineShell({ children }: { children: ReactNode }) {
  return (
    <MantineProvider
      cssVariablesResolver={v8CssVariablesResolver}
      defaultColorScheme="auto"
      theme={bonderyTheme}
    >
      <Notifications autoClose={6000} position="top-center" />
      <CodeHighlightProvider>{children}</CodeHighlightProvider>
    </MantineProvider>
  );
}
