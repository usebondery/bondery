import DateWithNotification from "./DateWithNotification";
import { Group, Button } from "@mantine/core";

interface ImportantDate {
  date: Date | null;
  name: string;
  notify: boolean;
}

interface ContactDatesSectionProps {
  birthday: Date | null;
  notifyBirthday: boolean;
  onBirthdayChange: (date: Date | null) => void;
  onNotifyBirthdayChange: (checked: boolean) => void;
  importantDates: ImportantDate[];
  onAddImportantDate: () => void;
  onRemoveImportantDate: (index: number) => void;
  onImportantDateChange: (index: number, date: Date | null) => void;
  onImportantDateNameChange: (index: number, name: string) => void;
  onImportantDateNotifyChange: (index: number, notify: boolean) => void;
  savingBirthday: boolean;
  focusedField: string | null;
  setFocusedField: (field: string | null) => void;
}

export function ContactDatesSection({
  birthday,
  notifyBirthday,
  onBirthdayChange,
  onNotifyBirthdayChange,
  importantDates,
  onAddImportantDate,
  onRemoveImportantDate,
  onImportantDateChange,
  onImportantDateNameChange,
  onImportantDateNotifyChange,
  savingBirthday,
  focusedField,
  setFocusedField,
}: ContactDatesSectionProps) {
  return (
    <>
      <DateWithNotification
        title="Birthday"
        dateLabel="Select birthday"
        dateValue={birthday}
        notifyValue={notifyBirthday}
        onDateChange={onBirthdayChange}
        onNotifyChange={onNotifyBirthdayChange}
        saving={savingBirthday}
        focusedField={focusedField}
        onFocus={setFocusedField}
        onBlur={setFocusedField}
        fieldPrefix="birthday"
      />
      <Group>
        <Button onClick={onAddImportantDate}>Add Important Date</Button>
      </Group>
      {/* Render important dates here as needed */}
    </>
  );
}
