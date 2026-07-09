import { IMPORTANT_DATE_TYPE_META } from "@bondery/helpers";
import type { ImportantDate } from "@bondery/schemas";
import { IconBell, IconCalendar, IconCalendarPlus, IconPencil } from "@tabler/icons-react-native";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { OverflowMenu } from "../../../components/OverflowMenu";
import { LIMITS } from "../../../lib/config";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { useAppToast } from "../../../lib/toast/useAppToast";
import { MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { formatImportantDate, resolveDateLocale } from "../importantDateUtils";
import { ContactDetailSectionHeader } from "./ContactDetailSectionHeader";
import { contactDetailStyles } from "./contactDetailStyles";
import { EditImportantDateSheet } from "./EditImportantDateSheet";

type SheetState =
  | { open: false }
  | { open: true; mode: "add" }
  | { open: true; mode: "edit"; index: number; entry: ImportantDate };

interface ContactImportantDatesSectionProps {
  contactFirstName: string;
  dates: ImportantDate[];
  onSaveDates: (dates: ImportantDate[]) => Promise<void>;
}

function notifyLabel(
  notifyDaysBefore: ImportantDate["notifyDaysBefore"],
  t: (key: string, params?: Record<string, unknown>) => string,
): string | null {
  if (notifyDaysBefore === 1) {
    return t("NotifyDayBefore", { count: 1, ns: "ContactImportantDates" });
  }
  if (notifyDaysBefore === 3) {
    return t("NotifyDaysBefore", { count: 3, ns: "ContactImportantDates" });
  }
  if (notifyDaysBefore === 7) {
    return t("NotifyDaysBefore", { count: 7, ns: "ContactImportantDates" });
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
      [...dates].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [dates],
  );

  function openAddSheet() {
    if (!canAdd) {
      showToast({
        description: t("MaxDatesReached", { ns: "MobileContactIdentity" }).replace(
          "{max}",
          String(LIMITS.maxImportantDates),
        ),
        headline: t("feedback.errorTitle", { ns: "common" }),
        type: "error",
      });
      return;
    }

    setSheet({ mode: "add", open: true });
  }

  function openEditSheet(index: number) {
    setSheet({ entry: dates[index], index, mode: "edit", open: true });
  }

  async function persistDates(nextDates: ImportantDate[]) {
    setIsSubmitting(true);

    try {
      await onSaveDates(nextDates);
      setSheet({ open: false });
    } catch (err) {
      showToast({
        description:
          err instanceof Error ? err.message : t("UpdateError", { ns: "ContactImportantDates" }),
        headline: t("ErrorTitle", { ns: "ContactImportantDates" }),
        type: "error",
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
        action={
          canAdd
            ? {
                accessibilityLabel: t("AddAction", { ns: "ContactImportantDates" }),
                icon: <IconCalendarPlus size={16} stroke={colors.primary} />,
                label: t("Add", { ns: "ContactInfo" }),
                onPress: openAddSheet,
              }
            : undefined
        }
        titleKey="Title"
        titleNamespace="ContactImportantDates"
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
            {t("Empty", { ns: "ContactImportantDates" })}
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
                  accessibilityLabel={`${typeLabel}, ${formatImportantDate(dateEntry.date, dateLocale)}`}
                  accessibilityRole="button"
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
                  accessibilityLabel={t("Title", { ns: "ContactImportantDates" })}
                  items={[
                    {
                      icon: <IconPencil size={18} stroke={colors.iconPrimary} />,
                      id: "edit",
                      label: t("EditAction", { ns: "ContactInfo" }),
                      onPress: () => openEditSheet(sourceIndex),
                    },
                  ]}
                  triggerVariant="row"
                />
              </View>
            </View>
          );
        })
      )}

      <EditImportantDateSheet
        contactFirstName={contactFirstName}
        existingDates={dates}
        initialEntry={sheet.open && sheet.mode === "edit" ? sheet.entry : null}
        isSubmitting={isSubmitting}
        mode={sheet.open ? sheet.mode : "add"}
        onCancel={() => setSheet({ open: false })}
        onDelete={sheet.open && sheet.mode === "edit" ? handleDeleteEntry : undefined}
        onOpenChange={(open) => {
          if (!open) {
            setSheet({ open: false });
          }
        }}
        onSave={handleSaveEntry}
        open={sheet.open}
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
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    marginTop: 4,
  },
  reminderText: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,
  },
});
