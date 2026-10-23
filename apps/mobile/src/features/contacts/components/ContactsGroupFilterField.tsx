import type { GroupWithCount } from "@bondery/schemas";
import { IconPlus } from "@tabler/icons-react-native";
import { Select, SelectOptionRow } from "@/components/ui/Select";
import type { SheetAction } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { useCommonTranslations, useMobileContactsTranslations } from "@/lib/i18n/generated/hooks";
import { mapGroupToSelectItem } from "@/lib/select/mapGroupToSelectItem";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";

interface ContactsGroupFilterFieldProps {
  groups: GroupWithCount[];
  isDisabled?: boolean;
  onCreateGroupPress?: () => void;
  onOpenChange?: (open: boolean) => void;
  selectedGroupId: string | null;
  selectGroup: (groupId: string | null) => void;
  showCreateGroupAction?: boolean;
  showField?: boolean;
}

export function ContactsGroupFilterField({
  groups,
  isDisabled = false,
  onCreateGroupPress,
  onOpenChange,
  selectedGroupId,
  selectGroup,
  showCreateGroupAction = true,
  showField = true,
}: ContactsGroupFilterFieldProps) {
  const tMobileContacts = useMobileContactsTranslations();
  const t = useCommonTranslations();
  const colors = useMobileThemeColors();

  const groupOptions = groups.map((group) => mapGroupToSelectItem(group, colors.borderStrong));

  const allContactsHeader = ({ close }: { close: () => void }) => (
    <SelectOptionRow
      isSelected={selectedGroupId === null}
      onPress={() => {
        selectGroup(null);
        close();
      }}
      option={{ label: tMobileContacts("FilterAllContacts"), value: "__all__" }}
    />
  );

  const sheetActions: [SheetAction] | undefined =
    showCreateGroupAction && onCreateGroupPress
      ? [
          {
            icon: <IconPlus color={colors.textOnPrimary} size={18} />,
            label: tMobileContacts("GroupFilterNewGroup"),
            onPress: () => {
              onCreateGroupPress();
            },
            tone: "primary",
            variant: "filled",
          },
        ]
      : undefined;

  const emptyState = (
    <>
      <Text c="secondary" className="px-6 py-8 text-center" fw={600}>
        {tMobileContacts("NoGroupsYet")}
      </Text>
      <Text c="secondary" className="px-6 pb-8 text-center" size="sm">
        {tMobileContacts("NoGroupsYetHint")}
      </Text>
    </>
  );

  return (
    <Select
      accessibilityHint={tMobileContacts("GroupFilterAccessibilityHint")}
      accessibilityLabel={tMobileContacts("GroupFilterAccessibilityLabel")}
      clearAccessibilityLabel={tMobileContacts("GroupFilterClearAccessibilityLabel")}
      clearable
      data={groupOptions}
      disabled={isDisabled}
      emptySearchLabel={t("feedback.noResults")}
      label={tMobileContacts("GroupFilterSheetTitle")}
      onChange={selectGroup}
      onOpenChange={onOpenChange}
      placeholder={tMobileContacts("FilterAllContacts")}
      searchable="auto"
      searchPlaceholder={tMobileContacts("AddToGroupsSearchPlaceholder")}
      sheetActions={sheetActions}
      sheetEmptyState={groups.length === 0 ? emptyState : undefined}
      sheetListHeader={allContactsHeader}
      showField={showField}
      triggerVariant="filter"
      value={selectedGroupId}
    />
  );
}
