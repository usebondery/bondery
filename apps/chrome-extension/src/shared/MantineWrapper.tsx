import React from "react";
import { MantineProvider } from "@mantine/core";
import { bonderyTheme } from "@bondery/mantine-next";
import "@mantine/core/styles.css";

interface MantineWrapperProps {
  children: React.ReactNode;
}

export function MantineWrapper({ children }: MantineWrapperProps) {
  return <MantineProvider theme={bonderyTheme}>{children}</MantineProvider>;
}
