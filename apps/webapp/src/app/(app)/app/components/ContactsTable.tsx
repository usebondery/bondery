import {
  Table,
  TableThead,
  TableTbody,
  TableTr,
  TableTh,
  TableTd,
  Checkbox,
  Avatar,
  Group,
  Text,
  ActionIcon,
  Menu,
  MenuTarget,
  MenuDropdown,
  MenuItem,
  Button,
  Tooltip,
} from "@mantine/core";
import {
  IconBrandLinkedin,
  IconBrandInstagram,
  IconBrandWhatsapp,
  IconBrandFacebook,
  IconPhone,
  IconMail,
  IconPhoto,
  IconUser,
  IconBriefcase,
  IconMapPin,
  IconNote,
  IconClock,
  IconDotsVertical,
  IconTrash,
  IconUserMinus,
} from "@tabler/icons-react";
import Image from "next/image";
import { formatContactName } from "@/lib/nameHelpers";
import { createSocialMediaUrl } from "@/lib/socialMediaHelpers";
import { getAvatarColorFromName } from "@/lib/avatarColor";
import type { Contact } from "@bondery/types";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { ActionIconLink, AnchorLink } from "@bondery/mantine-next";

// Column definitions with labels and icons
const COLUMN_DEFINITIONS: Record<ColumnKey, { label: string; icon: React.ReactNode }> = {
  avatar: { label: "Avatar", icon: <IconPhoto size={16} /> },
  name: { label: "Name", icon: <IconUser size={16} /> },
  title: { label: "Title", icon: <IconBriefcase size={16} /> },
  place: { label: "Place", icon: <IconMapPin size={16} /> },
  shortNote: { label: "Short Note", icon: <IconNote size={16} /> },
  lastInteraction: { label: "Last Interaction", icon: <IconClock size={16} /> },
  social: { label: "Social Media", icon: <IconBrandLinkedin size={16} /> },
};

interface SocialLink {
  icon: React.ReactNode;
  href?: string;
  color: string;
  label: string;
  disabled?: boolean;
}

function ContactSocialIcons({ contact }: { contact: Contact }) {
  const socials: SocialLink[] = [
    {
      icon: <IconPhone size={18} />,
      href: (() => {
        const phones = Array.isArray(contact.phones) ? contact.phones : [];
        const preferredPhone = phones.find((p: any) => p?.preferred) || phones[0];
        if (preferredPhone && typeof preferredPhone === "object" && "value" in preferredPhone) {
          const phone = preferredPhone as any;
          return `tel:${phone.prefix || ""}${phone.value}`;
        }
      })(),
      color: "blue",
      label: "Phone",
      disabled: (() => {
        const phones = Array.isArray(contact.phones) ? contact.phones : [];
        return phones.length === 0;
      })(),
    },
    {
      icon: <IconMail size={18} />,
      href: (() => {
        const emails = Array.isArray(contact.emails) ? contact.emails : [];
        const preferredEmail = emails.find((e: any) => e?.preferred) || emails[0];
        if (preferredEmail && typeof preferredEmail === "object" && "value" in preferredEmail) {
          const email = preferredEmail as any;
          return `mailto:${email.value}`;
        }
        return undefined;
      })(),
      color: "red",
      label: "Email",
      disabled: (() => {
        const emails = Array.isArray(contact.emails) ? contact.emails : [];
        return emails.length === 0;
      })(),
    },
    {
      icon: <IconBrandLinkedin size={18} />,
      href: contact.linkedin ? createSocialMediaUrl("linkedin", contact.linkedin) : undefined,
      color: "blue",
      label: "LinkedIn",
      disabled: !contact.linkedin,
    },
    {
      icon: <IconBrandInstagram size={18} />,
      href: contact.instagram ? createSocialMediaUrl("instagram", contact.instagram) : undefined,
      color: "pink",
      label: "Instagram",
      disabled: !contact.instagram,
    },
    {
      icon: <IconBrandWhatsapp size={18} />,
      href: contact.whatsapp ? createSocialMediaUrl("whatsapp", contact.whatsapp) : undefined,
      color: "green",
      label: "WhatsApp",
      disabled: !contact.whatsapp,
    },
    {
      icon: <IconBrandFacebook size={18} />,
      href: contact.facebook ? createSocialMediaUrl("facebook", contact.facebook) : undefined,
      color: "blue",
      label: "Facebook",
      disabled: !contact.facebook,
    },
    {
      icon: <Image src="/icons/signal.svg" alt="Signal" width={18} height={18} />,
      href: contact.signal || undefined,
      color: "indigo",
      label: "Signal",
      disabled: !contact.signal,
    },
  ];
  return (
    <Group gap="xs">
      {socials
        .filter((s) => !s.disabled)
        .map((s) => (
          <ActionIconLink
            key={s.label}
            variant="light"
            color={s.color}
            href={s.href}
            target={s.href && s.href.startsWith("http") ? "_blank" : undefined}
            ariaLabel={s.label}
          >
            {s.icon}
          </ActionIconLink>
        ))}
    </Group>
  );
}

export type ColumnKey =
  | "avatar"
  | "name"
  | "title"
  | "place"
  | "shortNote"
  | "lastInteraction"
  | "social";

export interface ColumnConfig {
  key: ColumnKey;
  label: string;
  visible: boolean;
  icon?: React.ReactNode;
  fixed?: boolean; // Columns that cannot be hidden or reordered
}

export interface MenuAction {
  key: string;
  label: string;
  icon: React.ReactNode;
  color?: string;
  onClick: (contactId: string) => void;
}

export interface BulkSelectionAction {
  key: string;
  label: string;
  icon: React.ReactNode;
  color?: string;
  variant?: "filled" | "light" | "outline" | "subtle" | "default";
  onClick: (selectedIds: Set<string>) => void;
  loading?: boolean;
}

interface ContactsTableProps {
  contacts: Contact[];
  selectedIds?: Set<string>;
  visibleColumns: ColumnKey[] | ColumnConfig[];
  onSelectAll?: () => void;
  onSelectOne?: (id: string) => void;
  allSelected?: boolean;
  someSelected?: boolean;
  showSelection?: boolean;
  nonSelectableIds?: Set<string>;
  nonSelectableTooltip?: string;
  menuActions?: MenuAction[];
  bulkSelectionActions?: BulkSelectionAction[];
  disableNameLink?: boolean;
  dateLocale?: string;
}

export default function ContactsTable({
  contacts,
  selectedIds,
  visibleColumns: visibleColumnsProp,
  onSelectAll,
  onSelectOne,
  allSelected,
  someSelected,
  showSelection,
  nonSelectableIds,
  nonSelectableTooltip,
  menuActions,
  bulkSelectionActions,
  disableNameLink,
  dateLocale,
}: ContactsTableProps) {
  const dateFormatter = new Intl.DateTimeFormat(dateLocale || "en-US", {
    dateStyle: "short",
  });

  // Use provided menu actions or empty array
  const effectiveMenuActions: MenuAction[] = menuActions || [];

  // Normalize visibleColumns to ColumnConfig array
  const visibleColumns: ColumnConfig[] = Array.isArray(visibleColumnsProp)
    ? visibleColumnsProp[0] && typeof visibleColumnsProp[0] === "string"
      ? (visibleColumnsProp as ColumnKey[]).map((key) => ({
          key,
          label: COLUMN_DEFINITIONS[key].label,
          icon: COLUMN_DEFINITIONS[key].icon,
          visible: true,
        }))
      : (visibleColumnsProp as ColumnConfig[])
    : [];

  return (
    <>
      {bulkSelectionActions && selectedIds && selectedIds.size > 0 && (
        <Group mb="md">
          <Text size="sm" c="dimmed">
            {selectedIds.size} selected
          </Text>
          {bulkSelectionActions.map((action) => (
            <Button
              key={action.key}
              color={action.color}
              variant={action.variant || "light"}
              leftSection={action.icon}
              onClick={() => action.onClick(selectedIds)}
              loading={action.loading}
            >
              {action.label}
            </Button>
          ))}
        </Group>
      )}
      <Table striped highlightOnHover>
        <TableThead>
          <TableTr>
            {showSelection && (
              <TableTh style={{ width: 40 }}>
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={onSelectAll}
                  aria-label="Select all rows"
                />
              </TableTh>
            )}
            {visibleColumns.map((col) => (
              <TableTh key={col.key} style={col.key === "avatar" ? { width: 60 } : undefined}>
                {col.key === "avatar" || col.key === "name" ? (
                  <span></span>
                ) : (
                  <Group gap="xs" wrap="nowrap">
                    {col.icon}
                    <Text>{col.label}</Text>
                  </Group>
                )}
              </TableTh>
            ))}
            {effectiveMenuActions.length > 0 && <TableTh style={{ width: 48 }} />}
          </TableTr>
        </TableThead>
        <TableTbody>
          {contacts.length === 0 ? (
            <TableTr>
              <TableTd
                colSpan={
                  visibleColumns.length +
                  (showSelection ? 1 : 0) +
                  (effectiveMenuActions.length > 0 ? 1 : 0)
                }
              >
                <Text ta="center" c="dimmed">
                  No contacts found
                </Text>
              </TableTd>
            </TableTr>
          ) : (
            contacts.map((contact) => (
              <TableTr key={contact.id}>
                {showSelection && (
                  <TableTd>
                    {nonSelectableIds?.has(contact.id) ? (
                      <Tooltip label={nonSelectableTooltip} withArrow>
                        <span>
                          <Checkbox
                            checked={selectedIds?.has(contact.id)}
                            disabled
                            aria-label={`Select ${formatContactName(contact)}`}
                          />
                        </span>
                      </Tooltip>
                    ) : (
                      <Checkbox
                        checked={selectedIds?.has(contact.id)}
                        onChange={() => onSelectOne?.(contact.id)}
                        aria-label={`Select ${formatContactName(contact)}`}
                      />
                    )}
                  </TableTd>
                )}
                {visibleColumns.map((col) => {
                  switch (col.key) {
                    case "avatar":
                      return (
                        <TableTd key={col.key}>
                          <Avatar
                            src={contact.avatar || undefined}
                            color={getAvatarColorFromName(contact.firstName, contact.lastName)}
                            radius="xl"
                            size="md"
                            name={formatContactName(contact)}
                          />
                        </TableTd>
                      );
                    case "name":
                      return (
                        <TableTd key={col.key}>
                          {disableNameLink ? (
                            <Text>{formatContactName(contact)}</Text>
                          ) : (
                            <AnchorLink
                              href={`${WEBAPP_ROUTES.PERSON}/${contact.id}`}
                              c="blue"
                              underline="hover"
                            >
                              {formatContactName(contact)}
                            </AnchorLink>
                          )}
                        </TableTd>
                      );
                    case "title":
                      return <TableTd key={col.key}>{contact.title || "-"}</TableTd>;
                    case "place":
                      return <TableTd key={col.key}>{contact.place || "-"}</TableTd>;
                    case "shortNote":
                      return <TableTd key={col.key}>{contact.description}</TableTd>;
                    case "lastInteraction":
                      return (
                        <TableTd key={col.key}>
                          {contact.lastInteraction
                            ? dateFormatter.format(new Date(contact.lastInteraction))
                            : "-"}
                        </TableTd>
                      );
                    case "social":
                      return (
                        <TableTd key={col.key}>
                          <ContactSocialIcons contact={contact} />
                        </TableTd>
                      );
                    default:
                      return null;
                  }
                })}
                {effectiveMenuActions.length > 0 && (
                  <TableTd>
                    <Menu shadow="md" position="bottom-end">
                      <MenuTarget>
                        <ActionIcon variant="default" aria-label="Contact actions">
                          <IconDotsVertical size={16} />
                        </ActionIcon>
                      </MenuTarget>
                      <MenuDropdown>
                        {effectiveMenuActions.map((action) => (
                          <MenuItem
                            key={action.key}
                            leftSection={action.icon}
                            color={action.color}
                            onClick={() => action.onClick(contact.id)}
                          >
                            {action.label}
                          </MenuItem>
                        ))}
                      </MenuDropdown>
                    </Menu>
                  </TableTd>
                )}
              </TableTr>
            ))
          )}
        </TableTbody>
      </Table>
    </>
  );
}
