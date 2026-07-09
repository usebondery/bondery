"use client";

import { abbreviateLocationCountry } from "@bondery/helpers";
import { type DataColumnConfig, PersonAvatar, PersonChip } from "@bondery/mantine-next";
import type { Contact } from "@bondery/schemas";
import { Stack, Text, Tooltip } from "@mantine/core";
import type { ReactNode } from "react";
import { useMemo } from "react";
import type { ColumnKey } from "@/lib/contacts/table-types";
import {
  formatPhoneForDisplay,
  getPreferredEmail,
  getPreferredPhone,
} from "../utils/contacts-table-channel-helpers";
import { ContactSocialIcons } from "./ContactSocialIcons";
import type { ColumnConfig } from "./contacts-table-types";

interface UseContactsTableColumnsParams {
  dateFormatter: Intl.DateTimeFormat;
  disableNameLink?: boolean;
  renderLocationCell?: (contact: Contact) => ReactNode;
  sourceColumns: ColumnConfig[];
}

export function useContactsTableColumns({
  sourceColumns,
  disableNameLink,
  dateFormatter,
  renderLocationCell,
}: UseContactsTableColumnsParams): DataColumnConfig<Contact>[] {
  return useMemo(
    () =>
      sourceColumns.map((column) => ({
        fixed: column.fixed,
        hideHeader: column.hideHeader ?? column.key === "name",
        icon: column.icon,
        key: column.key,
        label: column.label,
        minWidthClass: column.key === "name" ? "min-w-60" : "min-w-24",
        render: (contact: Contact) => {
          switch (column.key) {
            case "name":
              return (
                <PersonChip
                  isClickable={!disableNameLink}
                  person={{
                    avatar: contact.avatar,
                    firstName: contact.firstName,
                    id: contact.id,
                    lastName: contact.lastName,
                    middleName: contact.middleName,
                  }}
                  size="md"
                />
              );
            case "headline": {
              const headlineValue = contact.headline || "-";
              return (
                <Tooltip label={headlineValue} withArrow>
                  <Text lineClamp={1} size="sm">
                    {headlineValue}
                  </Text>
                </Tooltip>
              );
            }
            case "location": {
              if (renderLocationCell) {
                return renderLocationCell(contact);
              }
              const locationValue = contact.location || "-";
              const shortLocation = contact.location
                ? abbreviateLocationCountry(contact.location)
                : "-";
              return (
                <Tooltip label={locationValue} withArrow>
                  <Text lineClamp={1} size="sm">
                    {shortLocation}
                  </Text>
                </Tooltip>
              );
            }
            case "lastInteraction":
              return contact.lastInteraction
                ? dateFormatter.format(new Date(contact.lastInteraction))
                : "-";
            case "social":
              return <ContactSocialIcons contact={contact} />;
            case "phone": {
              const phones = Array.isArray(contact.phones) ? contact.phones : [];
              const preferred = getPreferredPhone(contact.phones);
              if (!preferred) {
                return "-";
              }
              const phoneDisplay = formatPhoneForDisplay(preferred.prefix || "", preferred.value);
              const otherPhoneCount = phones.length - 1;
              return (
                <Tooltip label={phoneDisplay} withArrow>
                  <Stack gap={0}>
                    <Text lineClamp={1} size="sm">
                      {phoneDisplay || "-"}
                    </Text>
                    {otherPhoneCount > 0 && (
                      <Text c="dimmed" size="xs">
                        +{otherPhoneCount} other {otherPhoneCount === 1 ? "phone" : "phones"}
                      </Text>
                    )}
                  </Stack>
                </Tooltip>
              );
            }
            case "email": {
              const emails = Array.isArray(contact.emails) ? contact.emails : [];
              const preferred = getPreferredEmail(contact.emails);
              if (!preferred) {
                return "-";
              }
              const otherEmailCount = emails.length - 1;
              return (
                <Tooltip label={preferred.value} withArrow>
                  <Stack gap={0}>
                    <Text lineClamp={1} size="sm">
                      {preferred.value || "-"}
                    </Text>
                    {otherEmailCount > 0 && (
                      <Text c="dimmed" size="xs">
                        +{otherEmailCount} other {otherEmailCount === 1 ? "email" : "emails"}
                      </Text>
                    )}
                  </Stack>
                </Tooltip>
              );
            }
            case "avatar":
              return (
                <PersonAvatar
                  person={{
                    avatar: contact.avatar,
                    firstName: contact.firstName,
                    id: contact.id,
                    lastName: contact.lastName,
                  }}
                  size={32}
                />
              );
            default:
              return null;
          }
        },
        visible: column.visible,
      })),
    [sourceColumns, disableNameLink, dateFormatter, renderLocationCell],
  );
}

export function normalizeVisibleColumns(
  visibleColumnsProp: ColumnKey[] | ColumnConfig[],
  columnDefinitions: Record<ColumnKey, { icon: ReactNode; label: string }>,
): ColumnConfig[] {
  if (!Array.isArray(visibleColumnsProp)) {
    return [];
  }

  if (visibleColumnsProp[0] && typeof visibleColumnsProp[0] === "string") {
    return (visibleColumnsProp as ColumnKey[]).map((key) => ({
      fixed: key === "name",
      hideHeader: key === "name",
      icon: columnDefinitions[key].icon,
      key,
      label: columnDefinitions[key].label,
      visible: true,
    }));
  }

  return visibleColumnsProp as ColumnConfig[];
}
