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
      icon: <IconEye size={16} stroke={1.5} />,
      label: copy.readLabel,
      value: "read",
    },
    {
      description: copy.fullDescription,
      icon: <IconShieldCheck size={16} stroke={1.5} />,
      label: copy.fullLabel,
      value: "full",
    },
  ];
}
