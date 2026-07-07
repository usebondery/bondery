"use client";

import { Button, Group, Kbd, Text, Tooltip } from "@mantine/core";
import { IconAddressBook, IconUser, IconUserPlus } from "@tabler/icons-react";
import { useHotkeys } from "@mantine/hooks";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import { ButtonLink } from "@bondery/mantine-next";
import { PageHeader } from "@/app/(app)/app/components/PageHeader";
import { openAddContactModal } from "./AddContactModal";
import { peopleSearchActions } from "../../components/PeopleSearchSpotlight";
import { HOTKEYS } from "@/lib/config";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";

/**
 * Client component for the People page header.
 * Separated from the table so the header renders immediately (zero data
 * dependency) while the contacts table streams in via Suspense.
 */
export function PeopleHeaderClient() {
  const t = useTranslations("PeoplePage");

  useHotkeys([
    [HOTKEYS.ADD_PERSON, () => openAddContactModal()],
    [HOTKEYS.FIND_PERSON, () => peopleSearchActions.open()],
  ]);

  return (
    <PageHeader
      icon={IconUser}
      title={t("Title")}
      helpDoc="concepts.people"
      helpLabel={t("HeaderDescription")}
      secondaryAction={
        <ButtonLink
          variant="outline"
          size="md"
          href={`${WEBAPP_ROUTES.SETTINGS}#data-management`}
          scroll={false}
          leftSection={<IconAddressBook size={16} />}
        >
          {t("ImportContacts")}
        </ButtonLink>
      }
      primaryAction={
        <Tooltip
          label={
            <Group gap="xs" wrap="nowrap">
              <Text size="xs" inherit>
                {t("AddPerson")}
              </Text>
              <Kbd size="xs">{HOTKEYS.ADD_PERSON.toUpperCase()}</Kbd>
            </Group>
          }
          withArrow
        >
          <Button
            size="md"
            leftSection={<IconUserPlus size={16} />}
            onClick={() => openAddContactModal()}
          >
            {t("AddPerson")}
          </Button>
        </Tooltip>
      }
    />
  );
}
