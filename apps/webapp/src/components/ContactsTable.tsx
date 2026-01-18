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
  Anchor,
  ActionIcon,
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
} from "@tabler/icons-react";
import { useFormatter } from "next-intl";
import Image from "next/image";
import { formatContactName } from "@/lib/nameHelpers";
import Link from "next/link";
import type { Contact } from "@/lib/mockData";

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
      href: contact.phone ? `tel:${contact.phone}` : undefined,
      color: "blue",
      label: "Phone",
      disabled: !contact.phone,
    },
    {
      icon: <IconMail size={18} />,
      href: contact.email ? `mailto:${contact.email}` : undefined,
      color: "red",
      label: "Email",
      disabled: !contact.email,
    },
    {
      icon: <IconBrandLinkedin size={18} />,
      href: contact.linkedin,
      color: "blue",
      label: "LinkedIn",
      disabled: !contact.linkedin,
    },
    {
      icon: <IconBrandInstagram size={18} />,
      href: contact.instagram,
      color: "pink",
      label: "Instagram",
      disabled: !contact.instagram,
    },
    {
      icon: <IconBrandWhatsapp size={18} />,
      href: contact.whatsapp,
      color: "green",
      label: "WhatsApp",
      disabled: !contact.whatsapp,
    },
    {
      icon: <IconBrandFacebook size={18} />,
      href: contact.facebook,
      color: "blue",
      label: "Facebook",
      disabled: !contact.facebook,
    },
    {
      icon: <Image src="/icons/signal.svg" alt="Signal" width={18} height={18} />,
      href: contact.signal,
      color: "indigo",
      label: "Signal",
      disabled: !contact.signal,
    },
  ];
  return (
    <Group gap="xs">
      {socials.map((s) => (
        <ActionIcon
          key={s.label}
          variant="light"
          color={s.color}
          component="a"
          href={s.href}
          target={s.href && s.href.startsWith("http") ? "_blank" : undefined}
          disabled={s.disabled}
          aria-label={s.label}
        >
          {s.icon}
        </ActionIcon>
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
}: ContactsTableProps) {
  const format = useFormatter();

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
              <Group gap="xs" wrap="nowrap">
                {col.icon}
                <Text>{col.label}</Text>
              </Group>
            </TableTh>
          ))}
        </TableTr>
      </TableThead>
      <TableTbody>
        {contacts.length === 0 ? (
          <TableTr>
            <TableTd colSpan={visibleColumns.length + (showSelection ? 1 : 0)}>
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
                  <Checkbox
                    checked={selectedIds?.has(contact.id)}
                    onChange={() => onSelectOne?.(contact.id)}
                    aria-label={`Select ${formatContactName(contact)}`}
                  />
                </TableTd>
              )}
              {visibleColumns.map((col) => {
                switch (col.key) {
                  case "avatar":
                    return (
                      <TableTd key={col.key}>
                        <Avatar
                          src={contact.avatar || undefined}
                          color={contact.avatarColor}
                          radius="xl"
                          size="md"
                          name={formatContactName(contact)}
                        >
                          {!contact.avatar && (
                            <>
                              {contact.firstName[0]}
                              {contact.lastName?.[0]}
                            </>
                          )}
                        </Avatar>
                      </TableTd>
                    );
                  case "name":
                    return (
                      <TableTd key={col.key}>
                        <Anchor
                          component={Link}
                          href={`/app/person?person_id=${contact.id}`}
                          c="blue"
                          underline="hover"
                        >
                          {formatContactName(contact)}
                        </Anchor>
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
                        {format.dateTime(new Date(contact.lastInteraction), {
                          dateStyle: "short",
                        })}
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
            </TableTr>
          ))
        )}
      </TableTbody>
    </Table>
  );
}
