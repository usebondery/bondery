import { IconCopy, IconX } from "@tabler/icons-react-native";
import { Sheet } from "@tamagui/sheet";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import type { ColorFormatsObject } from "reanimated-color-picker";
import ColorPicker, { Panel3 } from "reanimated-color-picker";
import { copyToClipboard } from "../../lib/clipboard/copyToClipboard";
import { SHEET_SNAP_POINTS } from "../../lib/config";
import { useMobileTranslations } from "../../lib/i18n/useMobileTranslations";
import type { ShowAppToastInput } from "../../lib/toast/useAppToast";
import { MOBILE_HIT_SLOP, MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { MobileTextInput } from "../MobileTextInput";
import { ColorSwatchGrid } from "./ColorSwatchGrid";
import { getContrastBorderColor, normalizeHex } from "./colorUtils";
import { COLOR_PICKER_LAYOUT, DEFAULT_GROUP_COLOR } from "./constants";

interface ColorPickerSheetProps {
  onOpenChange: (open: boolean) => void;
  onSelect: (hex: string) => void;
  open: boolean;
  showToast: (options: ShowAppToastInput) => void;
  value: string;
}

export function ColorPickerSheet({
  open,
  value,
  onOpenChange,
  onSelect,
  showToast,
}: ColorPickerSheetProps) {
  const t = useMobileTranslations();
  const colors = useMobileThemeColors();
  const { width: windowWidth } = useWindowDimensions();

  const [draftColor, setDraftColor] = useState(DEFAULT_GROUP_COLOR);
  const [hexInput, setHexInput] = useState(DEFAULT_GROUP_COLOR);
  const [hexError, setHexError] = useState<string | null>(null);

  const wheelSize = useMemo(
    () =>
      Math.min(
        COLOR_PICKER_LAYOUT.wheelMaxSize,
        windowWidth - MOBILE_LAYOUT.spacing.horizontal * 2 - 32,
      ),
    [windowWidth],
  );

  const previewBorderColor = getContrastBorderColor(
    draftColor,
    colors.borderStrong,
    colors.borderStrong,
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const normalized = normalizeHex(value) || DEFAULT_GROUP_COLOR;
    setDraftColor(normalized);
    setHexInput(normalized);
    setHexError(null);
  }, [open, value]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      onOpenChange(nextOpen);
    },
    [onOpenChange],
  );

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSwatchSelect = useCallback(
    (hex: string) => {
      const normalized = normalizeHex(hex);
      setDraftColor(normalized);
      setHexInput(normalized);
      setHexError(null);
      onSelect(normalized);
      onOpenChange(false);
    },
    [onOpenChange, onSelect],
  );

  const handleWheelChange = useCallback((color: ColorFormatsObject) => {
    const normalized = normalizeHex(color.hex);

    if (!normalized) {
      return;
    }

    setDraftColor(normalized);
    setHexInput(normalized);
    setHexError(null);
  }, []);

  const handleWheelComplete = useCallback(
    (color: ColorFormatsObject) => {
      const normalized = normalizeHex(color.hex);

      if (!normalized) {
        return;
      }

      onSelect(normalized);
    },
    [onSelect],
  );

  const commitHexInput = useCallback(() => {
    const normalized = normalizeHex(hexInput);

    if (!normalized) {
      setHexError(t("InvalidHex", { ns: "MobileColorPicker" }));
      return;
    }

    setHexError(null);
    setDraftColor(normalized);
    setHexInput(normalized);
    onSelect(normalized);
  }, [hexInput, onSelect, t]);

  const handleCopyHex = useCallback(async () => {
    const normalized = normalizeHex(draftColor);

    if (!normalized) {
      return;
    }

    await copyToClipboard(normalized, showToast, {
      errorDescription: t("CopyFailedMessage", { ns: "MobileColorPicker" }),
      errorHeadline: t("feedback.errorTitle", { ns: "common" }),
      successDescription: t("ColorCopiedMessage", { ns: "MobileColorPicker" }),
      successHeadline: t("CopySuccessTitle", { ns: "ContactInfo" }),
    });
  }, [draftColor, showToast, t]);

  const colorPreview = (
    <View
      style={[
        styles.inputPreviewSwatch,
        {
          backgroundColor: draftColor,
          borderColor: previewBorderColor,
        },
      ]}
    />
  );

  return (
    <Sheet
      dismissOnOverlayPress
      dismissOnSnapToBottom
      modal
      moveOnKeyboardChange
      native
      onOpenChange={handleOpenChange}
      open={open}
      snapPoints={[SHEET_SNAP_POINTS.selectSearch]}
      snapPointsMode="percent"
    >
      <Sheet.Overlay backgroundColor={colors.overlay} />
      <Sheet.Frame
        backgroundColor={colors.surface}
        borderTopLeftRadius={MOBILE_LAYOUT.borderRadius.control * 2}
        borderTopRightRadius={MOBILE_LAYOUT.borderRadius.control * 2}
        flex={1}
        paddingBottom={20}
        paddingTop={10}
      >
        <Sheet.Handle backgroundColor={colors.borderStrong} marginBottom={10} />

        <View style={styles.sheetContent}>
          <View style={styles.closeRow}>
            <Pressable
              accessibilityLabel="Close"
              accessibilityRole="button"
              hitSlop={MOBILE_HIT_SLOP.icon}
              onPress={handleClose}
              style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.7 }]}
            >
              <IconX size={20} stroke={colors.iconPrimary} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.hexRow}>
              <View style={styles.hexInputSlot}>
                <MobileTextInput
                  accessibilityLabel={`${t("EditColorLabel", { ns: "MobileGroups" })} ${draftColor}`}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  enterKeyHint="done"
                  error={hexError != null}
                  leadingIcon={colorPreview}
                  onBlur={commitHexInput}
                  onChangeText={(text) => {
                    setHexInput(text);
                    if (hexError) {
                      setHexError(null);
                    }
                  }}
                  onSubmitEditing={commitHexInput}
                  placeholder={t("HexPlaceholder", { ns: "MobileColorPicker" })}
                  returnKeyType="done"
                  value={hexInput}
                />
              </View>

              <Pressable
                accessibilityLabel={t("CopyAccessibilityLabel", { ns: "MobileColorPicker" })}
                accessibilityRole="button"
                onPress={() => void handleCopyHex()}
                style={({ pressed }) => [
                  styles.copyButton,
                  {
                    backgroundColor: pressed ? colors.surfacePressed : colors.inputBackground,
                    borderColor: colors.borderStrong,
                  },
                ]}
              >
                <IconCopy color={colors.iconSecondary} size={18} />
              </Pressable>
            </View>

            {hexError ? (
              <Text style={[styles.hexError, { color: colors.dangerText }]}>{hexError}</Text>
            ) : null}

            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              {t("SwatchesLabel", { ns: "MobileColorPicker" })}
            </Text>

            <ColorSwatchGrid onSelect={handleSwatchSelect} value={draftColor} />

            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              {t("CustomColorLabel", { ns: "MobileColorPicker" })}
            </Text>

            <ColorPicker
              onChangeJS={handleWheelChange}
              onCompleteJS={handleWheelComplete}
              value={draftColor}
            >
              <Panel3
                style={{
                  alignSelf: "center",
                  height: wheelSize,
                  width: wheelSize,
                }}
              />
            </ColorPicker>
          </ScrollView>
        </View>
      </Sheet.Frame>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  closeButton: {
    alignItems: "center",
    height: MOBILE_LAYOUT.iconButton,
    justifyContent: "center",
    width: MOBILE_LAYOUT.iconButton,
  },
  closeRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 4,
  },
  copyButton: {
    alignItems: "center",
    borderRadius: MOBILE_LAYOUT.borderRadius.control,
    borderWidth: 1,
    height: MOBILE_LAYOUT.touchTarget,
    justifyContent: "center",
    width: MOBILE_LAYOUT.touchTarget,
  },
  hexError: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
    marginTop: -4,
  },
  hexInputSlot: {
    flex: 1,
    minWidth: 0,
  },
  hexRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
  },
  inputPreviewSwatch: {
    borderRadius: 6,
    borderWidth: 1,
    height: 20,
    width: 20,
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 8,
  },
  sectionLabel: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.medium,
    marginTop: 4,
  },
  sheetContent: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: MOBILE_LAYOUT.spacing.horizontal,
  },
});
