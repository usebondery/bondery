"use client";

import { WEBAPP_ROUTES, WEBSITE_ROUTES } from "@bondery/helpers/globals/paths";
import { Kbd, parseShortcutKeys } from "@bondery/mantine-next";
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
import { useRouter } from "next/navigation";
import { openNewActivityModal } from "@/app/(app)/app/interactions/components/NewActivityModal";
import { openAddContactModal } from "@/app/(app)/app/people/components/modals/AddContactModal";
import {
  useAppNavigationTranslations,
  useCommandPaletteTranslations,
} from "@/lib/i18n/generated/hooks";
import { optimisticPersonDocumentTitle } from "@/lib/metadata/optimisticTitles";
import { useNavigateWithTitle } from "@/lib/metadata/useNavigateWithTitle";
import { HOTKEYS, WEBSITE_URL } from "@/lib/platform/config";
import { useAppNavigationLinks } from "./NavigationSidebar";
import { peopleSearchActions } from "./PeopleSearchSpotlight";

export { spotlight };

export function CommandPalette() {
  const t = useCommandPaletteTranslations();
  const tNav = useAppNavigationTranslations();
  const router = useRouter();
  const { navigateWithTitle } = useNavigateWithTitle();
  const { primaryLinks, secondaryLinks } = useAppNavigationLinks();

  const navActions = [
    ...primaryLinks,
    ...secondaryLinks,
    { href: WEBAPP_ROUTES.MYSELF, icon: IconUserCircle, label: tNav("Myself") },
  ].map((link) => ({
    description: t("GoToDescription", { label: link.label }),
    id: `goto-${link.href}`,
    keywords: ["go", "navigate", "open", link.label.toLowerCase()],
    label: link.label,
    leftSection: <link.icon size={20} stroke={1.5} />,
    onClick: () => router.push(link.href),
  }));

  return (
    <Spotlight
      actions={[
        {
          actions: [
            {
              description: t("LogInteractionDescription"),
              id: "log-interaction",
              keywords: ["interaction", "log", "meeting", "call", "activity", "new"],
              label: t("LogInteraction"),
              leftSection: <IconCalendarPlus size={20} stroke={1.5} />,
              onClick: () =>
                openNewActivityModal({
                  contacts: [],
                  onCreated: () => router.push(WEBAPP_ROUTES.INTERACTIONS),
                }),
              rightSection: <Kbd keys={parseShortcutKeys(HOTKEYS.LOG_INTERACTION)} size="xs" />,
            },
            {
              description: t("AddPersonDescription"),
              id: "add-person",
              keywords: ["person", "contact", "add", "create", "new"],
              label: t("AddPerson"),
              leftSection: <IconUserPlus size={20} stroke={1.5} />,
              onClick: () =>
                openAddContactModal({
                  onCreated: (contact) =>
                    navigateWithTitle(
                      `${WEBAPP_ROUTES.PERSON}/${contact.id}`,
                      optimisticPersonDocumentTitle(contact),
                    ),
                }),
              rightSection: <Kbd keys={parseShortcutKeys(HOTKEYS.ADD_PERSON)} size="xs" />,
            },
            {
              description: t("FindPersonDescription"),
              id: "find-person",
              keywords: ["find", "search", "person", "contact", "lookup"],
              label: t("FindPerson"),
              leftSection: <IconUserSearch size={20} stroke={1.5} />,
              onClick: () => peopleSearchActions.open(),
              rightSection: <Kbd keys={parseShortcutKeys(HOTKEYS.FIND_PERSON)} size="xs" />,
            },
          ],
          group: t("ActionsGroup"),
        },
        {
          actions: navActions,
          group: t("NavigateGroup"),
        },
        {
          actions: [
            {
              description: t("DocumentationDescription"),
              id: "docs",
              keywords: ["docs", "help", "documentation", "guide", "learn"],
              label: t("Documentation"),
              leftSection: <IconBook2 size={20} stroke={1.5} />,
              onClick: () => window.open(`${WEBSITE_URL}${WEBSITE_ROUTES.DOCS}`, "_blank"),
            },
            {
              description: t("ContactUsDescription"),
              id: "contact",
              keywords: ["contact", "support", "help", "feedback", "email"],
              label: t("ContactUs"),
              leftSection: <IconMail size={20} stroke={1.5} />,
              onClick: () => window.open(`${WEBSITE_URL}${WEBSITE_ROUTES.CONTACT}`, "_blank"),
            },
          ],
          group: t("HelpGroup"),
        },
      ]}
      clearQueryOnClose
      highlightQuery
      limit={12}
      nothingFound={t("NothingFound")}
      scrollAreaProps={{ h: 320 }}
      searchProps={{
        leftSection: <IconSearch size={18} stroke={1.5} />,
        placeholder: t("SearchPlaceholder"),
      }}
    />
  );
}
