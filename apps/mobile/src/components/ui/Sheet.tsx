import {
  type BottomSheetBackdropProps,
  BottomSheetFlatList,
  BottomSheetFooter,
  type BottomSheetFooterProps,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
  useBottomSheetScrollableCreator,
} from "@gorhom/bottom-sheet";
import { IconSearch, IconX } from "@tabler/icons-react-native";
import type { ComponentRef, ReactNode } from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { ActivityIndicator, BackHandler, Platform, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SHEET_SNAP_POINTS, UI_TIMING_MS } from "../../lib/config";
import { useCommonTranslations } from "../../lib/i18n/generated/hooks";
import type { NativeTextInputRef } from "../../lib/native-host-refs";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { ActionIcon } from "./ActionIcon";
import { Button, type ButtonLoadingProps } from "./Button";
import { Group } from "./Group";
import { Heading } from "./Heading";
import { joinClassNames } from "./joinClassNames";
import { SheetBackdrop } from "./SheetBackdrop";
import { Stack } from "./Stack";
import { Text } from "./Text";
import { TextInput } from "./TextInput";

export { BottomSheetFlatList, BottomSheetScrollView };

export type SheetSnapPoint = keyof typeof SHEET_SNAP_POINTS;

type SheetActionBase = {
  disabled?: boolean;
  icon?: ReactNode;
  label: string;
  onPress: () => void;
  tone?: "primary" | "danger" | "neutral";
  variant?: "filled" | "outline";
};

/** When `loading` is set, `loadingText` is required and shown on the action button. */
export type SheetAction = SheetActionBase & ButtonLoadingProps;

export type SheetSearch = {
  query: string;
  onQueryChange: (query: string) => void;
  placeholder: string;
  editable?: boolean;
  rightAction?: ReactNode;
};

export type SheetProps = {
  opened: boolean;
  onClose: () => void;
  /** Called after Gorhom reports the modal dismissed (animation complete). */
  onDismissed?: () => void;
  /** Called when the sheet finishes dismissing (`false`). */
  onOpenChange?: (opened: boolean) => void;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  isBusy?: boolean;
  snapPoint?: "fit" | SheetSnapPoint;
  actions?: [SheetAction] | [SheetAction, SheetAction];
  search?: SheetSearch;
  className?: string;
  /** Fired when the sheet snap index changes. Use with `useSheetInputAutofocus` for field focus. */
  onSnapIndexChange?: (index: number) => void;
};

const FIT_MAX_HEIGHT_RATIO = 0.9;
const ACTION_ROW_HEIGHT = 44;
const FOOTER_TOP_PADDING = 8;

/** Wraps Gorhom `useBottomSheetScrollableCreator`. Call this hook inside a `Sheet` tree. */
export function useSheetScrollable() {
  return useBottomSheetScrollableCreator({
    enableFooterMarginAdjustment: true,
  });
}

function footerReserve(bottomInset: number): number {
  return ACTION_ROW_HEIGHT + FOOTER_TOP_PADDING + Math.max(bottomInset, 16);
}

function sheetActionButtonLoadingProps(action: SheetAction): {
  loading?: boolean;
  loadingText?: string;
} {
  if (action.loading === undefined) {
    return {};
  }

  const withLoading = action as SheetActionBase & { loading: boolean; loadingText: string };

  return {
    loading: withLoading.loading,
    loadingText: withLoading.loadingText,
  };
}

function SheetActionButtons({ actions }: { actions: NonNullable<SheetProps["actions"]> }) {
  if (actions.length === 1) {
    const action = actions[0];
    return (
      <Button
        color={action.tone ?? "primary"}
        disabled={action.disabled}
        fullWidth
        leftSection={action.icon}
        onPress={action.onPress}
        {...(sheetActionButtonLoadingProps(action) as ButtonLoadingProps)}
        variant={action.variant ?? "outline"}
      >
        {action.label}
      </Button>
    );
  }

  return (
    <Group grow>
      {actions.map((action) => (
        <Button
          color={action.tone ?? "primary"}
          disabled={action.disabled}
          fullWidth
          key={action.label}
          leftSection={action.icon}
          onPress={action.onPress}
          {...(sheetActionButtonLoadingProps(action) as ButtonLoadingProps)}
          variant={action.variant ?? "outline"}
        >
          {action.label}
        </Button>
      ))}
    </Group>
  );
}

/**
 * App sheet chrome over Gorhom `BottomSheetModal`.
 * Feature files import this module. They do not import `@gorhom/bottom-sheet`.
 */
export function Sheet({
  opened,
  onClose,
  onDismissed,
  onOpenChange,
  title,
  subtitle,
  children,
  isBusy = false,
  snapPoint = "fit",
  actions,
  search,
  className,
  onSnapIndexChange,
}: SheetProps) {
  const t = useCommonTranslations();
  const colors = useMobileThemeColors();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const sheetRef = useRef<ComponentRef<typeof BottomSheetModal>>(null);
  const searchInputRef = useRef<NativeTextInputRef>(null);
  const isFit = snapPoint === "fit";
  const isActionLoading = Boolean(actions?.some((action) => action.loading));
  const isLocked = isBusy || isActionLoading;
  const isLockedRef = useRef(isLocked);
  const openedRef = useRef(opened);
  /** Gorhom `dismiss()` before the first `present()` leaves status `DISMISSING` and blocks the portal. */
  const hasPresentedRef = useRef(false);
  /** Parent set `opened` false — do not re-present while busy (e.g. submit + navigate). */
  const dismissByParentRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const onDismissedRef = useRef(onDismissed);
  const onOpenChangeRef = useRef(onOpenChange);
  const searchRef = useRef(search);
  const onSnapIndexChangeRef = useRef(onSnapIndexChange);
  const searchFocusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  isLockedRef.current = isLocked;
  openedRef.current = opened;
  onCloseRef.current = onClose;
  onDismissedRef.current = onDismissed;
  onOpenChangeRef.current = onOpenChange;
  searchRef.current = search;
  onSnapIndexChangeRef.current = onSnapIndexChange;
  const namedSnapPoints = useMemo(
    () => (isFit ? undefined : [`${SHEET_SNAP_POINTS[snapPoint]}%`]),
    [isFit, snapPoint],
  );
  const maxDynamicContentSize = Math.round(windowHeight * FIT_MAX_HEIGHT_RATIO);
  const contentPaddingBottom = actions ? footerReserve(insets.bottom) : Math.max(insets.bottom, 16);
  /**
   * Gorhom skips interactive keyboard translation on Android when `adjustResize` is set
   * (expects window resize). Modal portals often do not resize, so pass `adjustPan` here.
   * Use `interactive` (not `extend`) on Android: `extend` only snaps to the highest detent and
   * does not lift fit-sized sheets above the keyboard.
   */
  const androidKeyboardInputMode = Platform.OS === "android" ? "adjustPan" : "adjustResize";
  const keyboardBehavior = "interactive";

  useLayoutEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) {
      return;
    }

    // Keep dismiss handlers aligned with parent intent before Gorhom animations run.
    openedRef.current = opened;

    if (opened) {
      dismissByParentRef.current = false;
      hasPresentedRef.current = true;
      sheet.present();
      return;
    }

    dismissByParentRef.current = true;
    if (hasPresentedRef.current) {
      sheet.dismiss();
    }
  }, [opened]);

  useEffect(() => {
    if (!opened || !isLocked) {
      return;
    }

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => {
      subscription.remove();
    };
  }, [isLocked, opened]);

  useEffect(() => {
    return () => {
      if (searchFocusTimerRef.current) {
        clearTimeout(searchFocusTimerRef.current);
      }
    };
  }, []);

  const handleDismiss = useCallback(() => {
    if (isLockedRef.current && openedRef.current && !dismissByParentRef.current) {
      sheetRef.current?.present();
      return;
    }

    searchRef.current?.onQueryChange("");
    onDismissedRef.current?.();
    onCloseRef.current();
    onOpenChangeRef.current?.(false);
  }, []);

  const handleChange = useCallback((index: number) => {
    if (index === -1 && isLockedRef.current && openedRef.current && !dismissByParentRef.current) {
      sheetRef.current?.present();
      return;
    }

    onSnapIndexChangeRef.current?.(index);

    if (index >= 0 && openedRef.current && searchRef.current) {
      if (searchFocusTimerRef.current) {
        clearTimeout(searchFocusTimerRef.current);
      }

      searchFocusTimerRef.current = setTimeout(() => {
        searchInputRef.current?.focus();
      }, UI_TIMING_MS.sheetFocusDelay);
    }
  }, []);

  const handleClosePress = () => {
    if (isLocked) {
      return;
    }

    onClose();
  };

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <SheetBackdrop
        {...props}
        accessibilityLabel={t("a11y.close")}
        overlayColor={colors.overlay}
        pressBehavior={isLocked ? "none" : "close"}
      />
    ),
    [colors.overlay, isLocked, t],
  );

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => {
      if (!actions) {
        return null;
      }

      return (
        <BottomSheetFooter {...props} bottomInset={0}>
          <View
            className="px-4 pt-2"
            style={{
              backgroundColor: colors.surfaceElevated,
              paddingBottom: Math.max(insets.bottom, 16),
            }}
          >
            <SheetActionButtons actions={actions} />
          </View>
        </BottomSheetFooter>
      );
    },
    [actions, colors.surfaceElevated, insets.bottom],
  );

  return (
    <BottomSheetModal
      android_keyboardInputMode={androidKeyboardInputMode}
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: colors.surfaceElevated,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
      }}
      bottomInset={insets.bottom}
      enableBlurKeyboardOnGesture
      enableContentPanningGesture={!isLocked}
      enableDynamicSizing={isFit}
      enableHandlePanningGesture={!isLocked}
      enablePanDownToClose={!isLocked}
      footerComponent={actions ? renderFooter : undefined}
      handleIndicatorStyle={{
        backgroundColor: colors.borderStrong,
        height: 4,
        width: 36,
      }}
      keyboardBehavior={keyboardBehavior}
      keyboardBlurBehavior="restore"
      maxDynamicContentSize={isFit ? maxDynamicContentSize : undefined}
      onChange={handleChange}
      onDismiss={handleDismiss}
      ref={sheetRef}
      snapPoints={namedSnapPoints}
      stackBehavior="push"
    >
      <BottomSheetView
        style={
          isFit
            ? { paddingBottom: contentPaddingBottom }
            : { flex: 1, paddingBottom: contentPaddingBottom }
        }
      >
        <View className={joinClassNames("px-4", isFit ? undefined : "min-h-0 flex-1", className)}>
          <Group align="start" className="pb-3" justify="between">
            <Stack className="min-w-0 flex-1" gap="sm">
              <Heading numberOfLines={3} order={3}>
                {title}
              </Heading>
              {subtitle ? (
                <Text c="secondary" size="sm">
                  {subtitle}
                </Text>
              ) : null}
            </Stack>
            {isLocked ? (
              <View className="h-8 w-8 items-center justify-center">
                <ActivityIndicator
                  accessibilityLabel={t("a11y.loading")}
                  color={colors.primary}
                  size="small"
                />
              </View>
            ) : (
              <ActionIcon accessibilityLabel={t("a11y.close")} onPress={handleClosePress} size="sm">
                <IconX size={20} stroke={colors.iconPrimary} />
              </ActionIcon>
            )}
          </Group>

          {search ? (
            <Group className="pb-2.5" gap="sm">
              <View className="min-w-0 flex-1">
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={search.editable}
                  leftSection={<IconSearch color={colors.iconSecondary} size={16} />}
                  onChangeText={search.onQueryChange}
                  placeholder={search.placeholder}
                  ref={searchInputRef}
                  returnKeyType="search"
                  value={search.query}
                  variant="sheet"
                />
              </View>
              {search.rightAction ? (
                <View className="flex-shrink-0">{search.rightAction}</View>
              ) : null}
            </Group>
          ) : null}

          {children ? (
            <View className={isFit ? undefined : "min-h-0 flex-1"}>{children}</View>
          ) : null}
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}
