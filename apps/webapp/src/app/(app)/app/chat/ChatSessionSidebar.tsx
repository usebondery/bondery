"use client";

import { ActionIcon, Box, Menu, MenuItem, NavLink, ScrollArea, Text, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconMessagePlus, IconTrash } from "@tabler/icons-react";
import { usePathname } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import type { ChatSession } from "@bondery/types";
import {
  DotsMenuButton,
  ModalTitle,
  errorNotificationTemplate,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import { openStandardConfirmModal } from "@/app/(app)/app/components/modals/openStandardConfirmModal";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import { useChatSessions } from "./ChatSessionsContext";

interface SessionListItemProps {
  session: ChatSession;
  isActive: boolean;
  relativeTime: string;
  onDelete: (sessionId: string) => void;
}

function SessionListItem({ session, isActive, relativeTime, onDelete }: SessionListItemProps) {
  const t = useTranslations("ChatPage");
  const [menuOpened, setMenuOpened] = useState(false);

  return (
    <NavLink
      href={`${WEBAPP_ROUTES.CHAT}/${session.id}`}
      label={session.title ?? t("untitledSession")}
      description={relativeTime}
      active={isActive}
      className="no-scale"
      styles={{
        label: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
        description: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
      }}
      rightSection={
        <Menu opened={menuOpened} onChange={setMenuOpened} position="bottom-end" withinPortal>
          <Menu.Target>
            <DotsMenuButton
              opened={menuOpened}
              size="sm"
              iconSize={14}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              aria-label={t("deleteSession")}
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
    />
  );
}

export function ChatSessionSidebar() {
  const t = useTranslations("ChatPage");
  const formatter = useFormatter();
  const pathname = usePathname();
  const { sessions, removeSession, triggerChatReset } = useChatSessions();

  function handleNewSession() {
    // Reset the ChatView via shared context (works even when history.pushState
    // has desynced the browser URL from the Next.js router).
    window.history.pushState(null, "", WEBAPP_ROUTES.CHAT);
    triggerChatReset();
  }

  function handleDeleteSession(sessionId: string) {
    openStandardConfirmModal({
      title: <ModalTitle text={t("deleteSession")} icon={<IconTrash size={16} />} isDangerous />,
      message: <Text size="sm">{t("deleteSessionConfirm")}</Text>,
      confirmLabel: t("deleteSession"),
      cancelLabel: t("cancel"),
      confirmColor: "red",
      confirmLeftSection: <IconTrash size={16} />,
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/chat/sessions/${sessionId}`, { method: "DELETE" });
          if (response.ok) {
            // Optimistic update — instant, no round-trip needed
            removeSession(sessionId);
            notifications.show(
              successNotificationTemplate({
                title: t("deleteSessionSuccess"),
                description: "",
              }),
            );
            // If we're viewing the deleted session, reset to new chat
            const currentPath = window.location.pathname;
            if (currentPath === `${WEBAPP_ROUTES.CHAT}/${sessionId}`) {
              window.history.pushState(null, "", WEBAPP_ROUTES.CHAT);
              triggerChatReset();
            }
          } else {
            notifications.show(
              errorNotificationTemplate({
                title: t("deleteSessionError"),
                description: "",
              }),
            );
          }
        } catch {
          notifications.show(
            errorNotificationTemplate({
              title: t("deleteSessionError"),
              description: "",
            }),
          );
        }
      },
    });
  }

  return (
    <Box
      style={{
        width: 260,
        borderRight: "1px solid var(--mantine-color-default-border)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <Box
        style={{
          borderBottom: "1px solid var(--mantine-color-default-border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "var(--mantine-spacing-sm)",
          flexShrink: 0,
        }}
      >
        <Text size="sm" fw={600}>
          {t("sessions")}
        </Text>
        <Tooltip label={t("newSession")}>
          <ActionIcon variant="subtle" size="sm" onClick={handleNewSession}>
            <IconMessagePlus size={16} />
          </ActionIcon>
        </Tooltip>
      </Box>

      {/* Session list */}
      <ScrollArea flex={1} style={{ minHeight: 0 }}>
        <Box py="xs">
          {sessions.length === 0 ? (
            <Text size="xs" c="dimmed" ta="center" py="md" px="sm">
              {t("noSessions")}
            </Text>
          ) : (
            sessions.map((session) => {
              const isActive = pathname === `${WEBAPP_ROUTES.CHAT}/${session.id}`;
              const relativeTime = formatRelativeTime(
                new Date(session.updated_at),
                formatter,
                t("lessThanMinuteAgo"),
              );
              return (
                <SessionListItem
                  key={session.id}
                  session={session}
                  isActive={isActive}
                  relativeTime={relativeTime}
                  onDelete={handleDeleteSession}
                />
              );
            })
          )}
        </Box>
      </ScrollArea>
    </Box>
  );
}
