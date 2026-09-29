"use client";

import { getUserFacingError } from "@bondery/helpers/api";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import {
  errorNotificationTemplate,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconTrash } from "@tabler/icons-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";
import { openStandardConfirmModal } from "@/components/modals/openStandardConfirmModal";
import { useChatPageTranslations, useCommonTranslations } from "@/lib/i18n/generated/hooks";
import { useDeleteChatSessionMutation } from "@/lib/query/hooks/useChat";
import { useChatSessions } from "./ChatSessionsContext";

export function useConfirmDeleteChatSession() {
  const t = useChatPageTranslations();
  const tCommon = useCommonTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const { triggerChatReset } = useChatSessions();
  const deleteSessionMutation = useDeleteChatSessionMutation();

  return useCallback(
    (sessionId: string) => {
      openStandardConfirmModal({
        cancelLabel: t("cancel"),
        confirmColor: "red",
        confirmLabel: t("deleteSession"),
        confirmLeftSection: <IconTrash size={16} />,
        message: <Text size="sm">{t("deleteSessionConfirm")}</Text>,
        onConfirm: async () => {
          try {
            await deleteSessionMutation.mutateAsync(sessionId);
            notifications.show(
              successNotificationTemplate({
                description: "",
                title: t("deleteSessionSuccess"),
              }),
            );
            if (pathname === `${WEBAPP_ROUTES.CHAT}/${sessionId}`) {
              router.push(WEBAPP_ROUTES.CHAT);
              triggerChatReset();
            }
          } catch (error) {
            notifications.show(
              errorNotificationTemplate({
                description: getUserFacingError(error, tCommon),
                title: t("deleteSessionError"),
              }),
            );
          }
        },
        title: <ModalTitle icon={<IconTrash size={16} />} isDangerous text={t("deleteSession")} />,
      });
    },
    [deleteSessionMutation, pathname, router, t, tCommon, triggerChatReset],
  );
}
