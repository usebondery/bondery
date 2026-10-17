import { IconCopy } from "@tabler/icons-react-native";
import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import type { ColorFormatsObject } from "reanimated-color-picker";
import ColorPicker, { Panel3 } from "reanimated-color-picker";
import { copyToClipboard } from "../../lib/clipboard/copyToClipboard";
import {
  useCommonTranslations,
  useContactInfoTranslations,
  useMobileColorPickerTranslations,
  useMobileGroupsTranslations,
} from "../../lib/i18n/generated/hooks";
import { MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { ActionButtonShellPressable } from "../ui/ActionButtonShellPressable";
import { BottomSheetScrollView, Sheet } from "../ui/Sheet";
import { TextInput } from "../ui/TextInput";
import { ColorSwatchGrid } from "./ColorSwatchGrid";
import { getContrastBorderColor, normalizeHex } from "./colorUtils";
import { COLOR_PICKER_LAYOUT, DEFAULT_GROUP_COLOR } from "./constants";

interface ColorPickerSheetProps {
  onOpenChange: (open: boolean) => void;
  onSelect: (hex: string) => void;
  open: boolean;
  value: string;
}

export function ColorPickerSheet({ open, value, onOpenChange, onSelect }: ColorPickerSheetProps) {
  const tContactInfo = useContactInfoTranslations();
  const tMobileColorPicker = useMobileColorPickerTranslations();
  const tMobileGroups = useMobileGroupsTranslations();
  const t = useCommonTranslations();
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
    startTransition(() => {
      setDraftColor(normalized);
      setHexInput(normalized);
      setHexError(null);
    });
  }, [open, value]);

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
      setHexError(tMobileColorPicker("InvalidHex"));
      return;
    }

    setHexError(null);
    setDraftColor(normalized);
    setHexInput(normalized);
    onSelect(normalized);
  }, [hexInput, onSelect, tMobileColorPicker]);

  const handleCopyHex = useCallback(async () => {
    const normalized = normalizeHex(draftColor);

    if (!normalized) {
      return;
    }

    await copyToClipboard(normalized, {
      errorDescription: tMobileColorPicker("CopyFailedMessage"),
      errorHeadline: t("feedback.errorTitle"),
      successDescription: tMobileColorPicker("ColorCopiedMessage"),
      successHeadline: tContactInfo("CopySuccessTitle"),
    });
  }, [draftColor, t, tMobileColorPicker, tContactInfo]);

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
      onClose={handleClose}
      opened={open}
      snapPoint="selectSearch"
      title={tMobileColorPicker("SheetTitle")}
    >
      <BottomSheetScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hexRow}>
          <View style={styles.hexInputSlot}>
            <TextInput
              accessibilityLabel={`${tMobileGroups("EditColorLabel")} ${draftColor}`}
              autoCapitalize="characters"
              autoCorrect={false}
              enterKeyHint="done"
              error={hexError != null}
              leftSection={colorPreview}
              onBlur={commitHexInput}
              onChangeText={(text) => {
                setHexInput(text);
                if (hexError) {
                  setHexError(null);
                }
              }}
              onSubmitEditing={commitHexInput}
              placeholder={tMobileColorPicker("HexPlaceholder")}
              returnKeyType="done"
              value={hexInput}
              variant="sheet"
            />
          </View>

          <ActionButtonShellPressable
            accessibilityLabel={tMobileColorPicker("CopyAccessibilityLabel")}
            matchInputChrome
            onPress={() => void handleCopyHex()}
            size="md"
            variant="outline"
          >
            <IconCopy color={colors.iconSecondary} size={18} />
          </ActionButtonShellPressable>
        </View>

        {hexError ? (
          <Text style={[styles.hexError, { color: colors.dangerText }]}>{hexError}</Text>
        ) : null}

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          {tMobileColorPicker("SwatchesLabel")}
        </Text>

        <ColorSwatchGrid onSelect={handleSwatchSelect} value={draftColor} />

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          {tMobileColorPicker("CustomColorLabel")}
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
      </BottomSheetScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  hexError: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
    marginTop: -4,
  },
  hexInputSlot: {
    flex: 1,
    minWidth: 0,
  },
  hexRow: {
    alignItems: "center",
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
});
