import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useWatch } from "react-hook-form";
import {
  IconBell,
  IconCalendarPlus,
  IconCheck,
  IconChevronDown,
  IconTrash,
} from "@tabler/icons-react-native";
import { IMPORTANT_DATE_TYPE_META } from "@bondery/helpers";
import type { ImportantDate, ImportantDateType } from "@bondery/schemas";
import {
  importantDateSheetSchema,
  type ImportantDateSheetInput,
} from "@bondery/schemas";
import { ActionSheetPopup, type ActionSheetPopupAction } from "../../../components/ActionSheetPopup";
import { SheetSelectField, SheetTextField } from "../../../components/form";
import { INPUT_MAX_LENGTHS } from "../../../lib/config";
import { useSheetForm } from "../../../lib/forms/useSheetForm";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import {
  createTodayImportantDateIso,
  defaultWithoutYearForType,
  formatImportantDate,
  resolveDateLocale,
} from "../importantDateUtils";
import { ImportantDateWheelPickerSheet } from "./ImportantDateWheelPickerSheet";

type SheetMode = "add" | "edit";

interface EditImportantDateSheetProps {
  open: boolean;
  mode: SheetMode;
  initialEntry: ImportantDate | null;
  existingDates: ImportantDate[];
  contactFirstName: string;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
  onSave: (entry: ImportantDate) => void;
  onDelete?: () => void;
}

const IMPORTANT_DATE_TYPES: ImportantDateType[] = [
  "birthday",
  "anniversary",
  "nameday",
  "graduation",
  "other",
];

function createDraftDate(): ImportantDate {
  return {
    id: "",
    userId: "",
    personId: "",
    type: "other",
    date: "",
    note: null,
    notifyOn: null,
    notifyDaysBefore: null,
    createdAt: "",
    updatedAt: "",
  };
}

function resolveInitialDateIso(entry: ImportantDate, mode: SheetMode): string {
  if (entry.date) {
    return entry.date;
  }

  if (mode === "add") {
    return createTodayImportantDateIso(defaultWithoutYearForType(entry.type));
  }

  return createTodayImportantDateIso();
}

function NotifyBellIcon({ muted, color }: { muted: boolean; color: string }) {
  if (!muted) {
    return <IconBell size={16} stroke={color} />;
  }

  return (
    <View style={styles.mutedBellWrap}>
      <IconBell size={16} stroke={color} />
      <View style={[styles.mutedBellSlash, { backgroundColor: color }]} />
    </View>
  );
}

export function EditImportantDateSheet({
  open,
  mode,
  initialEntry,
  existingDates,
  contactFirstName,
  isSubmitting,
  onOpenChange,
  onCancel,
  onSave,
  onDelete,
}: EditImportantDateSheetProps) {
  const t = useMobileTranslations();
  const { i18n } = useTranslation();
  const colors = useMobileThemeColors();
  const dateLocale = resolveDateLocale(i18n.language);
  const {
    control,
    handleSubmit,
    setValue,
    formState: { isValid },
  } = useSheetForm({
    open,
    schema: importantDateSheetSchema,
    getDefaultValues: (): ImportantDateSheetInput => {
      const entry = initialEntry ?? createDraftDate();
      return {
        type: entry.type ?? "other",
        date: resolveInitialDateIso(entry, mode),
        note: entry.note ?? "",
        notifyDaysBefore: entry.notifyDaysBefore
          ? (String(entry.notifyDaysBefore) as ImportantDateSheetInput["notifyDaysBefore"])
          : "none",
      };
    },
    mode: "onChange",
  });
  const [isWheelOpen, setWheelOpen] = useState(false);
  const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setWheelOpen(false);
      setDeleteConfirmOpen(false);
    }
  }, [open]);

  const type = useWatch({ control, name: "type" });
  const dateIso = useWatch({ control, name: "date" });

  const usedTypes = useMemo(() => {
    const set = new Set<ImportantDateType>();
    for (const item of existingDates) {
      if (mode === "edit" && item.id === initialEntry?.id) {
        continue;
      }
      if (item.type === "birthday" || item.type === "nameday") {
        set.add(item.type);
      }
    }
    return set;
  }, [existingDates, initialEntry?.id, mode]);

  const typeOptions = useMemo(
    () =>
      IMPORTANT_DATE_TYPES.filter((value) => {
        if (value === "birthday" && usedTypes.has("birthday")) {
          return false;
        }
        if (value === "nameday" && usedTypes.has("nameday")) {
          return false;
        }
        return true;
      }).map((value) => {
        const meta = IMPORTANT_DATE_TYPE_META[value];
        return {
          value,
          label: `${meta.emoji} ${t(`ContactImportantDates.Types.${value}`)}`,
        };
      }),
    [t, usedTypes],
  );

  const notifyOptions = useMemo(
    () =>
      (["none", "1", "3", "7"] as const).map((value) => ({
        value,
        label:
          value === "none"
            ? t("ContactImportantDates.NotifyNone")
            : value === "1"
              ? t("ContactImportantDates.NotifyDayBefore", { count: 1 })
              : t("ContactImportantDates.NotifyDaysBefore", { count: Number(value) }),
        leftSection: <NotifyBellIcon muted={value === "none"} color={colors.iconSecondary} />,
      })),
    [colors.iconSecondary, t],
  );

  const canSubmit = isValid && !isSubmitting;
  const dateLabel = formatImportantDate(dateIso, dateLocale);

  const onSubmit = handleSubmit((values) => {
    if (!values.date) {
      return;
    }

    onSave({
      ...(initialEntry ?? createDraftDate()),
      type: values.type,
      date: values.date,
      note: values.note,
      notifyDaysBefore: values.notifyDaysBefore,
    });
  });

  const primaryAction: ActionSheetPopupAction = {
    label: mode === "add" ? t("ContactImportantDates.AddAction") : t("MobileApp.ContactIdentity.SaveChanges"),
    icon: mode === "add" ? <IconCalendarPlus size={16} stroke={colors.textOnPrimary} /> : <IconCheck size={16} stroke={colors.textOnPrimary} />,
    onPress: () => void onSubmit(),
    disabled: !canSubmit,
    loading: isSubmitting,
    tone: "primary",
    variant: "filled",
  };

  const actions: [ActionSheetPopupAction] | [ActionSheetPopupAction, ActionSheetPopupAction] =
    mode === "edit" && onDelete && !isDeleteConfirmOpen
      ? [
          {
            label: t("ContactImportantDates.DeleteAction"),
            icon: <IconTrash size={16} stroke={colors.dangerAccent} />,
            onPress: () => setDeleteConfirmOpen(true),
            disabled: isSubmitting,
            tone: "danger",
            variant: "outline",
          },
          primaryAction,
        ]
      : [primaryAction];

  const sheetTitle = isDeleteConfirmOpen
    ? t("MobileApp.ContactIdentity.DeleteDateConfirmTitle").replace(
        "{type}",
        t(`ContactImportantDates.Types.${type}`),
      )
    : mode === "add"
      ? t("ContactImportantDates.AddAction")
      : t(`ContactImportantDates.Types.${type}`);

  return (
    <>
      <ActionSheetPopup
        open={open && !isWheelOpen}
        title={sheetTitle}
        actions={
          isDeleteConfirmOpen
            ? [
                {
                  label: t("MobileApp.Common.Cancel"),
                  onPress: () => setDeleteConfirmOpen(false),
                  disabled: isSubmitting,
                  tone: "neutral",
                  variant: "outline",
                },
                {
                  label: t("MobileApp.Common.Delete"),
                  icon: <IconTrash size={16} stroke={colors.textOnPrimary} />,
                  onPress: () => onDelete?.(),
                  loading: isSubmitting,
                  disabled: isSubmitting,
                  tone: "danger",
                  variant: "filled",
                },
              ]
            : actions
        }
        onOpenChange={onOpenChange}
        onClose={onCancel}
        isBusy={isSubmitting}
      >
        {isDeleteConfirmOpen ? (
          <Text style={[styles.confirmBody, { color: colors.textSecondary }]}>
            {t("MobileApp.ContactIdentity.DeleteDateConfirmBody").replace(
              "{name}",
              contactFirstName,
            )}
          </Text>
        ) : (
          <>
            <SheetSelectField
              control={control}
              name="type"
              label={t("ContactImportantDates.TypePlaceholder")}
              options={typeOptions}
            />

            <Pressable
              style={[
                styles.dateTrigger,
                { borderColor: colors.borderStrong, backgroundColor: colors.inputBackground },
              ]}
              onPress={() => setWheelOpen(true)}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel={dateLabel}
            >
              <Text style={[styles.dateTriggerLabel, { color: colors.textPrimary }]} numberOfLines={1}>
                {dateLabel}
              </Text>
              <IconChevronDown size={18} stroke={colors.iconSecondary} />
            </Pressable>

            <SheetTextField
              control={control}
              name="note"
              accessibilityLabel={t("ContactImportantDates.NotePlaceholder")}
              placeholder={t("ContactImportantDates.NotePlaceholder")}
              maxLength={INPUT_MAX_LENGTHS.dateName}
              editable={!isSubmitting}
            />

            <SheetSelectField
              control={control}
              name="notifyDaysBefore"
              label={t("MobileApp.ContactIdentity.RemindMeLabel")}
              options={notifyOptions}
            />
          </>
        )}
      </ActionSheetPopup>

      <ImportantDateWheelPickerSheet
        open={isWheelOpen}
        initialIso={dateIso}
        defaultWithoutYear={defaultWithoutYearForType(type)}
        onOpenChange={setWheelOpen}
        onCancel={() => setWheelOpen(false)}
        onConfirm={(iso) =>
          setValue("date", iso, { shouldDirty: true, shouldValidate: true })
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  dateTrigger: {
    minHeight: MOBILE_LAYOUT.touchTarget,
    borderRadius: MOBILE_LAYOUT.borderRadius.control,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  dateTriggerLabel: {
    flex: 1,
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.medium,
  },
  confirmBody: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    lineHeight: 22,
  },
  mutedBellWrap: {
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  mutedBellSlash: {
    position: "absolute",
    width: 18,
    height: 1.5,
    borderRadius: 1,
    transform: [{ rotate: "-45deg" }],
  },
});
