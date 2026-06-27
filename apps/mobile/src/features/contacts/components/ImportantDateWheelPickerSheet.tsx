import { useEffect, useMemo, useState } from "react";
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from "react-native";
import { IconCheck } from "@tabler/icons-react-native";
import { MobileCheckbox, MOBILE_CHECKBOX_TOUCH_ROW_MIN_HEIGHT } from "../../../components/MobileCheckbox";
import { ActionSheetPopup } from "../../../components/ActionSheetPopup";
import { useTranslation } from "react-i18next";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import {
  buildYearRange,
  clampDay,
  createDefaultWheelValue,
  daysInMonth,
  formatImportantDate,
  fromImportantDateIso,
  getMonthLabels,
  resolveDateLocale,
  toImportantDateIso,
  type ImportantDateWheelValue,
} from "../importantDateUtils";
import { RotatingWheelColumn } from "./RotatingWheelColumn";

interface ImportantDateWheelPickerSheetProps {
  open: boolean;
  initialIso: string | null;
  defaultWithoutYear?: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
  onConfirm: (iso: string) => void;
}

export function ImportantDateWheelPickerSheet({
  open,
  initialIso,
  defaultWithoutYear = false,
  onOpenChange,
  onCancel,
  onConfirm,
}: ImportantDateWheelPickerSheetProps) {
  const t = useMobileTranslations();
  const { i18n } = useTranslation();
  const colors = useMobileThemeColors();
  const locale = resolveDateLocale(i18n.language);

  const [wheelValue, setWheelValue] = useState<ImportantDateWheelValue>(() =>
    initialIso
      ? fromImportantDateIso(initialIso)
      : createDefaultWheelValue(defaultWithoutYear ? "birthday" : "other"),
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setWheelValue(
      initialIso
        ? fromImportantDateIso(initialIso)
        : createDefaultWheelValue(defaultWithoutYear ? "birthday" : "other", null),
    );
  }, [open, initialIso, defaultWithoutYear]);

  const monthLabels = useMemo(() => getMonthLabels(locale), [locale]);
  const years = useMemo(() => buildYearRange(), []);

  const clampYear = wheelValue.withoutYear ? 2004 : wheelValue.year;
  const dayCount = daysInMonth(wheelValue.month, clampYear);

  const dayItems = useMemo(
    () => Array.from({ length: dayCount }, (_, index) => String(index + 1)),
    [dayCount],
  );
  const yearItems = useMemo(() => years.map(String), [years]);

  const dayIndex = Math.min(Math.max(wheelValue.day - 1, 0), dayItems.length - 1);
  const monthIndex = Math.min(Math.max(wheelValue.month - 1, 0), 11);
  const yearIndex = Math.max(
    0,
    years.findIndex((year) => year === wheelValue.year),
  );

  function updateWheelValue(patch: Partial<ImportantDateWheelValue>) {
    setWheelValue((current) => {
      const next = { ...current, ...patch };
      const yearForClamp = next.withoutYear ? 2004 : next.year;
      next.day = clampDay(next.day, next.month, yearForClamp);
      return next;
    });
  }

  function handleDone() {
    const iso = toImportantDateIso(wheelValue);
    onConfirm(iso);
    void AccessibilityInfo.announceForAccessibility(
      t("MobileApp.ContactIdentity.DateSetAnnouncement").replace(
        "{date}",
        formatImportantDate(iso, locale),
      ),
    );
    onCancel();
  }

  function handleWithoutYearToggle(checked: boolean) {
    updateWheelValue({ withoutYear: checked });
    void AccessibilityInfo.announceForAccessibility(
      checked
        ? t("MobileApp.ContactIdentity.YearHiddenAnnouncement")
        : t("MobileApp.ContactIdentity.YearShownAnnouncement"),
    );
  }

  return (
    <ActionSheetPopup
      open={open}
      title={t("MobileApp.ContactIdentity.SelectDateTitle")}
      onOpenChange={onOpenChange}
      onClose={onCancel}
      actions={[
        {
          label: t("MobileApp.Common.Done"),
          icon: <IconCheck size={16} stroke={colors.textOnPrimary} />,
          onPress: handleDone,
          tone: "primary",
          variant: "filled",
        },
      ]}
    >
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: wheelValue.withoutYear }}
        accessibilityLabel={t("MobileApp.ContactIdentity.WithoutYearLabel")}
        accessibilityHint={t("MobileApp.ContactIdentity.WithoutYearHint")}
        onPress={() => handleWithoutYearToggle(!wheelValue.withoutYear)}
        style={styles.withoutYearRow}
      >
        <Text style={[styles.withoutYearLabel, { color: colors.textPrimary }]}>
          {t("MobileApp.ContactIdentity.WithoutYearLabel")}
        </Text>
        <View pointerEvents="none">
          <MobileCheckbox
            checked={wheelValue.withoutYear}
            accessibilityLabel={t("MobileApp.ContactIdentity.WithoutYearLabel")}
            onCheckedChange={() => {}}
            disabled
          />
        </View>
      </Pressable>

      <View style={styles.wheelsRow}>
        <View style={styles.wheelColumn}>
          <RotatingWheelColumn
            items={dayItems}
            selectedIndex={dayIndex}
            onIndexChange={(index) => updateWheelValue({ day: index + 1 })}
            accessibilityLabel={t("MobileApp.ContactIdentity.DayColumnLabel")}
          />
        </View>

        <View style={[styles.wheelColumn, styles.monthColumn]}>
          <RotatingWheelColumn
            items={monthLabels}
            selectedIndex={monthIndex}
            onIndexChange={(index) => updateWheelValue({ month: index + 1 })}
            accessibilityLabel={t("MobileApp.ContactIdentity.MonthColumnLabel")}
          />
        </View>

        {!wheelValue.withoutYear ? (
          <View style={styles.wheelColumn}>
            <RotatingWheelColumn
              items={yearItems}
              selectedIndex={yearIndex >= 0 ? yearIndex : 0}
              onIndexChange={(index) =>
                updateWheelValue({ year: years[index] ?? wheelValue.year })
              }
              accessibilityLabel={t("MobileApp.ContactIdentity.YearColumnLabel")}
            />
          </View>
        ) : null}
      </View>
    </ActionSheetPopup>
  );
}

const styles = StyleSheet.create({
  withoutYearRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: MOBILE_CHECKBOX_TOUCH_ROW_MIN_HEIGHT,
    marginBottom: 8,
    gap: 12,
  },
  withoutYearLabel: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.medium,
    flex: 1,
  },
  wheelsRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  wheelColumn: {
    flex: 1,
    minWidth: 0,
  },
  monthColumn: {
    flex: 1.4,
  },
});
