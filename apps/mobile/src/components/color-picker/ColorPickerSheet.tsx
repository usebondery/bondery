import { IconCopy, IconX } from "@tabler/icons-react-native";
import { Sheet } from "@tamagui/sheet";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import ColorPicker, { Panel3 } from "reanimated-color-picker";
import type { ColorFormatsObject } from "reanimated-color-picker";
import { SHEET_SNAP_POINTS } from "../../lib/config";
import { copyToClipboard } from "../../lib/clipboard/copyToClipboard";
import { useMobileTranslations } from "../../lib/i18n/useMobileTranslations";
import type { ShowAppToastInput } from "../../lib/toast/useAppToast";
import { MOBILE_HIT_SLOP, MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { MobileTextInput } from "../MobileTextInput";
import { ColorSwatchGrid } from "./ColorSwatchGrid";
import { COLOR_PICKER_LAYOUT, DEFAULT_GROUP_COLOR } from "./constants";
import { getContrastBorderColor, normalizeHex } from "./colorUtils";

interface ColorPickerSheetProps {
  open: boolean;
  value: string;
  onOpenChange: (open: boolean) => void;
  onSelect: (hex: string) => void;
  showToast: (options: ShowAppToastInput) => void;
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
      setHexError(t("MobileApp.ColorPicker.InvalidHex"));
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
      successHeadline: t("ContactInfo.CopySuccessTitle"),
      successDescription: t("MobileApp.ColorPicker.ColorCopiedMessage"),
      errorHeadline: t("MobileApp.Common.ErrorTitle"),
      errorDescription: t("MobileApp.ColorPicker.CopyFailedMessage"),
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
      native
      modal
      open={open}
      onOpenChange={handleOpenChange}
      snapPoints={[SHEET_SNAP_POINTS.selectSearch]}
      snapPointsMode="percent"
      moveOnKeyboardChange
      dismissOnSnapToBottom
      dismissOnOverlayPress
    >
      <Sheet.Overlay backgroundColor={colors.overlay} />
      <Sheet.Frame
        backgroundColor={colors.surface}
        borderTopLeftRadius={MOBILE_LAYOUT.borderRadius.control * 2}
        borderTopRightRadius={MOBILE_LAYOUT.borderRadius.control * 2}
        paddingTop={10}
        paddingBottom={20}
        flex={1}
      >
        <Sheet.Handle backgroundColor={colors.borderStrong} marginBottom={10} />

        <View style={styles.sheetContent}>
          <View style={styles.closeRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={MOBILE_HIT_SLOP.icon}
              onPress={handleClose}
              style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.7 }]}
            >
              <IconX size={20} stroke={colors.iconPrimary} />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.hexRow}>
              <View style={styles.hexInputSlot}>
                <MobileTextInput
                  value={hexInput}
                  onChangeText={(text) => {
                    setHexInput(text);
                    if (hexError) {
                      setHexError(null);
                    }
                  }}
                  placeholder={t("MobileApp.ColorPicker.HexPlaceholder")}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="done"
                  enterKeyHint="done"
                  onSubmitEditing={commitHexInput}
                  onBlur={commitHexInput}
                  error={hexError != null}
                  leadingIcon={colorPreview}
                  accessibilityLabel={`${t("MobileApp.Groups.EditColorLabel")} ${draftColor}`}
                />
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("MobileApp.ColorPicker.CopyAccessibilityLabel")}
                onPress={() => void handleCopyHex()}
                style={({ pressed }) => [
                  styles.copyButton,
                  {
                    borderColor: colors.borderStrong,
                    backgroundColor: pressed ? colors.surfacePressed : colors.inputBackground,
                  },
                ]}
              >
                <IconCopy size={18} color={colors.iconSecondary} />
              </Pressable>
            </View>

            {hexError ? (
              <Text style={[styles.hexError, { color: colors.dangerText }]}>{hexError}</Text>
            ) : null}

            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              {t("MobileApp.ColorPicker.SwatchesLabel")}
            </Text>

            <ColorSwatchGrid value={draftColor} onSelect={handleSwatchSelect} />

            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              {t("MobileApp.ColorPicker.CustomColorLabel")}
            </Text>

            <ColorPicker
              value={draftColor}
              onChangeJS={handleWheelChange}
              onCompleteJS={handleWheelComplete}
            >
              <Panel3
                style={{
                  width: wheelSize,
                  height: wheelSize,
                  alignSelf: "center",
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
  sheetContent: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: MOBILE_LAYOUT.spacing.horizontal,
  },
  closeRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 4,
  },
  closeButton: {
    width: MOBILE_LAYOUT.iconButton,
    height: MOBILE_LAYOUT.iconButton,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 8,
  },
  hexRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  hexInputSlot: {
    flex: 1,
    minWidth: 0,
  },
  inputPreviewSwatch: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
  },
  copyButton: {
    width: MOBILE_LAYOUT.touchTarget,
    height: MOBILE_LAYOUT.touchTarget,
    borderRadius: MOBILE_LAYOUT.borderRadius.control,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  hexError: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
    marginTop: -4,
  },
  sectionLabel: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.medium,
    marginTop: 4,
  },
});
