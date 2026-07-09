"use client";

import { Button, Group } from "@mantine/core";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";
import DateWithNotification from "../notes/DateWithNotification";

interface ContactDatesSectionProps {
  birthday: Date | null;
  focusedField: string | null;
  notifyBirthday: boolean;
  onAddImportantDate: () => void;
  onBirthdayChange: (date: Date | null) => void;
  onNotifyBirthdayChange: (checked: boolean) => void;
  savingBirthday: boolean;
  setFocusedField: (field: string | null) => void;
}

export function ContactDatesSection({
  birthday,
  notifyBirthday,
  onBirthdayChange,
  onNotifyBirthdayChange,
  onAddImportantDate,
  savingBirthday,
  focusedField,
  setFocusedField,
}: ContactDatesSectionProps) {
  const t = useWebTranslations("ContactImportantDates");

  return (
    <>
      <DateWithNotification
        dateLabel={t("BirthdayDateLabel")}
        dateValue={birthday}
        fieldPrefix="birthday"
        focusedField={focusedField}
        notifyValue={notifyBirthday}
        onBlur={setFocusedField}
        onDateChange={onBirthdayChange}
        onFocus={setFocusedField}
        onNotifyChange={onNotifyBirthdayChange}
        saving={savingBirthday}
        title={t("Types.birthday")}
      />
      <Group>
        <Button onClick={onAddImportantDate}>{t("AddImportantDate")}</Button>
      </Group>
      {/* Render important dates here as needed */}
    </>
  );
}
