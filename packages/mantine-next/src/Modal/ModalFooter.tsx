import { Button, Group } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import type { ReactNode } from "react";

export interface ModalFooterProps {
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
  const showBack = Boolean(backLabel && onBack);
  const showCancel = Boolean(cancelLabel && onCancel);
  const showAction = Boolean(actionLabel);
  const resolvedActionLeftSection =
    actionLeftSection || (!actionRightSection && showAction ? <IconCheck size={16} /> : undefined);

  return (
    <Group justify={showBack ? "space-between" : "flex-end"} mt="md">
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

      {(showCancel || showAction) && (
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
      )}
    </Group>
  );
}
