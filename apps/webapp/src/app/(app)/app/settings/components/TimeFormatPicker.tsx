"use client";

import { SegmentedControl, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import type { ReactNode } from "react";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import { useUpdateSettingsMutation } from "@/lib/query/hooks/useSettings";
import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  successNotificationTemplate,
} from "@bondery/mantine-next";

interface TimeFormatPickerProps {
  initialTimeFormat: "24h" | "12h";
  onTimeFormatChange?: (nextFormat: "24h" | "12h") => void;
  onTimeFormatSaved?: () => void;
  label?: ReactNode;
  description?: string;
}

export function TimeFormatPicker({
  initialTimeFormat,
  onTimeFormatChange,
  onTimeFormatSaved,
  label,
  description,
}: TimeFormatPickerProps) {
  const t = useTranslations("SettingsPage.Preferences");
  const updateSettingsMutation = useUpdateSettingsMutation();
  const [timeFormat, setTimeFormat] = useState<"24h" | "12h">(initialTimeFormat);
  const [savedTimeFormat, setSavedTimeFormat] = useState<"24h" | "12h">(initialTimeFormat);

  const persistTimeFormat = async (nextFormat: "24h" | "12h") => {
    if (nextFormat === savedTimeFormat) {
      return;
    }

    const loadingNotification = notifications.show({
      ...loadingNotificationTemplate({
        title: t("UpdatingTimeFormat"),
        description: t("PleaseWait"),
      }),
    });

    try {
      await updateSettingsMutation.mutateAsync({
        timeFormat: nextFormat,
      });

      setSavedTimeFormat(nextFormat);
      onTimeFormatChange?.(nextFormat);
      onTimeFormatSaved?.();

      notifications.hide(loadingNotification);
      notifications.show(
        successNotificationTemplate({
          title: t("UpdateSuccess"),
          description: t("TimeFormatUpdateSuccess"),
        }),
      );
    } catch {
      setTimeFormat(savedTimeFormat);
      onTimeFormatChange?.(savedTimeFormat);

      notifications.hide(loadingNotification);
      notifications.show(
        errorNotificationTemplate({
          title: t("UpdateError"),
          description: t("TimeFormatUpdateError"),
        }),
      );
    }
  };

  return (
    <Stack gap={4}>
      <Text size="sm" fw={500}>
        {label ?? t("TimeFormat")}
      </Text>
      {description && (
        <Text size="xs" c="dimmed">
          {description}
        </Text>
      )}
      <SegmentedControl
        value={timeFormat}
        onChange={(nextValue) => {
          if (nextValue !== "24h" && nextValue !== "12h") {
            return;
          }

          setTimeFormat(nextValue);
          onTimeFormatChange?.(nextValue);
          void persistTimeFormat(nextValue);
        }}
        data={[
          { label: t("TimeFormat24h"), value: "24h" },
          { label: t("TimeFormat12h"), value: "12h" },
        ]}
      />
    </Stack>
  );
}
