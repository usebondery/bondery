"use client";

import { Kbd } from "@mantine/core";
import { Spotlight, spotlight } from "@mantine/spotlight";
import {
  IconBook2,
  IconCalendarPlus,
  IconMail,
  IconSearch,
  IconUserCircle,
  IconUserPlus,
  IconUserSearch,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { openAddContactModal } from "@/app/(app)/app/people/components/AddContactModal";
import { openNewActivityModal } from "@/app/(app)/app/interactions/components/NewActivityModal";
import { primaryLinks, secondaryLinks } from "./NavigationSidebar";
import { HOTKEYS, WEBSITE_URL } from "@/lib/config";
import { WEBAPP_ROUTES, WEBSITE_ROUTES } from "@bondery/helpers/globals/paths";
import { peopleSearchActions } from "./PeopleSearchSpotlight";

export { spotlight };

export function CommandPalette() {
  const t = useTranslations("InteractionsPage");
  const router = useRouter();

  const navActions = [
    ...primaryLinks,
    ...secondaryLinks,
    { href: WEBAPP_ROUTES.MYSELF, label: "Myself", icon: IconUserCircle },
  ].map((link) => ({
    id: `goto-${link.href}`,
    label: link.label,
    description: `Go to ${link.label}`,
    leftSection: <link.icon size={20} stroke={1.5} />,
    keywords: ["go", "navigate", "open", link.label.toLowerCase()],
    onClick: () => router.push(link.href),
  }));

  return (
    <Spotlight
      shortcut={HOTKEYS.COMMAND_PALETTE}
      clearQueryOnClose
      highlightQuery
      limit={12}
      nothingFound="No actions found"
      scrollAreaProps={{ h: 320 }}
      searchProps={{
        leftSection: <IconSearch size={18} stroke={1.5} />,
        placeholder: "Search actions or navigate…",
      }}
      actions={[
        {
          group: "Actions",
          actions: [
            {
              id: "log-interaction",
              label: "Log interaction",
              description: "Record a new meeting, call, or message",
              leftSection: <IconCalendarPlus size={20} stroke={1.5} />,
              rightSection: <Kbd size="xs">N</Kbd>,
              keywords: ["interaction", "log", "meeting", "call", "activity", "new"],
              onClick: () =>
                openNewActivityModal({
                  contacts: [],
                  onCreated: () => router.push(WEBAPP_ROUTES.INTERACTIONS),
                  t: (key, values) => t(key as any, values as any),
                }),
            },
            {
              id: "add-person",
              label: "Add person",
              description: "Create a new contact in your network",
              leftSection: <IconUserPlus size={20} stroke={1.5} />,
              rightSection: <Kbd size="xs">C</Kbd>,
              keywords: ["person", "contact", "add", "create", "new"],
              onClick: () =>
                openAddContactModal({
                  onCreated: (contact) => router.push(`${WEBAPP_ROUTES.PERSON}/${contact.id}`),
                }),
            },
            {
              id: "find-person",
              label: "Find person",
              description: "Search your network by name",
              leftSection: <IconUserSearch size={20} stroke={1.5} />,
              rightSection: <Kbd size="xs">F</Kbd>,
              keywords: ["find", "search", "person", "contact", "lookup"],
              onClick: () => peopleSearchActions.open(),
            },
          ],
        },
        {
          group: "Navigate",
          actions: navActions,
        },
        {
          group: "Help",
          actions: [
            {
              id: "docs",
              label: "Documentation",
              description: "Read the Bondery docs",
              leftSection: <IconBook2 size={20} stroke={1.5} />,
              keywords: ["docs", "help", "documentation", "guide", "learn"],
              onClick: () => window.open(`${WEBSITE_URL}${WEBSITE_ROUTES.DOCS}`, "_blank"),
            },
            {
              id: "contact",
              label: "Contact us",
              description: "Get in touch with the Bondery team",
              leftSection: <IconMail size={20} stroke={1.5} />,
              keywords: ["contact", "support", "help", "feedback", "email"],
              onClick: () => window.open(`${WEBSITE_URL}${WEBSITE_ROUTES.CONTACT}`, "_blank"),
            },
          ],
        },
      ]}
    />
  );
}
