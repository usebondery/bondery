import { Group, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { IconPencil, IconPlus, IconX } from "@tabler/icons-react";

interface TagPillProps {
  className?: string;
  clearable?: boolean;
  color?: string | null;
  label: string;
  onClick?: () => void;
  onRemove?: () => void;
  preventInputBlur?: boolean;
  removeTooltipLabel?: string;
  showAddIcon?: boolean;
  showEditIcon?: boolean;
  size?: "xs" | "sm" | "md";
  tooltipLabel?: string;
}

export function TagPill({
  label,
  color,
  onClick,
  tooltipLabel,
  showEditIcon = false,
  showAddIcon = false,
  preventInputBlur = false,
  className,
  clearable = false,
  onRemove,
  removeTooltipLabel,
  size = "xs",
}: TagPillProps) {
  const spacingBySize: Record<
    NonNullable<TagPillProps["size"]>,
    { px: number; py: number; font: string }
  > = {
    md: { font: "md", px: 14, py: 8 },
    sm: { font: "sm", px: 12, py: 6 },
    xs: { font: "xs", px: 10, py: 4 },
  };

  const resolved = spacingBySize[size];
  const backgroundColor = color ? `${color}1a` : "var(--mantine-color-gray-0)";
  const borderColor = color ? `${color}66` : "var(--mantine-color-gray-4)";

  return (
    <Group
      className={`button-scale-effect ${className ?? ""}`}
      gap={0}
      style={{
        backgroundColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 999,
        overflow: "hidden",
      }}
      wrap="nowrap"
    >
      {onClick ? (
        <Tooltip label={tooltipLabel} withArrow>
          <UnstyledButton
            onClick={onClick}
            onMouseDown={(event) => {
              if (preventInputBlur) {
                event.preventDefault();
              }
            }}
            style={{
              alignItems: "center",
              color: color || undefined,
              display: "flex",
              gap: 6,
              padding: `${resolved.py}px ${resolved.px}px`,
            }}
          >
            <Text c="inherit" fw={500} size={resolved.font}>
              {label}
            </Text>
            {showEditIcon ? <IconPencil size={14} /> : null}
            {showAddIcon ? <IconPlus size={14} /> : null}
          </UnstyledButton>
        </Tooltip>
      ) : (
        <span
          style={{
            alignItems: "center",
            color: color || undefined,
            display: "inline-flex",
            gap: 6,
            padding: `${resolved.py}px ${resolved.px}px`,
          }}
        >
          <Text c="inherit" fw={500} size={resolved.font}>
            {label}
          </Text>
        </span>
      )}

      {clearable && onRemove ? (
        <Tooltip label={removeTooltipLabel} withArrow>
          <UnstyledButton
            aria-label={removeTooltipLabel}
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
            onMouseDown={(event) => {
              if (preventInputBlur) {
                event.preventDefault();
              }
            }}
            style={{
              alignItems: "center",
              borderLeft: `1px solid ${borderColor}`,
              color: color || "var(--mantine-color-gray-7)",
              display: "flex",
              justifyContent: "center",
              padding: `${resolved.py}px ${Math.max(8, resolved.py + 4)}px`,
            }}
            title={removeTooltipLabel}
          >
            <IconX size={14} />
          </UnstyledButton>
        </Tooltip>
      ) : null}
    </Group>
  );
}
