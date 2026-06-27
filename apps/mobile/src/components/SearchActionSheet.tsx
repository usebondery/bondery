import { IconSearch } from "@tabler/icons-react-native";
import { Sheet } from "@tamagui/sheet";
import { useEffect, useRef, type ReactNode } from "react";
import { StyleSheet, View, type TextInput } from "react-native";
import { SHEET_SNAP_POINTS, UI_TIMING_MS } from "../lib/config";
import { MOBILE_LAYOUT } from "../theme/tokens";
import { useMobileThemeColors } from "../theme/useMobileThemeColors";
import { MobileTextInput } from "./MobileTextInput";

export interface SearchActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  onQueryChange: (query: string) => void;
  searchPlaceholder: string;
  /** Rendered to the right of the search field (e.g. random emoji, filter action). */
  searchRightAction?: ReactNode;
  searchEditable?: boolean;
  /** Title / subtitle block above the search row. */
  header?: ReactNode;
  /** Sticky footer below scrollable content (e.g. Cancel / Save). */
  footer?: ReactNode;
  children: ReactNode;
  /** When false, blocks overlay dismiss and bottom snap while open. */
  dismissible?: boolean;
  /** Uses `surfaceElevated` instead of `surface` for the sheet frame. */
  elevated?: boolean;
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
      native
      modal
      open={open}
      onOpenChange={handleOpenChange}
      snapPoints={[SHEET_SNAP_POINTS.selectSearch]}
      snapPointsMode="percent"
      moveOnKeyboardChange
      dismissOnSnapToBottom={dismissible}
      dismissOnOverlayPress={dismissible}
      disableDrag={!dismissible}
    >
      <Sheet.Overlay backgroundColor={colors.overlay} />
      <Sheet.Frame
        backgroundColor={frameBackgroundColor}
        borderTopLeftRadius={MOBILE_LAYOUT.borderRadius.control * 2}
        borderTopRightRadius={MOBILE_LAYOUT.borderRadius.control * 2}
        paddingTop={10}
        paddingBottom={16}
        flex={1}
      >
        <Sheet.Handle backgroundColor={colors.borderStrong} marginBottom={10} />

        {header ? <View style={styles.header}>{header}</View> : null}

        <View style={styles.searchRow}>
          <View style={styles.searchInputSlot}>
            <MobileTextInput
              ref={searchInputRef}
              value={query}
              onChangeText={onQueryChange}
              placeholder={searchPlaceholder}
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
              returnKeyType="search"
              size="compact"
              unfocusedBorderColor={colors.borderStrong}
              backgroundColor={colors.inputBackground}
              leadingIcon={<IconSearch size={16} color={colors.iconSecondary} />}
              editable={searchEditable}
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
  header: {
    paddingHorizontal: MOBILE_LAYOUT.spacing.horizontal,
    paddingBottom: 8,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: MOBILE_LAYOUT.spacing.contentTop / 2,
    paddingHorizontal: MOBILE_LAYOUT.spacing.horizontal,
    paddingBottom: 10,
  },
  searchInputSlot: {
    flex: 1,
    minWidth: 0,
  },
  searchRightAction: {
    flexShrink: 0,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
  footer: {
    paddingHorizontal: MOBILE_LAYOUT.spacing.horizontal,
    paddingTop: 10,
  },
});
