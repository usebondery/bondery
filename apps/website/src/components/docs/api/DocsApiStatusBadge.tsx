import { Badge } from "@mantine/core";

/** Color per HTTP status class. */
function statusColor(status: number): "green" | "yellow" | "red" {
  if (status < 400) {
    return "green";
  }
  if (status < 500) {
    return "yellow";
  }
  return "red";
}

type DocsApiStatusBadgeProps = {
  size?: "xs" | "sm";
  status: number;
};

export function DocsApiStatusBadge({ size, status }: DocsApiStatusBadgeProps) {
  return (
    <Badge
      color={statusColor(status)}
      ff="monospace"
      radius="sm"
      size={size}
      style={{ flexShrink: 0 }}
      variant="light"
    >
      {status}
    </Badge>
  );
}
