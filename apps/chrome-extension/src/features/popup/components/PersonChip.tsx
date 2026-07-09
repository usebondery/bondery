import { Avatar, Badge } from "@mantine/core";

interface PersonChipProps {
  avatar?: string | null;
  color?: string;
  firstName: string;
  lastName?: string | null;
  onClick?: () => void;
  size?: "sm" | "md";
}

export function PersonChip({
  firstName,
  lastName,
  avatar,
  size = "md",
  onClick,
  color = "branding-primary",
}: PersonChipProps) {
  const fullName = `${firstName}${lastName ? ` ${lastName}` : ""}`.trim();
  const avatarEdgeSize = size === "sm" ? 26 : 32;
  const badgeSize = size === "sm" ? "lg" : "xl";

  return (
    <Badge
      color={color}
      leftSection={
        <Avatar name={fullName} radius="xl" size={avatarEdgeSize} src={avatar ?? undefined} />
      }
      onClick={onClick}
      size={badgeSize}
      variant="light"
    >
      {fullName}
    </Badge>
  );
}
