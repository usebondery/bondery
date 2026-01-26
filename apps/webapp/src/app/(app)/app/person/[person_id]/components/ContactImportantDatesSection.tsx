import { ActionIcon, Button, Group, Stack, Text } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import DateWithNotification from "./DateWithNotification";
import { LIMITS } from "@/lib/config";

interface ImportantDate {
  date: Date | null;
  name: string;
  notify: boolean;
}

interface ContactImportantDatesSectionProps {
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
  savingField: string | null;
  focusedField: string | null;
  setFocusedField: (field: string | null) => void;
}

export function ContactImportantDatesSection({
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
  savingField,
  focusedField,
  setFocusedField,
}: ContactImportantDatesSectionProps) {
  return (
    <Stack gap="md">
      <DateWithNotification
        title="Birthday"
        dateLabel="Select birthday"
        dateValue={birthday}
        notifyValue={notifyBirthday}
        onDateChange={onBirthdayChange}
        onNotifyChange={onNotifyBirthdayChange}
        saving={savingField === "birthday" || savingField === "notifyBirthday"}
        focusedField={focusedField}
        onFocus={setFocusedField}
        onBlur={setFocusedField}
        fieldPrefix="birthday"
      />

      <Group justify="space-between" mb="md">
        <Text size="sm" fw={600}>
          Important Dates
        </Text>
        {importantDates.length < LIMITS.maxImportantDates && (
          <Button size="xs" variant="light" onClick={onAddImportantDate}>
            Add Date
          </Button>
        )}
      </Group>

      {importantDates.length > 0 ? (
        <Stack gap="md">
          {importantDates.map((importantDate, index) => (
            <Group key={index} align="flex-start" gap="sm">
              <div style={{ flex: 1 }}>
                <DateWithNotification
                  title=""
                  dateLabel="Select date"
                  nameLabel="Event name"
                  dateValue={importantDate.date}
                  nameValue={importantDate.name}
                  notifyValue={importantDate.notify}
                  onDateChange={(date: Date | null) => onImportantDateChange(index, date)}
                  onNameChange={(name: string) => onImportantDateNameChange(index, name)}
                  onNotifyChange={(notify: boolean) => onImportantDateNotifyChange(index, notify)}
                  showNameInput
                  saving={savingField === `importantDate-${index}`}
                  focusedField={focusedField}
                  onFocus={setFocusedField}
                  onBlur={setFocusedField}
                  fieldPrefix={`importantDate-${index}`}
                />
              </div>
              <ActionIcon
                color="red"
                variant="subtle"
                onClick={() => onRemoveImportantDate(index)}
                style={{ marginTop: 4 }}
              >
                <IconX size={18} />
              </ActionIcon>
            </Group>
          ))}
        </Stack>
      ) : (
        <Text size="sm" c="dimmed">
          No important dates added yet.
        </Text>
      )}
    </Stack>
  );
}
