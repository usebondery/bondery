import { IMPORTANT_DATE_TYPE_META } from "@bondery/helpers";
import type { ImportantDate, ImportantDateType } from "@bondery/schemas";
import {
  type ImportantDateSheetInput,
  type ImportantDateSheetOutput,
  importantDateSheetSchema,
} from "@bondery/schemas";
import {
  IconBell,
  IconCalendarPlus,
  IconCheck,
  IconChevronDown,
  IconTrash,
} from "@tabler/icons-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { Pressable } from "@/components/ui/Pressable";
import {
  useCommonTranslations,
  useContactImportantDatesTranslations,
  useMobileContactIdentityTranslations,
} from "@/lib/i18n/generated/hooks";
import { SheetSelectField, SheetTextField } from "../../../components/form";
import { Sheet, type SheetAction } from "../../../components/ui/Sheet";
import { INPUT_MAX_LENGTHS } from "../../../lib/config";
import { useSheetForm } from "../../../lib/forms/useSheetForm";
import { useSheetLocalAction } from "../../../lib/forms/useSheetLocalAction";
import { useSheetLocalSubmit } from "../../../lib/forms/useSheetLocalSubmit";
import { syncEffectState } from "../../../lib/react/syncEffectState";
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
  contactFirstName: string;
  existingDates: ImportantDate[];
  initialEntry: ImportantDate | null;
  mode: SheetMode;
  onCancel: () => void;
  onDelete?: () => void;
  onError?: (error: unknown) => void;
  onOpenChange: (open: boolean) => void;
  onPersist: (entry: ImportantDate) => void;
  open: boolean;
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
    createdAt: "",
    date: "",
    id: "",
    note: null,
    notifyDaysBefore: null,
    notifyOn: null,
    personId: "",
    type: "other",
    updatedAt: "",
    userId: "",
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
  onOpenChange,
  onCancel,
  onPersist,
  onDelete,
  onError,
}: EditImportantDateSheetProps) {
  const tContactImportantDates = useContactImportantDatesTranslations();
  const tMobileContactIdentity = useMobileContactIdentityTranslations();
  const t = useCommonTranslations();
  const { i18n } = useTranslation();
  const colors = useMobileThemeColors();
  const dateLocale = resolveDateLocale(i18n.language);
  const {
    control,
    handleSubmit,
    setValue,
    formState: { isValid },
  } = useSheetForm({
    getDefaultValues: () => {
      const entry = initialEntry ?? createDraftDate();
      return {
        date: resolveInitialDateIso(entry, mode),
        note: entry.note ?? "",
        notifyDaysBefore: entry.notifyDaysBefore
          ? (String(entry.notifyDaysBefore) as ImportantDateSheetInput["notifyDaysBefore"])
          : "none",
        type: entry.type ?? "other",
      };
    },
    mode: "onChange",
    open,
    schema: importantDateSheetSchema,
  });
  const [isWheelOpen, setWheelOpen] = useState(false);
  const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      syncEffectState(() => {
        setWheelOpen(false);
        setDeleteConfirmOpen(false);
      });
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
          label: `${meta.emoji} ${tContactImportantDates(`Types.${value}` as never)}`,
          value,
        };
      }),
    [usedTypes, tContactImportantDates],
  );

  const notifyOptions = useMemo(
    () =>
      (["none", "1", "3", "7"] as const).map((value) => ({
        label:
          value === "none"
            ? tContactImportantDates("NotifyNone")
            : value === "1"
              ? tContactImportantDates("NotifyDayBefore")
              : tContactImportantDates("NotifyDaysBefore"),
        leftSection: <NotifyBellIcon color={colors.iconSecondary} muted={value === "none"} />,
        value,
      })),
    [colors.iconSecondary, tContactImportantDates],
  );

  const handleCloseSheet = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const performSave = useCallback(
    (values: ImportantDateSheetOutput) => {
      if (!values.date) {
        throw new Error("Date required");
      }

      const entry: ImportantDate = {
        ...(initialEntry ?? createDraftDate()),
        date: values.date,
        note: values.note,
        notifyDaysBefore: values.notifyDaysBefore,
        type: values.type,
      };
      onPersist(entry);
      return entry;
    },
    [initialEntry, onPersist],
  );

  const { isSubmitting, submit } = useSheetLocalSubmit(handleSubmit, {
    onClose: handleCloseSheet,
    onError,
    perform: performSave,
  });

  const { isSubmitting: isDeleting, submit: submitDelete } = useSheetLocalAction({
    onClose: handleCloseSheet,
    onError,
    perform: () => {
      if (!onDelete) {
        throw new Error("Delete handler missing");
      }
      onDelete();
    },
  });

  const isBusy = isSubmitting || isDeleting;
  const canSubmit = isValid && !isBusy;
  const dateLabel = formatImportantDate(dateIso, dateLocale);

  const primaryAction: SheetAction = {
    disabled: !canSubmit,
    icon:
      mode === "add" ? (
        <IconCalendarPlus size={16} stroke={colors.textOnPrimary} />
      ) : (
        <IconCheck size={16} stroke={colors.textOnPrimary} />
      ),
    label:
      mode === "add" ? tContactImportantDates("AddAction") : tMobileContactIdentity("SaveChanges"),
    loading: isSubmitting,
    loadingText: t("feedback.saving"),
    onPress: submit,
    tone: "primary",
    variant: "filled",
  };

  const actions: [SheetAction] | [SheetAction, SheetAction] =
    mode === "edit" && onDelete && !isDeleteConfirmOpen
      ? [
          {
            disabled: isBusy,
            icon: <IconTrash size={16} stroke={colors.textOnPrimary} />,
            label: tContactImportantDates("DeleteAction"),
            onPress: () => setDeleteConfirmOpen(true),
            tone: "danger",
            variant: "filled",
          },
          primaryAction,
        ]
      : [primaryAction];

  const sheetTitle = isDeleteConfirmOpen
    ? tMobileContactIdentity("DeleteDateConfirmTitle").replace(
        "{type}",
        tContactImportantDates(`Types.${type}` as never),
      )
    : mode === "add"
      ? tContactImportantDates("AddAction")
      : tContactImportantDates(`Types.${type}` as never);

  return (
    <>
      <Sheet
        actions={
          isDeleteConfirmOpen
            ? [
                {
                  disabled: isBusy,
                  label: t("actions.cancel"),
                  onPress: () => setDeleteConfirmOpen(false),
                  tone: "neutral",
                  variant: "outline",
                },
                {
                  disabled: isBusy,
                  icon: <IconTrash size={16} stroke={colors.textOnPrimary} />,
                  label: t("actions.delete"),
                  loading: isDeleting,
                  loadingText: t("feedback.deleting"),
                  onPress: submitDelete,
                  tone: "danger",
                  variant: "filled",
                },
              ]
            : actions
        }
        isBusy={isBusy}
        onClose={onCancel}
        onOpenChange={onOpenChange}
        opened={open && !isWheelOpen}
        title={sheetTitle}
      >
        {isDeleteConfirmOpen ? (
          <Text style={[styles.confirmBody, { color: colors.textSecondary }]}>
            {tMobileContactIdentity("DeleteDateConfirmBody").replace("{name}", contactFirstName)}
          </Text>
        ) : (
          <>
            <SheetSelectField
              control={control as never}
              label={tContactImportantDates("TypePlaceholder")}
              name="type"
              options={typeOptions}
            />

            <Pressable
              accessibilityLabel={dateLabel}
              accessibilityRole="button"
              disabled={isBusy}
              onPress={() => setWheelOpen(true)}
              style={[
                styles.dateTrigger,
                { backgroundColor: colors.inputBackground, borderColor: colors.borderStrong },
              ]}
            >
              <Text
                numberOfLines={1}
                style={[styles.dateTriggerLabel, { color: colors.textPrimary }]}
              >
                {dateLabel}
              </Text>
              <IconChevronDown size={18} stroke={colors.iconSecondary} />
            </Pressable>

            <SheetTextField
              accessibilityLabel={tContactImportantDates("NotePlaceholder")}
              control={control as never}
              editable={!isBusy}
              maxLength={INPUT_MAX_LENGTHS.dateName}
              name="note"
              placeholder={tContactImportantDates("NotePlaceholder")}
            />

            <SheetSelectField
              control={control as never}
              label={tMobileContactIdentity("RemindMeLabel")}
              name="notifyDaysBefore"
              options={notifyOptions}
            />
          </>
        )}
      </Sheet>

      <ImportantDateWheelPickerSheet
        defaultWithoutYear={defaultWithoutYearForType(type)}
        initialIso={dateIso}
        onCancel={() => setWheelOpen(false)}
        onConfirm={(iso) => setValue("date", iso, { shouldDirty: true, shouldValidate: true })}
        onOpenChange={setWheelOpen}
        opened={isWheelOpen}
      />
    </>
  );
}

const styles = StyleSheet.create({
  confirmBody: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    lineHeight: 22,
  },
  dateTrigger: {
    alignItems: "center",
    borderRadius: MOBILE_LAYOUT.borderRadius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
    minHeight: MOBILE_LAYOUT.touchTarget,
    paddingHorizontal: 12,
  },
  dateTriggerLabel: {
    flex: 1,
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.medium,
  },
  mutedBellSlash: {
    borderRadius: 1,
    height: 1.5,
    position: "absolute",
    transform: [{ rotate: "-45deg" }],
    width: 18,
  },
  mutedBellWrap: {
    alignItems: "center",
    height: 16,
    justifyContent: "center",
    width: 16,
  },
});
