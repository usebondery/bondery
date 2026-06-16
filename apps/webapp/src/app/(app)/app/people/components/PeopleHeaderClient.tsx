"use client";

import { Button, Group, Kbd, Text, Tooltip } from "@mantine/core";
import { IconAddressBook, IconUser, IconUserPlus } from "@tabler/icons-react";
import { useHotkeys } from "@mantine/hooks";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/app/(app)/app/components/PageHeader";
import { openAddContactModal } from "./AddContactModal";
import { peopleSearchActions } from "../../components/PeopleSearchSpotlight";
import { HOTKEYS, WEBSITE_URL } from "@/lib/config";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";

/**
 * Client component for the People page header.
 * Separated from the table so the header renders immediately (zero data
 * dependency) while the contacts table streams in via Suspense.
 */
export function PeopleHeaderClient() {
  const t = useTranslations("PeoplePage");
  const router = useRouter();

  useHotkeys([
    [HOTKEYS.ADD_PERSON, () => openAddContactModal()],
    [HOTKEYS.FIND_PERSON, () => peopleSearchActions.open()],
  ]);

  return (
    <PageHeader
      icon={IconUser}
      title={t("Title")}
      helpHref={`${WEBSITE_URL}/docs/concepts/people`}
      helpLabel={t("HeaderDescription")}
      secondaryAction={
        <Button
          variant="outline"
          size="md"
          leftSection={<IconAddressBook size={16} />}
          onClick={() =>
            router.push(`${WEBAPP_ROUTES.SETTINGS}#data-management`)
          }
        >
          {t("ImportContacts")}
        </Button>
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
