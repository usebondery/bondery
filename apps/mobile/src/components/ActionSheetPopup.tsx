import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { IconX } from "@tabler/icons-react-native";
import { Sheet } from "@tamagui/sheet";
import { XStack } from "@tamagui/stacks";
import { Paragraph } from "@tamagui/text";
import { TAMAGUI_TRANSITION } from "../theme/animations";
import type { MobileThemeColors } from "../theme/colors";
import { MOBILE_HIT_SLOP, MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../theme/tokens";
import { useMobileThemeColors } from "../theme/useMobileThemeColors";

type ActionTone = "primary" | "danger" | "neutral";
type ActionVariant = "filled" | "outline";

export interface ActionSheetPopupAction {
  label: string;
  icon?: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  tone?: ActionTone;
  variant?: ActionVariant;
}

interface ActionSheetPopupProps {
  open: boolean;
  title: string;
  children?: ReactNode;
  actions: [ActionSheetPopupAction] | [ActionSheetPopupAction, ActionSheetPopupAction];
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  /** Disables form inputs and prevents dismissal while an async operation runs. */
  isBusy?: boolean;
}

function getActionPalette(tone: ActionTone, variant: ActionVariant, colors: MobileThemeColors) {
  const toneColor =
    tone === "danger" ? colors.dangerAccent : tone === "neutral" ? colors.neutralAccent : colors.primary;

  if (variant === "filled") {
    return {
      backgroundColor: toneColor,
      borderColor: toneColor,
      textColor: colors.textOnPrimary,
      spinnerColor: colors.textOnPrimary,
    };
  }

  return {
    backgroundColor: colors.surface,
    borderColor: tone === "neutral" ? colors.borderStrong : toneColor,
    textColor: tone === "neutral" ? colors.textSecondary : toneColor,
    spinnerColor: tone === "neutral" ? colors.textSecondary : toneColor,
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
      flex={flex}
      minHeight={MOBILE_LAYOUT.touchTarget}
      borderRadius={MOBILE_LAYOUT.borderRadius.control}
      borderWidth={1}
      borderColor={palette.borderColor}
      backgroundColor={palette.backgroundColor}
      alignItems="center"
      justifyContent="center"
      paddingHorizontal={14}
      paddingVertical={10}
      gap={hasIcon ? 8 : 0}
      opacity={disabled ? 0.6 : 1}
      transition={TAMAGUI_TRANSITION.quick}
      pressStyle={{ opacity: 0.88, transition: TAMAGUI_TRANSITION.quick }}
      onPress={action.onPress}
      pointerEvents={disabled ? "none" : "auto"}
    >
      {hasIcon ? (
        <XStack width={20} justifyContent="center" alignItems="center">
          {action.loading ? (
            <ActivityIndicator size="small" color={palette.spinnerColor} />
          ) : (
            action.icon
          )}
        </XStack>
      ) : action.loading ? (
        <ActivityIndicator size="small" color={palette.spinnerColor} />
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
        fontSize={MOBILE_TYPOGRAPHY.fontSize.sheetTitle}
        fontWeight={MOBILE_TYPOGRAPHY.fontWeight.bold}
        color={colors.textPrimary}
        flex={1}
        numberOfLines={3}
      >
        {title}
      </Paragraph>

      <View style={styles.closeButton} key={showSpinner ? "busy" : "idle"}>
        {showSpinner ? (
          <ActivityIndicator
            size="small"
            color={colors.primary}
            accessibilityLabel="Loading"
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
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
            key={action.label}
            action={action}
            flex={actions.length === 2 ? 1 : undefined}
          />
        ))}
      </View>
    </View>
  );

  return (
    <Sheet
      native
      modal
      open={open}
      onOpenChange={handleOpenChange}
      dismissOnSnapToBottom={!isLocked}
      dismissOnOverlayPress={!isLocked}
      disableDrag={isLocked}
      snapPointsMode="fit"
      moveOnKeyboardChange
    >
      <Sheet.Overlay backgroundColor={colors.overlay} />
      {isCompact ? (
        <Sheet.Frame
          flex={0}
          paddingHorizontal={MOBILE_LAYOUT.spacing.horizontal}
          paddingTop={16}
          paddingBottom={20}
        >
          <View style={styles.compactContent}>
            <ActionSheetHeader title={title} showSpinner={isLocked} onClose={handleClose} />
            {actionFooter}
          </View>
        </Sheet.Frame>
      ) : (
        <Sheet.Frame
          flex={0}
          paddingHorizontal={MOBILE_LAYOUT.spacing.horizontal}
          paddingTop={16}
          paddingBottom={20}
        >
          <View style={styles.content}>
            <ActionSheetHeader title={title} showSpinner={isLocked} onClose={handleClose} />
            <View style={styles.body}>{children}</View>
            {actionFooter}
          </View>
        </Sheet.Frame>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  compactContent: {
    gap: 20,
  },
  content: {
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    minHeight: 32,
    gap: 8,
  },
  closeButton: {
    width: MOBILE_LAYOUT.iconButton,
    height: MOBILE_LAYOUT.iconButton,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonInner: {
    width: MOBILE_LAYOUT.iconButton,
    height: MOBILE_LAYOUT.iconButton,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    gap: 12,
  },
  footer: {
    paddingTop: 4,
  },
  footerCompact: {
    paddingTop: 0,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionColumn: {
    flexDirection: "column",
    gap: 10,
  },
});
