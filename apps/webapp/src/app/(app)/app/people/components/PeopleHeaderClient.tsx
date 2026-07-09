"use client";

import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { ButtonLink, Kbd, parseShortcutKeys } from "@bondery/mantine-next";
import { Button, Group, Text, Tooltip } from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { IconAddressBook, IconUser, IconUserPlus } from "@tabler/icons-react";
import { PageHeader } from "@/app/(app)/app/components/PageHeader";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { HOTKEYS } from "@/lib/platform/config";
import { peopleSearchActions } from "../../components/PeopleSearchSpotlight";
import { openAddContactModal } from "./AddContactModal";

/**
 * Client component for the People page header.
 * Separated from the table so the header renders immediately (zero data
 * dependency) while the contacts table streams in via Suspense.
 */
export function PeopleHeaderClient() {
  const t = useWebTranslations("PeoplePage");

  useHotkeys([
    [HOTKEYS.ADD_PERSON, () => openAddContactModal()],
    [HOTKEYS.FIND_PERSON, () => peopleSearchActions.open()],
  ]);

  return (
    <PageHeader
      helpDoc="concepts.people"
      helpLabel={t("HeaderDescription")}
      icon={IconUser}
      primaryAction={
        <Tooltip
          label={
            <Group gap="xs" wrap="nowrap">
              <Text inherit size="xs">
                {t("AddPerson")}
              </Text>
              <Kbd keys={parseShortcutKeys(HOTKEYS.ADD_PERSON)} size="xs" />
            </Group>
          }
          withArrow
        >
          <Button
            leftSection={<IconUserPlus size={16} />}
            onClick={() => openAddContactModal()}
            size="md"
          >
            {t("AddPerson")}
          </Button>
        </Tooltip>
      }
      secondaryAction={
        <ButtonLink
          href={`${WEBAPP_ROUTES.SETTINGS}#data-management`}
          leftSection={<IconAddressBook size={16} />}
          scroll={false}
          size="md"
          variant="outline"
        >
          {t("ImportContacts")}
        </ButtonLink>
      }
    />
  );
}
