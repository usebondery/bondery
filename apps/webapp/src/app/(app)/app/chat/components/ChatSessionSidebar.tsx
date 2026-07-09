"use client";

import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import {
  DotsMenuButton,
  errorNotificationTemplate,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import type { ChatSession } from "@bondery/schemas";
import { ActionIcon, Box, Menu, MenuItem, NavLink, ScrollArea, Text, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconMessagePlus, IconTrash } from "@tabler/icons-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { openStandardConfirmModal } from "@/components/modals/openStandardConfirmModal";
import { formatRelativeTime } from "@/lib/i18n/formatRelativeTime";
import { useDateFormatter as useFormatter } from "@/lib/i18n/useDateFormatter";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { useChatSessionsQuery, useDeleteChatSessionMutation } from "@/lib/query/hooks/useChat";
import { useChatSessions } from "../hooks/ChatSessionsContext";

interface SessionListItemProps {
  isActive: boolean;
  onDelete: (sessionId: string) => void;
  relativeTime: string;
  session: ChatSession;
}

function SessionListItem({ session, isActive, relativeTime, onDelete }: SessionListItemProps) {
  const t = useWebTranslations("ChatPage");
  const [menuOpened, setMenuOpened] = useState(false);

  return (
    <NavLink
      active={isActive}
      className="no-scale"
      description={relativeTime}
      href={`${WEBAPP_ROUTES.CHAT}/${session.id}`}
      label={session.title ?? t("untitledSession")}
      rightSection={
        <Menu onChange={setMenuOpened} opened={menuOpened} position="bottom-end" withinPortal>
          <Menu.Target>
            <DotsMenuButton
              aria-label={t("deleteSession")}
              iconSize={14}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              opened={menuOpened}
              size="sm"
            />
          </Menu.Target>
          <Menu.Dropdown>
            <MenuItem
              color="red"
              leftSection={<IconTrash size={14} />}
              onClick={() => onDelete(session.id)}
            >
              {t("deleteSession")}
            </MenuItem>
          </Menu.Dropdown>
        </Menu>
      }
      styles={{
        description: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
        label: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
      }}
    />
  );
}

export function ChatSessionSidebar() {
  const t = useWebTranslations("ChatPage");
  const formatter = useFormatter();
  const pathname = usePathname();
  const { triggerChatReset } = useChatSessions();
  const { data: sessions = [] } = useChatSessionsQuery();
  const deleteSessionMutation = useDeleteChatSessionMutation();

  function handleNewSession() {
    window.history.pushState(null, "", WEBAPP_ROUTES.CHAT);
    triggerChatReset();
  }

  function handleDeleteSession(sessionId: string) {
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
          const currentPath = window.location.pathname;
          if (currentPath === `${WEBAPP_ROUTES.CHAT}/${sessionId}`) {
            window.history.pushState(null, "", WEBAPP_ROUTES.CHAT);
            triggerChatReset();
          }
        } catch {
          notifications.show(
            errorNotificationTemplate({
              description: "",
              title: t("deleteSessionError"),
            }),
          );
        }
      },
      title: <ModalTitle icon={<IconTrash size={16} />} isDangerous text={t("deleteSession")} />,
    });
  }

  return (
    <Box
      style={{
        borderRight: "1px solid var(--mantine-color-default-border)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        height: "100%",
        width: 260,
      }}
    >
      <Box
        style={{
          alignItems: "center",
          borderBottom: "1px solid var(--mantine-color-default-border)",
          display: "flex",
          flexShrink: 0,
          justifyContent: "space-between",
          padding: "var(--mantine-spacing-sm)",
        }}
      >
        <Text fw={600} size="sm">
          {t("sessions")}
        </Text>
        <Tooltip label={t("newSession")}>
          <ActionIcon onClick={handleNewSession} size="sm" variant="subtle">
            <IconMessagePlus size={16} />
          </ActionIcon>
        </Tooltip>
      </Box>

      <ScrollArea flex={1} style={{ minHeight: 0 }}>
        <Box py="xs">
          {sessions.length === 0 ? (
            <Text c="dimmed" px="sm" py="md" size="xs" ta="center">
              {t("noSessions")}
            </Text>
          ) : (
            sessions.map((session) => {
              const isActive = pathname === `${WEBAPP_ROUTES.CHAT}/${session.id}`;
              const relativeTime = formatRelativeTime(
                new Date(session.updatedAt),
                formatter,
                t("lessThanMinuteAgo"),
              );
              return (
                <SessionListItem
                  isActive={isActive}
                  key={session.id}
                  onDelete={handleDeleteSession}
                  relativeTime={relativeTime}
                  session={session}
                />
              );
            })
          )}
        </Box>
      </ScrollArea>
    </Box>
  );
}
