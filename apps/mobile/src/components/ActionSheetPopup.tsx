import { IconX } from "@tabler/icons-react-native";
import { Sheet } from "@tamagui/sheet";
import { XStack } from "@tamagui/stacks";
import { Paragraph } from "@tamagui/text";
import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { TAMAGUI_TRANSITION } from "../theme/animations";
import type { MobileThemeColors } from "../theme/colors";
import { MOBILE_HIT_SLOP, MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../theme/tokens";
import { useMobileThemeColors } from "../theme/useMobileThemeColors";

type ActionTone = "primary" | "danger" | "neutral";
type ActionVariant = "filled" | "outline";

export interface ActionSheetPopupAction {
  disabled?: boolean;
  icon?: ReactNode;
  label: string;
  loading?: boolean;
  onPress: () => void;
  tone?: ActionTone;
  variant?: ActionVariant;
}

interface ActionSheetPopupProps {
  actions: [ActionSheetPopupAction] | [ActionSheetPopupAction, ActionSheetPopupAction];
  children?: ReactNode;
  /** Disables form inputs and prevents dismissal while an async operation runs. */
  isBusy?: boolean;
  onClose: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
}

function getActionPalette(tone: ActionTone, variant: ActionVariant, colors: MobileThemeColors) {
  const toneColor =
    tone === "danger"
      ? colors.dangerAccent
      : tone === "neutral"
        ? colors.neutralAccent
        : colors.primary;

  if (variant === "filled") {
    return {
      backgroundColor: toneColor,
      borderColor: toneColor,
      spinnerColor: colors.textOnPrimary,
      textColor: colors.textOnPrimary,
    };
  }

  return {
    backgroundColor: colors.surface,
    borderColor: tone === "neutral" ? colors.borderStrong : toneColor,
    spinnerColor: tone === "neutral" ? colors.textSecondary : toneColor,
    textColor: tone === "neutral" ? colors.textSecondary : toneColor,
  };
}

function ActionSheetPopupButton({
  action,
  flex,
}: {
  action: ActionSheetPopupAction;
  flex?: number;
}) {
  const colors = useMobileThemeColors();
  const tone = action.tone ?? "primary";
  const variant = action.variant ?? "outline";
  const palette = getActionPalette(tone, variant, colors);
  const disabled = action.disabled || action.loading;
  const hasIcon = action.icon != null;

  return (
    <XStack
      alignItems="center"
      backgroundColor={palette.backgroundColor}
      borderColor={palette.borderColor}
      borderRadius={MOBILE_LAYOUT.borderRadius.control}
      borderWidth={1}
      flex={flex}
      gap={hasIcon ? 8 : 0}
      justifyContent="center"
      minHeight={MOBILE_LAYOUT.touchTarget}
      onPress={action.onPress}
      opacity={disabled ? 0.6 : 1}
      paddingHorizontal={14}
      paddingVertical={10}
      pointerEvents={disabled ? "none" : "auto"}
      pressStyle={{ opacity: 0.88, transition: TAMAGUI_TRANSITION.quick }}
      transition={TAMAGUI_TRANSITION.quick}
    >
      {hasIcon ? (
        <XStack alignItems="center" justifyContent="center" width={20}>
          {action.loading ? (
            <ActivityIndicator color={palette.spinnerColor} size="small" />
          ) : (
            action.icon
          )}
        </XStack>
      ) : action.loading ? (
        <ActivityIndicator color={palette.spinnerColor} size="small" />
      ) : null}

      <Paragraph
        color={palette.textColor}
        fontSize={MOBILE_TYPOGRAPHY.fontSize.body}
        fontWeight={MOBILE_TYPOGRAPHY.fontWeight.semibold}
        numberOfLines={1}
      >
        {action.label}
      </Paragraph>
    </XStack>
  );
}

function ActionSheetHeader({
  title,
  showSpinner,
  onClose,
}: {
  title: string;
  showSpinner: boolean;
  onClose: () => void;
}) {
  const colors = useMobileThemeColors();

  return (
    <View style={styles.header}>
      <Paragraph
        color={colors.textPrimary}
        flex={1}
        fontSize={MOBILE_TYPOGRAPHY.fontSize.sheetTitle}
        fontWeight={MOBILE_TYPOGRAPHY.fontWeight.bold}
        numberOfLines={3}
      >
        {title}
      </Paragraph>

      <View key={showSpinner ? "busy" : "idle"} style={styles.closeButton}>
        {showSpinner ? (
          <ActivityIndicator accessibilityLabel="Loading" color={colors.primary} size="small" />
        ) : (
          <Pressable
            accessibilityLabel="Close"
            accessibilityRole="button"
            hitSlop={MOBILE_HIT_SLOP.icon}
            onPress={onClose}
            style={({ pressed }) => [styles.closeButtonInner, pressed && { opacity: 0.7 }]}
          >
            <IconX size={20} stroke={colors.iconPrimary} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

/**
 * Standardized bottom sheet with a required title, header close control, and up to two
 * action buttons grouped at the bottom with left-aligned icons.
 *
 * When `isBusy` is true (or any action is `loading`), the sheet cannot be dismissed until
 * the operation completes: overlay tap, swipe, and header close are blocked, and the close
 * control shows a loading spinner instead of the dismiss icon.
 */
export function ActionSheetPopup({
  open,
  title,
  children,
  actions,
  onOpenChange,
  onClose,
  isBusy = false,
}: ActionSheetPopupProps) {
  const colors = useMobileThemeColors();
  const isCompact = children == null;
  const isLocked = isBusy || actions.some((action) => action.loading);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && isLocked) {
      return;
    }

    onOpenChange(nextOpen);
  }

  function handleClose() {
    if (isLocked) {
      return;
    }

    onClose();
  }

  const actionFooter = (
    <View style={[styles.footer, isCompact && styles.footerCompact]}>
      <View style={actions.length === 2 ? styles.actionRow : styles.actionColumn}>
        {actions.map((action) => (
          <ActionSheetPopupButton
            action={action}
            flex={actions.length === 2 ? 1 : undefined}
            key={action.label}
          />
        ))}
      </View>
    </View>
  );

  return (
    <Sheet
      disableDrag={isLocked}
      dismissOnOverlayPress={!isLocked}
      dismissOnSnapToBottom={!isLocked}
      modal
      moveOnKeyboardChange
      native
      onOpenChange={handleOpenChange}
      open={open}
      snapPointsMode="fit"
    >
      <Sheet.Overlay backgroundColor={colors.overlay} />
      {isCompact ? (
        <Sheet.Frame
          flex={0}
          paddingBottom={20}
          paddingHorizontal={MOBILE_LAYOUT.spacing.horizontal}
          paddingTop={16}
        >
          <View style={styles.compactContent}>
            <ActionSheetHeader onClose={handleClose} showSpinner={isLocked} title={title} />
            {actionFooter}
          </View>
        </Sheet.Frame>
      ) : (
        <Sheet.Frame
          flex={0}
          paddingBottom={20}
          paddingHorizontal={MOBILE_LAYOUT.spacing.horizontal}
          paddingTop={16}
        >
          <View style={styles.content}>
            <ActionSheetHeader onClose={handleClose} showSpinner={isLocked} title={title} />
            <View style={styles.body}>{children}</View>
            {actionFooter}
          </View>
        </Sheet.Frame>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  actionColumn: {
    flexDirection: "column",
    gap: 10,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  body: {
    gap: 12,
  },
  closeButton: {
    alignItems: "center",
    height: MOBILE_LAYOUT.iconButton,
    justifyContent: "center",
    width: MOBILE_LAYOUT.iconButton,
  },
  closeButtonInner: {
    alignItems: "center",
    height: MOBILE_LAYOUT.iconButton,
    justifyContent: "center",
    width: MOBILE_LAYOUT.iconButton,
  },
  compactContent: {
    gap: 20,
  },
  content: {
    gap: 12,
  },
  footer: {
    paddingTop: 4,
  },
  footerCompact: {
    paddingTop: 0,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
    minHeight: 32,
  },
});
