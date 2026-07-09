"use client";

import {
  errorNotificationTemplate,
  loadingNotificationTemplate,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { SegmentedControl, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import type { ReactNode } from "react";
import { useState } from "react";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { useUpdateSettingsMutation } from "@/lib/query/hooks/useSettings";

interface TimeFormatPickerProps {
  description?: string;
  initialTimeFormat: "24h" | "12h";
  label?: ReactNode;
  onTimeFormatChange?: (nextFormat: "24h" | "12h") => void;
}

export function TimeFormatPicker({
  initialTimeFormat,
  onTimeFormatChange,
  label,
  description,
}: TimeFormatPickerProps) {
  const t = useWebTranslations("SettingsPage", "Preferences");
  const updateSettingsMutation = useUpdateSettingsMutation();
  const [timeFormat, setTimeFormat] = useState<"24h" | "12h">(initialTimeFormat);
  const [savedTimeFormat, setSavedTimeFormat] = useState<"24h" | "12h">(initialTimeFormat);

  const persistTimeFormat = async (nextFormat: "24h" | "12h") => {
    if (nextFormat === savedTimeFormat) {
      return;
    }

    const loadingNotification = notifications.show({
      ...loadingNotificationTemplate({
        description: t("PleaseWait"),
        title: t("UpdatingTimeFormat"),
      }),
    });

    try {
      await updateSettingsMutation.mutateAsync({
        timeFormat: nextFormat,
      });

      setSavedTimeFormat(nextFormat);
      onTimeFormatChange?.(nextFormat);

      notifications.hide(loadingNotification);
      notifications.show(
        successNotificationTemplate({
          description: t("TimeFormatUpdateSuccess"),
          title: t("UpdateSuccess"),
        }),
      );
    } catch {
      setTimeFormat(savedTimeFormat);
      onTimeFormatChange?.(savedTimeFormat);

      notifications.hide(loadingNotification);
      notifications.show(
        errorNotificationTemplate({
          description: t("TimeFormatUpdateError"),
          title: t("UpdateError"),
        }),
      );
    }
  };

  return (
    <Stack gap={4}>
      <Text fw={500} size="sm">
        {label ?? t("TimeFormat")}
      </Text>
      {description && (
        <Text c="dimmed" size="xs">
          {description}
        </Text>
      )}
      <SegmentedControl
        data={[
          { label: t("TimeFormat24h"), value: "24h" },
          { label: t("TimeFormat12h"), value: "12h" },
        ]}
        onChange={(nextValue) => {
          if (nextValue !== "24h" && nextValue !== "12h") {
            return;
          }

          setTimeFormat(nextValue);
          onTimeFormatChange?.(nextValue);
          void persistTimeFormat(nextValue);
        }}
        value={timeFormat}
      />
    </Stack>
  );
}
