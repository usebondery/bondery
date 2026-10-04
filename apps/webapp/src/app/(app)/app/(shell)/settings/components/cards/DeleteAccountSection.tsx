"use client";

import { Button, Group, Text } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { ensureFreshIdentity } from "@/lib/auth/reconfirm";
import { useCommonTranslations, useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";
import { useDeleteAccountMutation } from "@/lib/query/hooks/useSettings";
import { openDeleteAccountConfirm } from "../../settingsAuthActions";

export function DeleteAccountSection() {
  const tCommon = useCommonTranslations();
  const t = useSettingsPageTranslations("DataManagement");
  const deleteAccountMutation = useDeleteAccountMutation();

  const handleDeleteAccount = async () => {
    const stepped = await ensureFreshIdentity({ purpose: "delete_account" });
    if (stepped !== "fresh") {
      return;
    }

    openDeleteAccountConfirm({
      deleteAccount: (token) => deleteAccountMutation.mutateAsync(token),
      t,
      tCommon,
    });
  };

  return (
    <Group align="flex-start" justify="space-between">
      <div style={{ flex: 1 }}>
        <Text c="red" fw={500} mb={4} size="sm">
          {t("DeleteAccount")}
        </Text>
        <Text c="dimmed" size="xs">
          {t("DeleteAccountDescription")}
        </Text>
      </div>
      <Button
        color="red"
        leftSection={<IconTrash size={16} />}
        onClick={() => void handleDeleteAccount()}
        variant="light"
      >
        {t("DeleteButton")}
      </Button>
    </Group>
  );
}
