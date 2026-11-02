import type { DescribedSelectOption } from "@bondery/mantine-next";
import { IconEye, IconShieldCheck } from "@tabler/icons-react";

export function mcpAccessOptions(copy: {
  fullDescription: string;
  fullLabel: string;
  readDescription: string;
  readLabel: string;
}): DescribedSelectOption[] {
  return [
    {
      description: copy.readDescription,
      label: copy.readLabel,
      leftSection: <IconEye size={16} stroke={1.5} />,
      value: "read",
    },
    {
      description: copy.fullDescription,
      label: copy.fullLabel,
      leftSection: <IconShieldCheck size={16} stroke={1.5} />,
      value: "full",
    },
  ];
}
