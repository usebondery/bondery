import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { IconBell, IconCalendar, IconCalendarPlus, IconPencil } from "@tabler/icons-react-native";
import { useTranslation } from "react-i18next";
import { IMPORTANT_DATE_TYPE_META } from "@bondery/helpers";
import type { ImportantDate } from "@bondery/schemas";
import { OverflowMenu } from "../../../components/OverflowMenu";
import { LIMITS } from "../../../lib/config";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { useAppToast } from "../../../lib/toast/useAppToast";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { formatImportantDate, resolveDateLocale } from "../importantDateUtils";
import { ContactDetailSectionHeader } from "./ContactDetailSectionHeader";
import { EditImportantDateSheet } from "./EditImportantDateSheet";
import { contactDetailStyles } from "./contactDetailStyles";

type SheetState =
  | { open: false }
  | { open: true; mode: "add" }
  | { open: true; mode: "edit"; index: number; entry: ImportantDate };

interface ContactImportantDatesSectionProps {
  dates: ImportantDate[];
  contactFirstName: string;
  onSaveDates: (dates: ImportantDate[]) => Promise<void>;
}

function notifyLabel(
  notifyDaysBefore: ImportantDate["notifyDaysBefore"],
  t: (key: string, params?: Record<string, unknown>) => string,
): string | null {
  if (notifyDaysBefore === 1) {
    return t("ContactImportantDates.NotifyDayBefore", { count: 1 });
  }
  if (notifyDaysBefore === 3) {
    return t("ContactImportantDates.NotifyDaysBefore", { count: 3 });
  }
  if (notifyDaysBefore === 7) {
    return t("ContactImportantDates.NotifyDaysBefore", { count: 7 });
  }
  return null;
}

export function ContactImportantDatesSection({
  dates,
  contactFirstName,
  onSaveDates,
}: ContactImportantDatesSectionProps) {
  const colors = useMobileThemeColors();
  const t = useMobileTranslations();
  const { i18n } = useTranslation();
  const dateLocale = resolveDateLocale(i18n.language);
  const { showToast } = useAppToast();
  const [sheet, setSheet] = useState<SheetState>({ open: false });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canAdd = dates.length < LIMITS.maxImportantDates;

  const sortedDates = useMemo(
    () =>
      [...dates].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    [dates],
  );

  function openAddSheet() {
    if (!canAdd) {
      showToast({
        type: "error",
        headline: t("MobileApp.Common.ErrorTitle"),
        description: t("MobileApp.ContactIdentity.MaxDatesReached").replace(
          "{max}",
          String(LIMITS.maxImportantDates),
        ),
      });
      return;
    }

    setSheet({ open: true, mode: "add" });
  }

  function openEditSheet(index: number) {
    setSheet({ open: true, mode: "edit", index, entry: dates[index] });
  }

  async function persistDates(nextDates: ImportantDate[]) {
    setIsSubmitting(true);

    try {
      await onSaveDates(nextDates);
      setSheet({ open: false });
    } catch (err) {
      showToast({
        type: "error",
        headline: t("ContactImportantDates.ErrorTitle"),
        description:
          err instanceof Error ? err.message : t("ContactImportantDates.UpdateError"),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSaveEntry(entry: ImportantDate) {
    if (!sheet.open) {
      return;
    }

    let nextDates: ImportantDate[];

    if (sheet.mode === "add") {
      nextDates = [...dates, entry];
    } else {
      nextDates = dates.map((item, index) =>
        index === sheet.index ? { ...item, ...entry } : item,
      );
    }

    void persistDates(nextDates);
  }

  function handleDeleteEntry() {
    if (!sheet.open || sheet.mode !== "edit") {
      return;
    }

    const nextDates = dates.filter((_, index) => index !== sheet.index);
    void persistDates(nextDates);
  }

  return (
    <View style={contactDetailStyles.section}>
      <ContactDetailSectionHeader
        titleKey="ContactImportantDates.Title"
        action={
          canAdd
            ? {
                label: t("ContactInfo.Add"),
                accessibilityLabel: t("ContactImportantDates.AddAction"),
                icon: <IconCalendarPlus size={16} stroke={colors.primary} />,
                onPress: openAddSheet,
              }
            : undefined
        }
      />

      {sortedDates.length === 0 ? (
        <View
          style={[
            contactDetailStyles.card,
            contactDetailStyles.emptyCard,
            { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
          ]}
        >
          <Text style={[contactDetailStyles.emptyText, { color: colors.textMuted }]}>
            {t("ContactImportantDates.Empty")}
          </Text>
        </View>
      ) : (
        sortedDates.map((dateEntry) => {
          const sourceIndex = dates.findIndex((item) => item.id === dateEntry.id);
          const meta = IMPORTANT_DATE_TYPE_META[dateEntry.type];
          const reminder = notifyLabel(dateEntry.notifyDaysBefore, t);
          const typeLabel = t(`ContactImportantDates.Types.${dateEntry.type}`);

          return (
            <View
              key={dateEntry.id}
              style={[
                contactDetailStyles.card,
                { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
              ]}
            >
              <View style={contactDetailStyles.cardRow}>
                <View style={contactDetailStyles.cardLeadingIcon}>
                  <IconCalendar size={16} stroke={colors.iconSecondary} />
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${typeLabel}, ${formatImportantDate(dateEntry.date, dateLocale)}`}
                  onPress={() => openEditSheet(sourceIndex)}
                  style={contactDetailStyles.cardPressable}
                >
                  <View style={contactDetailStyles.infoTexts}>
                    <Text style={[contactDetailStyles.sectionLabel, { color: colors.textMuted }]}>
                      {meta.emoji} {typeLabel}
                    </Text>
                    <Text style={[contactDetailStyles.infoValue, { color: colors.textPrimary }]}>
                      {formatImportantDate(dateEntry.date, dateLocale)}
                    </Text>
                    {dateEntry.note ? (
                      <Text style={[styles.noteText, { color: colors.textMuted }]}>
                        {dateEntry.note}
                      </Text>
                    ) : null}
                    {reminder ? (
                      <View style={styles.reminderRow}>
                        <IconBell size={14} stroke={colors.iconSecondary} />
                        <Text style={[styles.reminderText, { color: colors.textMuted }]}>
                          {reminder}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </Pressable>

                <OverflowMenu
                  items={[
                    {
                      id: "edit",
                      label: t("ContactInfo.EditAction"),
                      icon: <IconPencil size={18} stroke={colors.iconPrimary} />,
                      onPress: () => openEditSheet(sourceIndex),
                    },
                  ]}
                  accessibilityLabel={t("ContactImportantDates.Title")}
                  triggerVariant="row"
                />
              </View>
            </View>
          );
        })
      )}

      <EditImportantDateSheet
        open={sheet.open}
        mode={sheet.open ? sheet.mode : "add"}
        initialEntry={sheet.open && sheet.mode === "edit" ? sheet.entry : null}
        existingDates={dates}
        contactFirstName={contactFirstName}
        isSubmitting={isSubmitting}
        onOpenChange={(open) => {
          if (!open) {
            setSheet({ open: false });
          }
        }}
        onCancel={() => setSheet({ open: false })}
        onSave={handleSaveEntry}
        onDelete={sheet.open && sheet.mode === "edit" ? handleDeleteEntry : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  noteText: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
    marginTop: 2,
  },
  reminderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  reminderText: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
  },
});
