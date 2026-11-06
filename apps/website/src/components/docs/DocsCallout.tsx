import { Alert } from "@mantine/core";
import { IconAlertTriangle, IconInfoCircle } from "@tabler/icons-react";
import type { ReactNode } from "react";

type DocsCalloutProps = {
  children: ReactNode;
  title?: string;
  type: "info" | "warn";
};

export function DocsCallout({ children, title, type }: DocsCalloutProps) {
  const warn = type === "warn";

  return (
    <Alert
      color={warn ? "yellow" : "branding-primary"}
      icon={warn ? <IconAlertTriangle size={16} /> : <IconInfoCircle size={16} />}
      title={title}
    >
      {children}
    </Alert>
  );
}
