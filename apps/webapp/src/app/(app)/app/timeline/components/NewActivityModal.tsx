"use client";

import {
  Modal,
  Button,
  TextInput,
  Select,
  Group,
  Stack,
  Textarea,
  Text,
  Avatar,
  Combobox,
  Pill,
  PillsInput,
  useCombobox,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconCalendarPlus, IconCheck, IconDeviceFloppy, IconX } from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { Contact, Activity } from "@bondery/types";
import { useTranslations } from "next-intl";
import { ModalTitle } from "@bondery/mantine-next";
import { DatePickerWithPresets } from "../../components/timeline/DatePickerWithPresets";
import { ParticipantAvatarPill } from "../../components/shared/ParticipantAvatarPill";
import { ACTIVITY_TYPE_OPTIONS } from "@/lib/activityTypes";
import { getActivityTypeConfig } from "@/lib/activityTypes";

interface NewActivityModalProps {
  opened: boolean;
  onClose: () => void;
  contacts: Contact[];
  activity?: Activity | null;
}

function toLocalDateInputValue(value: Date): string {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDateInputValue(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function withFallbackTime(date: Date, fallback: Date): Date {
  const hasTime =
    date.getHours() !== 0 ||
    date.getMinutes() !== 0 ||
    date.getSeconds() !== 0 ||
    date.getMilliseconds() !== 0;

  if (hasTime) {
    return date;
  }

  const normalizedDate = new Date(date);
  normalizedDate.setHours(
    fallback.getHours(),
    fallback.getMinutes(),
    fallback.getSeconds(),
    fallback.getMilliseconds(),
  );
  return normalizedDate;
}

export function NewActivityModal({
  opened,
  onClose,
  contacts,
  activity = null,
}: NewActivityModalProps) {
  const router = useRouter();
  const t = useTranslations("TimelinePage");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const isEditMode = Boolean(activity?.id);
  const lastSyncKeyRef = useRef<string | null>(null);
  const contactsCombobox = useCombobox({
    onDropdownClose: () => {
      contactsCombobox.resetSelectedOption();
      setSearch("");
    },
  });

  const form = useForm({
    initialValues: {
      title: "",
      participantIds: [] as string[],
      date: toLocalDateInputValue(new Date()),
      type: "Call" as string,
      description: "",
    },
    validate: {
      title: (value) => (value.trim().length > 0 ? null : t("TitleRequired")),
      participantIds: (value) => (value.length > 0 ? null : "Please select at least one contact"),
      date: (value) => (value ? null : "Please select a date"),
      type: (value) => (value ? null : "Please select a type"),
    },
  });

  const contactOptions = useMemo(
    () =>
      contacts.map((contact) => ({
        value: contact.id,
        label: `${contact.firstName} ${contact.lastName || ""}`.trim(),
        avatar: contact.avatar,
        avatarColor: contact.avatarColor,
        initials: contact.firstName[0],
      })),
    [contacts],
  );

  const contactsById = useMemo(
    () => new Map(contacts.map((contact) => [contact.id, contact])),
    [contacts],
  );

  const selectedContacts = useMemo(
    () =>
      form.values.participantIds
        .map((id) => contactsById.get(id))
        .filter((contact): contact is Contact => Boolean(contact)),
    [contactsById, form.values.participantIds],
  );

  const filteredContactOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    const availableOptions = contactOptions.filter(
      (option) => !form.values.participantIds.includes(option.value),
    );

    if (!query) {
      return availableOptions;
    }

    return availableOptions.filter((option) => option.label.toLowerCase().includes(query));
  }, [contactOptions, form.values.participantIds, search]);

  const activityTypeSelectOptions = useMemo(
    () => ACTIVITY_TYPE_OPTIONS.map((type) => ({ value: type, label: type })),
    [],
  );

  const selectedTypeConfig = getActivityTypeConfig(form.values.type);

  useEffect(() => {
    if (!opened) {
      lastSyncKeyRef.current = null;
      return;
    }

    const syncKey = activity ? `edit:${activity.id}:${activity.updatedAt}` : "create";

    if (lastSyncKeyRef.current === syncKey) {
      return;
    }

    if (activity) {
      const participantIds = (activity.participants || [])
        .map((participant: any) => (typeof participant === "string" ? participant : participant.id))
        .filter((id): id is string => Boolean(id));

      form.setValues({
        title: activity.title || "",
        participantIds,
        date: toLocalDateInputValue(new Date(activity.date)),
        type: activity.type,
        description: activity.description || "",
      });

      lastSyncKeyRef.current = syncKey;
      return;
    }

    form.reset();
    lastSyncKeyRef.current = syncKey;
  }, [activity, form, opened]);

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    try {
      const dateValue = parseLocalDateInputValue(values.date);
      const fallbackTime = activity ? new Date(activity.date) : new Date();
      const normalizedDate = withFallbackTime(dateValue, fallbackTime);

      const endpoint = activity ? `${API_ROUTES.EVENTS}/${activity.id}` : API_ROUTES.EVENTS;
      const method = activity ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          date: normalizedDate.toISOString(),
        }),
      });

      if (!res.ok) {
        console.error("Failed to create event:", res.statusText);
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || "Failed to create event");
      }

      notifications.show({
        title: "Success",
        message: activity ? t("ActivityUpdated") : t("ActivityCreated"),
        color: "green",
        icon: <IconCheck size={18} />,
      });

      onClose();
      form.reset();
      router.refresh();
    } catch (error) {
      console.error("Error submitting form:", error);
      notifications.show({
        title: "Error",
        message:
          error instanceof Error ? error.message : "Failed to create event. Please try again.",
        color: "red",
        icon: <IconX size={18} />,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<ModalTitle text={t("WhoAreYouMeeting")} icon={<IconCalendarPlus size={24} />} />}
      size="lg"
      radius="md"
      padding="lg"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label={t("Title")}
            placeholder={t("TitlePlaceholder")}
            {...form.getInputProps("title")}
          />

          <Combobox
            store={contactsCombobox}
            onOptionSubmit={(value: string) => {
              const alreadySelected = form.values.participantIds.includes(value);
              const nextParticipantIds = alreadySelected
                ? form.values.participantIds.filter((id) => id !== value)
                : [...form.values.participantIds, value];

              form.setFieldValue("participantIds", nextParticipantIds);
              form.validateField("participantIds");
              setSearch("");
            }}
          >
            <Combobox.DropdownTarget>
              <PillsInput
                onClick={() => contactsCombobox.openDropdown()}
                error={form.errors.participantIds}
                styles={{
                  input: {
                    minHeight: 34,
                    display: "flex",
                    alignItems: "center",
                  },
                }}
              >
                <Pill.Group>
                  {selectedContacts.map((contact) => (
                    <ParticipantAvatarPill
                      key={contact.id}
                      person={contact}
                      onRemove={() => {
                        form.setFieldValue(
                          "participantIds",
                          form.values.participantIds.filter((id) => id !== contact.id),
                        );
                        form.validateField("participantIds");
                      }}
                    />
                  ))}

                  <Combobox.EventsTarget>
                    <PillsInput.Field
                      value={search}
                      placeholder={
                        selectedContacts.length === 0 ? t("AddContactsPlaceholder") : undefined
                      }
                      onFocus={() => contactsCombobox.openDropdown()}
                      onBlur={() => contactsCombobox.closeDropdown()}
                      onChange={(event) => {
                        setSearch(event.currentTarget.value);
                        contactsCombobox.openDropdown();
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Backspace" && search.length === 0) {
                          const lastSelectedId = form.values.participantIds.at(-1);
                          if (lastSelectedId) {
                            form.setFieldValue(
                              "participantIds",
                              form.values.participantIds.slice(0, -1),
                            );
                            form.validateField("participantIds");
                          }
                        }
                      }}
                    />
                  </Combobox.EventsTarget>
                </Pill.Group>
              </PillsInput>
            </Combobox.DropdownTarget>

            <Combobox.Dropdown>
              <Combobox.Options>
                {filteredContactOptions.length > 0 ? (
                  filteredContactOptions.map((option) => {
                    const isSelected = form.values.participantIds.includes(option.value);

                    return (
                      <Combobox.Option value={option.value} key={option.value} active={isSelected}>
                        <Group justify="space-between" wrap="nowrap" px="xs" py={6}>
                          <Group gap="sm" wrap="nowrap">
                            <Avatar
                              src={option.avatar}
                              size="sm"
                              radius="xl"
                              color={option.avatarColor || "blue"}
                            >
                              {option.initials}
                            </Avatar>
                            <Text size="sm" fw={isSelected ? 700 : 500}>
                              {option.label}
                            </Text>
                          </Group>
                        </Group>
                      </Combobox.Option>
                    );
                  })
                ) : (
                  <Combobox.Empty>{t("NoContactsFound")}</Combobox.Empty>
                )}
              </Combobox.Options>
            </Combobox.Dropdown>
          </Combobox>

          <Stack gap="xs">
            <Group justify="space-between" align="center">
              <Text size="sm" fw={500}>
                {t("Note")}
              </Text>
            </Group>
            <Textarea
              placeholder={t("DescriptionPlaceholder")}
              minRows={6}
              {...form.getInputProps("description")}
              styles={{
                input: {
                  resize: "vertical",
                },
              }}
            />
          </Stack>

          <Group mt="md">
            <Group grow w="100%">
              <DatePickerWithPresets
                placeholder={t("PickDate")}
                {...form.getInputProps("date")}
                w="100%"
              />
              <Select
                data={activityTypeSelectOptions}
                placeholder={t("Type")}
                {...form.getInputProps("type")}
                w="100%"
                allowDeselect={false}
                searchable
                leftSection={
                  <Avatar color={selectedTypeConfig.color} size={20} radius="xl">
                    {selectedTypeConfig.emoji}
                  </Avatar>
                }
                renderOption={({ option }) => {
                  const typeConfig = getActivityTypeConfig(option.value);
                  return (
                    <Group gap="sm" wrap="nowrap">
                      <Avatar color={typeConfig.color} size={20} radius="xl">
                        {typeConfig.emoji}
                      </Avatar>
                      <Text size="sm">{option.label}</Text>
                    </Group>
                  );
                }}
              />
            </Group>
          </Group>

          <Group justify="flex-end" mt="xl">
            <Button variant="default" color="gray" onClick={onClose}>
              {t("Cancel")}
            </Button>
            <Button
              type="submit"
              loading={loading}
              leftSection={
                isEditMode ? <IconDeviceFloppy size={16} /> : <IconCalendarPlus size={16} />
              }
            >
              {isEditMode ? t("SaveChanges") : t("AddActivity")}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
