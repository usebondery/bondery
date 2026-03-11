import { Group, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { IconPencil, IconPlus, IconX } from "@tabler/icons-react";

interface TagPillProps {
  label: string;
  color?: string | null;
  onClick: () => void;
  tooltipLabel: string;
  showEditIcon?: boolean;
  showAddIcon?: boolean;
  preventInputBlur?: boolean;
  className?: string;
  clearable?: boolean;
  onRemove?: () => void;
  removeTooltipLabel?: string;
  size?: "xs" | "sm" | "md";
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
    xs: { px: 10, py: 4, font: "xs" },
    sm: { px: 12, py: 6, font: "sm" },
    md: { px: 14, py: 8, font: "md" },
  };

  const resolved = spacingBySize[size];
  const backgroundColor = color ? `${color}1a` : "var(--mantine-color-gray-0)";
  const borderColor = color ? `${color}66` : "var(--mantine-color-gray-4)";

  return (
    <Group
      gap={0}
      wrap="nowrap"
      className={`button-scale-effect ${className ?? ""}`}
      style={{
        borderRadius: 999,
        overflow: "hidden",
        border: `1px solid ${borderColor}`,
        backgroundColor,
      }}
    >
      <Tooltip label={tooltipLabel} withArrow>
        <UnstyledButton
          onMouseDown={(event) => {
            if (preventInputBlur) {
              event.preventDefault();
            }
          }}
          onClick={onClick}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: `${resolved.py}px ${resolved.px}px`,
            color: color || undefined,
          }}
        >
          <Text size={resolved.font} fw={500} c="inherit">
            {label}
          </Text>
          {showEditIcon ? <IconPencil size={14} /> : null}
          {showAddIcon ? <IconPlus size={14} /> : null}
        </UnstyledButton>
      </Tooltip>

      {clearable && onRemove ? (
        <Tooltip label={removeTooltipLabel} withArrow>
          <UnstyledButton
            aria-label={removeTooltipLabel}
            title={removeTooltipLabel}
            onMouseDown={(event) => {
              if (preventInputBlur) {
                event.preventDefault();
              }
            }}
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: `${resolved.py}px ${Math.max(8, resolved.py + 4)}px`,
              borderLeft: `1px solid ${borderColor}`,
              color: color || "var(--mantine-color-gray-7)",
            }}
          >
            <IconX size={14} />
          </UnstyledButton>
        </Tooltip>
      ) : null}
    </Group>
  );
}
