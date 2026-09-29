"use client";

import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { DotsMenuButton } from "@bondery/mantine-next";
import type { ChatSession } from "@bondery/schemas";
import {
  Box,
  Button,
  Collapse,
  Group,
  Menu,
  MenuItem,
  ScrollArea,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { useHover, useMediaQuery } from "@mantine/hooks";
import { IconChevronDown, IconPlus, IconTrash } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useChatSessions } from "@/lib/chat/ChatSessionsContext";
import { formatCompactAge } from "@/lib/chat/formatCompactAge";
import { type ChatSessionGroupId, groupChatSessionsByAge } from "@/lib/chat/groupChatSessionsByAge";
import { useConfirmDeleteChatSession } from "@/lib/chat/useConfirmDeleteChatSession";
import { useChatPageTranslations } from "@/lib/i18n/generated/hooks";
import { useChatSessionsQuery } from "@/lib/query/hooks/useChat";
import { ITEM_PADDING } from "./NavLinkItem";

/** Matches DotsMenuButton `size="sm"` (`--ai-size-sm`) so age vs dots does not change row height. */
const SESSION_ROW_TRAILING_SLOT_HEIGHT_PX = 22;
/** Reserved width so age ↔ dots does not shift the title; content is end-aligned to match ITEM_PADDING. */
const SESSION_ROW_TRAILING_SLOT_WIDTH_PX = 36;

interface SessionListItemProps {
  compactAge: string;
  isActive: boolean;
  isTouch: boolean;
  onDelete: (sessionId: string) => void;
  session: ChatSession;
}

function SessionListItem({
  compactAge,
  isActive,
  isTouch,
  onDelete,
  session,
}: SessionListItemProps) {
  const t = useChatPageTranslations();
  const [menuOpened, setMenuOpened] = useState(false);
  const { hovered, ref } = useHover<HTMLDivElement>();
  const showDelete = isTouch || hovered || menuOpened;

  return (
    <Group
      aria-current={isActive ? "page" : undefined}
      className="button-scale-effect"
      gap="xs"
      h={40}
      justify="flex-start"
      ref={ref}
      renderRoot={(props) => <Link href={`${WEBAPP_ROUTES.CHAT}/${session.id}`} {...props} />}
      style={{
        backgroundColor: isActive
          ? "var(--mantine-primary-color-filled)"
          : hovered
            ? "var(--mantine-primary-color-light-hover)"
            : "transparent",
        color: isActive ? "white" : "inherit",
        overflow: "hidden",
        textDecoration: "none",
        ...ITEM_PADDING,
        borderRadius: "var(--mantine-radius-sm)",
        width: "100%",
      }}
      wrap="nowrap"
    >
      <Text
        c={isActive ? "white" : undefined}
        size="sm"
        style={{
          flex: 1,
          lineHeight: 1.2,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {session.title ?? t("untitledSession")}
      </Text>
      <Box
        h={SESSION_ROW_TRAILING_SLOT_HEIGHT_PX}
        style={{
          alignItems: "center",
          display: "flex",
          flexShrink: 0,
          justifyContent: "flex-end",
          lineHeight: 1,
          overflow: "hidden",
        }}
        w={SESSION_ROW_TRAILING_SLOT_WIDTH_PX}
      >
        {showDelete ? (
          <Menu onChange={setMenuOpened} opened={menuOpened} position="bottom-end" withinPortal>
            <Menu.Target>
              <DotsMenuButton
                aria-label={t("deleteSession")}
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
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(session.id);
                }}
              >
                {t("deleteSession")}
              </MenuItem>
            </Menu.Dropdown>
          </Menu>
        ) : (
          <Text
            c={isActive ? "white" : "dimmed"}
            size="xs"
            style={{
              fontVariantNumeric: "tabular-nums",
              overflow: "hidden",
              textAlign: "right",
              whiteSpace: "nowrap",
            }}
          >
            {compactAge}
          </Text>
        )}
      </Box>
    </Group>
  );
}

export function SidebarChatPanel() {
  const t = useChatPageTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const { highlightedSessionId, triggerChatReset } = useChatSessions();
  const { data: sessions = [] } = useChatSessionsQuery();
  const handleDeleteSession = useConfirmDeleteChatSession();
  const [canFormatAge, setCanFormatAge] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<ChatSessionGroupId, boolean>>({
    last30Days: true,
    older: true,
  });
  const isTouch = useMediaQuery("(hover: none)") ?? false;

  useEffect(() => {
    setCanFormatAge(true);
  }, []);

  function handleNewSession() {
    router.push(WEBAPP_ROUTES.CHAT);
    triggerChatReset();
  }

  function toggleGroup(id: ChatSessionGroupId) {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const groupedSessions = groupChatSessionsByAge(sessions);
  const compactAgeLabels = {
    ageDaysShort: (count: number) => t("ageDaysShort", { count }),
    ageHoursShort: (count: number) => t("ageHoursShort", { count }),
    lessThanMinuteLabel: t("ageLessThanMinuteShort"),
  };

  return (
    <Box
      style={{
        display: "flex",
        flex: 1,
        flexDirection: "column",
        minHeight: 0,
        overflow: "hidden",
        width: "100%",
      }}
    >
      <Box mb="xs" style={{ flexShrink: 0 }}>
        <Button
          fullWidth
          leftSection={<IconPlus size={14} />}
          onClick={handleNewSession}
          size="xs"
          variant="outline"
        >
          {t("newSession")}
        </Button>
      </Box>

      <ScrollArea
        flex={1}
        offsetScrollbars={false}
        scrollbars="y"
        style={{ minHeight: 0 }}
        styles={{
          content: { display: "block", width: "100%" },
          viewport: { paddingRight: 0 },
        }}
        type="hover"
        w="100%"
      >
        {sessions.length === 0 ? (
          <Text c="dimmed" px="sm" py="md" size="xs" ta="center">
            {t("noSessions")}
          </Text>
        ) : (
          groupedSessions.map((group) => {
            const isOpen = openGroups[group.id];
            return (
              <Box key={group.id} mb={4}>
                <UnstyledButton
                  aria-expanded={isOpen}
                  onClick={() => toggleGroup(group.id)}
                  style={{
                    alignItems: "center",
                    display: "flex",
                    gap: 4,
                    padding: "4px 8px",
                    width: "100%",
                  }}
                >
                  <IconChevronDown
                    size={14}
                    style={{
                      flexShrink: 0,
                      transform: isOpen ? undefined : "rotate(-90deg)",
                      transition: "transform 150ms ease",
                    }}
                  />
                  <Text c="dimmed" fw={600} size="xs" tt="uppercase">
                    {group.id === "last30Days" ? t("last30Days") : t("older")}
                  </Text>
                </UnstyledButton>
                <Collapse expanded={isOpen} w="100%">
                  {group.sessions.map((session) => {
                    const isActive =
                      pathname === `${WEBAPP_ROUTES.CHAT}/${session.id}` ||
                      (pathname === WEBAPP_ROUTES.CHAT && highlightedSessionId === session.id);
                    const compactAge = canFormatAge
                      ? formatCompactAge(new Date(session.updatedAt), compactAgeLabels)
                      : "";
                    return (
                      <SessionListItem
                        compactAge={compactAge}
                        isActive={isActive}
                        isTouch={isTouch}
                        key={session.id}
                        onDelete={handleDeleteSession}
                        session={session}
                      />
                    );
                  })}
                </Collapse>
              </Box>
            );
          })
        )}
      </ScrollArea>
    </Box>
  );
}
