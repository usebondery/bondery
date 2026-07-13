import { IconSearch } from "@tabler/icons-react-native";
import { Sheet } from "@tamagui/sheet";
import { type ReactNode, useEffect, useRef } from "react";
import { StyleSheet, type TextInput, View } from "react-native";
import { SHEET_SNAP_POINTS, UI_TIMING_MS } from "../lib/config";
import { MOBILE_LAYOUT } from "../theme/tokens";
import { useMobileThemeColors } from "../theme/useMobileThemeColors";
import { MobileTextInput } from "./MobileTextInput";

export interface SearchActionSheetProps {
  children: ReactNode;
  /** When false, blocks overlay dismiss and bottom snap while open. */
  dismissible?: boolean;
  /** Uses `surfaceElevated` instead of `surface` for the sheet frame. */
  elevated?: boolean;
  /** Sticky footer below scrollable content (e.g. Cancel / Save). */
  footer?: ReactNode;
  /** Title / subtitle block above the search row. */
  header?: ReactNode;
  onOpenChange: (open: boolean) => void;
  onQueryChange: (query: string) => void;
  open: boolean;
  query: string;
  searchEditable?: boolean;
  searchPlaceholder: string;
  /** Rendered to the right of the search field (e.g. random emoji, filter action). */
  searchRightAction?: ReactNode;
}

/**
 * Standardized 85% search sheet: handle, optional header, search row with optional
 * right action, scrollable body, optional footer.
 */
export function SearchActionSheet({
  open,
  onOpenChange,
  query,
  onQueryChange,
  searchPlaceholder,
  searchRightAction,
  searchEditable = true,
  header,
  footer,
  children,
  dismissible = true,
  elevated = false,
}: SearchActionSheetProps) {
  const colors = useMobileThemeColors();
  const searchInputRef = useRef<TextInput>(null);
  const frameBackgroundColor = elevated ? colors.surfaceElevated : colors.surface;

  useEffect(() => {
    if (!open) {
      return;
    }

    const focusTimer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, UI_TIMING_MS.sheetFocusDelay);

    return () => clearTimeout(focusTimer);
  }, [open]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !dismissible) {
      return;
    }

    onOpenChange(nextOpen);

    if (!nextOpen) {
      onQueryChange("");
    }
  };

  return (
    <Sheet
      disableDrag={!dismissible}
      dismissOnOverlayPress={dismissible}
      dismissOnSnapToBottom={dismissible}
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
        backgroundColor={frameBackgroundColor}
        borderTopLeftRadius={MOBILE_LAYOUT.borderRadius.control * 2}
        borderTopRightRadius={MOBILE_LAYOUT.borderRadius.control * 2}
        flex={1}
        paddingBottom={16}
        paddingTop={10}
      >
        <Sheet.Handle backgroundColor={colors.borderStrong} marginBottom={10} />

        {header ? <View style={styles.header}>{header}</View> : null}

        <View style={styles.searchRow}>
          <View style={styles.searchInputSlot}>
            <MobileTextInput
              autoCapitalize="none"
              autoCorrect={false}
              backgroundColor={colors.inputBackground}
              clearButtonMode="while-editing"
              editable={searchEditable}
              leadingIcon={<IconSearch color={colors.iconSecondary} size={16} />}
              onChangeText={onQueryChange}
              placeholder={searchPlaceholder}
              ref={searchInputRef}
              returnKeyType="search"
              size="compact"
              unfocusedBorderColor={colors.borderStrong}
              value={query}
            />
          </View>

          {searchRightAction ? (
            <View style={styles.searchRightAction}>{searchRightAction}</View>
          ) : null}
        </View>

        <View style={styles.body}>{children}</View>

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </Sheet.Frame>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    minHeight: 0,
  },
  footer: {
    paddingHorizontal: MOBILE_LAYOUT.spacing.horizontal,
    paddingTop: 10,
  },
  header: {
    paddingBottom: 8,
    paddingHorizontal: MOBILE_LAYOUT.spacing.horizontal,
  },
  searchInputSlot: {
    flex: 1,
    minWidth: 0,
  },
  searchRightAction: {
    flexShrink: 0,
  },
  searchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: MOBILE_LAYOUT.spacing.contentTop / 2,
    paddingBottom: 10,
    paddingHorizontal: MOBILE_LAYOUT.spacing.horizontal,
  },
});
