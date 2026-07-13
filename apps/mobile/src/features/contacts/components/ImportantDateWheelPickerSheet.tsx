import { IconCheck } from "@tabler/icons-react-native";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from "react-native";
import {
  useCommonTranslations,
  useMobileContactIdentityTranslations,
} from "@/lib/i18n/generated/hooks";
import { ActionSheetPopup } from "../../../components/ActionSheetPopup";
import {
  MOBILE_CHECKBOX_TOUCH_ROW_MIN_HEIGHT,
  MobileCheckbox,
} from "../../../components/MobileCheckbox";
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
  type ImportantDateWheelValue,
  resolveDateLocale,
  toImportantDateIso,
} from "../importantDateUtils";
import { RotatingWheelColumn } from "./RotatingWheelColumn";

interface ImportantDateWheelPickerSheetProps {
  defaultWithoutYear?: boolean;
  initialIso: string | null;
  onCancel: () => void;
  onConfirm: (iso: string) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export function ImportantDateWheelPickerSheet({
  open,
  initialIso,
  defaultWithoutYear = false,
  onOpenChange,
  onCancel,
  onConfirm,
}: ImportantDateWheelPickerSheetProps) {
  const tMobileContactIdentity = useMobileContactIdentityTranslations();
  const t = useCommonTranslations();
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
  const yearIndex = Math.max(0, years.indexOf(wheelValue.year));

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
      tMobileContactIdentity("DateSetAnnouncement").replace(
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
        ? tMobileContactIdentity("YearHiddenAnnouncement")
        : tMobileContactIdentity("YearShownAnnouncement"),
    );
  }

  return (
    <ActionSheetPopup
      actions={[
        {
          icon: <IconCheck size={16} stroke={colors.textOnPrimary} />,
          label: t("actions.done"),
          onPress: handleDone,
          tone: "primary",
          variant: "filled",
        },
      ]}
      onClose={onCancel}
      onOpenChange={onOpenChange}
      open={open}
      title={tMobileContactIdentity("SelectDateTitle")}
    >
      <Pressable
        accessibilityHint={tMobileContactIdentity("WithoutYearHint")}
        accessibilityLabel={tMobileContactIdentity("WithoutYearLabel")}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: wheelValue.withoutYear }}
        onPress={() => handleWithoutYearToggle(!wheelValue.withoutYear)}
        style={styles.withoutYearRow}
      >
        <Text style={[styles.withoutYearLabel, { color: colors.textPrimary }]}>
          {tMobileContactIdentity("WithoutYearLabel")}
        </Text>
        <View pointerEvents="none">
          <MobileCheckbox
            accessibilityLabel={tMobileContactIdentity("WithoutYearLabel")}
            checked={wheelValue.withoutYear}
            disabled
            onCheckedChange={() => {}}
          />
        </View>
      </Pressable>

      <View style={styles.wheelsRow}>
        <View style={styles.wheelColumn}>
          <RotatingWheelColumn
            accessibilityLabel={tMobileContactIdentity("DayColumnLabel")}
            items={dayItems}
            onIndexChange={(index) => updateWheelValue({ day: index + 1 })}
            selectedIndex={dayIndex}
          />
        </View>

        <View style={[styles.wheelColumn, styles.monthColumn]}>
          <RotatingWheelColumn
            accessibilityLabel={tMobileContactIdentity("MonthColumnLabel")}
            items={monthLabels}
            onIndexChange={(index) => updateWheelValue({ month: index + 1 })}
            selectedIndex={monthIndex}
          />
        </View>

        {!wheelValue.withoutYear ? (
          <View style={styles.wheelColumn}>
            <RotatingWheelColumn
              accessibilityLabel={tMobileContactIdentity("YearColumnLabel")}
              items={yearItems}
              onIndexChange={(index) => updateWheelValue({ year: years[index] ?? wheelValue.year })}
              selectedIndex={yearIndex >= 0 ? yearIndex : 0}
            />
          </View>
        ) : null}
      </View>
    </ActionSheetPopup>
  );
}

const styles = StyleSheet.create({
  monthColumn: {
    flex: 1.4,
  },
  wheelColumn: {
    flex: 1,
    minWidth: 0,
  },
  wheelsRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
  },
  withoutYearLabel: {
    flex: 1,
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.medium,
  },
  withoutYearRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginBottom: 8,
    minHeight: MOBILE_CHECKBOX_TOUCH_ROW_MIN_HEIGHT,
  },
});
