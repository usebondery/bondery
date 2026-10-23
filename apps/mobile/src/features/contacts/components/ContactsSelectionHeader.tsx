import Animated from "react-native-reanimated";
import { Pressable } from "@/components/ui/Pressable";
import { useCommonTranslations, useMobileContactsTranslations } from "@/lib/i18n/generated/hooks";
import { ToolbarHeader } from "../../../components/chrome";
import { Text } from "../../../components/ui/Text";
import { usePressSqueeze } from "../../../components/ui/usePressSqueeze";
import { useContactsEffectiveSelectedCount, useContactsSelection } from "../contactsSelectionStore";

export function ContactsSelectionHeader() {
  const tMobileContacts = useMobileContactsTranslations();
  const t = useCommonTranslations();
  const totalCount = useContactsSelection((state) => state.totalCount);
  const isAllTotalSelected = useContactsSelection((state) => state.isAllTotalSelected);
  const selectAllTotal = useContactsSelection((state) => state.selectAllTotal);
  const deselectAllInSession = useContactsSelection((state) => state.deselectAllInSession);
  const exitSelectionMode = useContactsSelection((state) => state.exitSelectionMode);
  const selectedCount = useContactsEffectiveSelectedCount();
  const showSelectAll = !isAllTotalSelected;
  const selectAllLabel = tMobileContacts("SelectAllCount", { count: totalCount });
  const deselectAllLabel = tMobileContacts("DeselectAll");
  const leftLabel = showSelectAll ? selectAllLabel : deselectAllLabel;
  const selectedCountLabel = tMobileContacts("SelectedCount", { count: selectedCount });

  const handleLeftAction = () => {
    if (showSelectAll) {
      selectAllTotal();
      return;
    }

    deselectAllInSession();
  };

  return (
    <ToolbarHeader
      center={
        <Text fw={600} numberOfLines={1} size="sm" ta="center">
          {selectedCountLabel}
        </Text>
      }
      left={
        <SelectionHeaderTextAction
          accessibilityLabel={leftLabel}
          disabled={totalCount === 0}
          label={leftLabel}
          onPress={handleLeftAction}
        />
      }
      right={
        <SelectionHeaderTextAction
          accessibilityLabel={t("actions.cancel")}
          label={t("actions.cancel")}
          onPress={exitSelectionMode}
        />
      }
    />
  );
}

function SelectionHeaderTextAction({
  accessibilityLabel,
  disabled = false,
  label,
  onPress,
}: {
  accessibilityLabel: string;
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  const { pressIn, pressOut, squeezeStyle } = usePressSqueeze("subtle");

  return (
    <Animated.View style={squeezeStyle}>
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        hitSlop={8}
        onPress={onPress}
        onPressIn={() => {
          if (disabled) {
            return;
          }
          pressIn();
        }}
        onPressOut={pressOut}
      >
        <Text
          c="brand"
          className={disabled ? "opacity-45" : undefined}
          fw={600}
          numberOfLines={1}
          size="md"
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
