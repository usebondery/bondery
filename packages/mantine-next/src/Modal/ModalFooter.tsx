import { Button, Group, Stack } from "@mantine/core";
import type { MantineSpacing } from "@mantine/core";
import { IconCheck, IconTrash } from "@tabler/icons-react";
import type { ReactNode } from "react";

export interface ModalFooterProps {
  mt?: MantineSpacing;
  dangerLabel?: string;
  onDanger?: () => void;
  dangerDisabled?: boolean;
  dangerLeftSection?: ReactNode;
  backLabel?: string;
  onBack?: () => void;
  backDisabled?: boolean;
  backLeftSection?: ReactNode;
  cancelLabel?: string;
  onCancel?: () => void;
  cancelDisabled?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  actionType?: "button" | "submit";
  actionColor?: string;
  actionVariant?: "filled" | "light" | "outline" | "subtle" | "default";
  actionLeftSection?: ReactNode;
  actionRightSection?: ReactNode;
  actionLoading?: boolean;
  actionDisabled?: boolean;
}

export function ModalFooter({
  mt = "md",
  dangerLabel,
  onDanger,
  dangerDisabled,
  dangerLeftSection,
  backLabel,
  onBack,
  backDisabled,
  backLeftSection,
  cancelLabel,
  onCancel,
  cancelDisabled,
  actionLabel,
  onAction,
  actionType = "button",
  actionColor,
  actionVariant = "filled",
  actionLeftSection,
  actionRightSection,
  actionLoading = false,
  actionDisabled,
}: ModalFooterProps) {
  const showDanger = Boolean(dangerLabel && onDanger);
  const showBack = Boolean(backLabel && onBack);
  const showCancel = Boolean(cancelLabel && onCancel);
  const showAction = Boolean(actionLabel);
  const showRightCluster = showCancel || showAction;
  const singleAction = showAction && !showCancel && !showBack && !showDanger;
  const resolvedActionLeftSection = singleAction
    ? actionLeftSection
    : actionLeftSection || (!actionRightSection && showAction ? <IconCheck size={16} /> : undefined);
  const resolvedDangerLeftSection = dangerLeftSection ?? <IconTrash size={16} />;

  if (singleAction) {
    return (
      <Stack mt={mt}>
        <Button
          type={actionType}
          color={actionColor}
          variant={actionVariant}
          leftSection={resolvedActionLeftSection}
          rightSection={actionRightSection}
          onClick={onAction}
          loading={actionLoading}
          disabled={actionDisabled}
          fullWidth
        >
          {actionLabel}
        </Button>
      </Stack>
    );
  }

  const leftSlot =
    showDanger || showBack ? (
      <Group gap="sm">
        {showDanger ? (
          <Button
            type="button"
            variant="light"
            color="red"
            leftSection={resolvedDangerLeftSection}
            onClick={onDanger}
            disabled={dangerDisabled}
          >
            {dangerLabel}
          </Button>
        ) : null}
        {showBack ? (
          <Button
            variant="default"
            leftSection={backLeftSection}
            onClick={onBack}
            disabled={backDisabled}
          >
            {backLabel}
          </Button>
        ) : null}
      </Group>
    ) : null;

  return (
    <Group
      justify={showDanger || showBack ? "space-between" : "flex-end"}
      align="center"
      mt={mt}
    >
      {leftSlot}

      {showRightCluster ? (
        <Group>
          {showCancel ? (
            <Button variant="default" onClick={onCancel} disabled={cancelDisabled}>
              {cancelLabel}
            </Button>
          ) : null}

          {showAction ? (
            <Button
              type={actionType}
              color={actionColor}
              variant={actionVariant}
              leftSection={resolvedActionLeftSection}
              rightSection={actionRightSection}
              onClick={onAction}
              loading={actionLoading}
              disabled={actionDisabled}
            >
              {actionLabel}
            </Button>
          ) : null}
        </Group>
      ) : null}
    </Group>
  );
}
