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
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import { useRouter } from "next/navigation";
import { openAddContactModal } from "@/app/(app)/app/people/components/AddContactModal";
import { openNewActivityModal } from "@/app/(app)/app/interactions/components/NewActivityModal";
import { useAppNavigationLinks } from "./NavigationSidebar";
import { HOTKEYS, WEBSITE_URL } from "@/lib/config";
import { WEBAPP_ROUTES, WEBSITE_ROUTES } from "@bondery/helpers/globals/paths";
import { peopleSearchActions } from "./PeopleSearchSpotlight";

export { spotlight };

export function CommandPalette() {
  const t = useTranslations("CommandPalette");
  const tNav = useTranslations("AppNavigation");
  const router = useRouter();
  const { primaryLinks, secondaryLinks } = useAppNavigationLinks();

  const navActions = [
    ...primaryLinks,
    ...secondaryLinks,
    { href: WEBAPP_ROUTES.MYSELF, label: tNav("Myself"), icon: IconUserCircle },
  ].map((link) => ({
    id: `goto-${link.href}`,
    label: link.label,
    description: t("GoToDescription", { label: link.label }),
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
      nothingFound={t("NothingFound")}
      scrollAreaProps={{ h: 320 }}
      searchProps={{
        leftSection: <IconSearch size={18} stroke={1.5} />,
        placeholder: t("SearchPlaceholder"),
      }}
      actions={[
        {
          group: t("ActionsGroup"),
          actions: [
            {
              id: "log-interaction",
              label: t("LogInteraction"),
              description: t("LogInteractionDescription"),
              leftSection: <IconCalendarPlus size={20} stroke={1.5} />,
              rightSection: <Kbd size="xs">N</Kbd>,
              keywords: ["interaction", "log", "meeting", "call", "activity", "new"],
              onClick: () =>
                openNewActivityModal({
                  contacts: [],
                  onCreated: () => router.push(WEBAPP_ROUTES.INTERACTIONS),
                }),
            },
            {
              id: "add-person",
              label: t("AddPerson"),
              description: t("AddPersonDescription"),
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
              label: t("FindPerson"),
              description: t("FindPersonDescription"),
              leftSection: <IconUserSearch size={20} stroke={1.5} />,
              rightSection: <Kbd size="xs">F</Kbd>,
              keywords: ["find", "search", "person", "contact", "lookup"],
              onClick: () => peopleSearchActions.open(),
            },
          ],
        },
        {
          group: t("NavigateGroup"),
          actions: navActions,
        },
        {
          group: t("HelpGroup"),
          actions: [
            {
              id: "docs",
              label: t("Documentation"),
              description: t("DocumentationDescription"),
              leftSection: <IconBook2 size={20} stroke={1.5} />,
              keywords: ["docs", "help", "documentation", "guide", "learn"],
              onClick: () => window.open(`${WEBSITE_URL}${WEBSITE_ROUTES.DOCS}`, "_blank"),
            },
            {
              id: "contact",
              label: t("ContactUs"),
              description: t("ContactUsDescription"),
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
