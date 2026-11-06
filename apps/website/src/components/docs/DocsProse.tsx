import { Typography } from "@mantine/core";
import type { ReactNode } from "react";

type DocsProseProps = {
  children: ReactNode;
};

/** Docs article wrapper. Stays a server component so MDX children can stay on the server. */
export function DocsProse({ children }: DocsProseProps) {
  return (
    <Typography className="docsProse docsRhythm" component="article">
      {children}
    </Typography>
  );
}
