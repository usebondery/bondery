"use client";

import { Group, Space, Text, Tooltip } from "@mantine/core";
import {
  IconArrowMerge,
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandWhatsapp,
  IconBriefcase,
  IconClock,
  IconMail,
  IconMapPin,
  IconPhone,
  IconTrash,
  IconUserCircle,
  IconUser,
  IconUsersPlus,
} from "@tabler/icons-react";
import Image from "next/image";
import { useMemo } from "react";
import type { ReactNode } from "react";
import type { Contact } from "@bondery/types";
import {
  ActionIconLink,
  DataTable,
  PersonChip,
  type BulkAction,
  type DataColumnConfig,
  type DataTableLabels,
  type RowAction,
  type SortOption,
} from "@bondery/mantine-next";
import { formatContactName } from "@/lib/nameHelpers";
import { createSocialMediaUrl } from "@/lib/socialMediaHelpers";
import {
  getSocialActionTooltip,
  SOCIAL_ACTION_ORDER,
  type SocialActionKey,
} from "@/lib/socialActionTooltips";

export type ColumnKey = "name" | "headline" | "place" | "lastInteraction" | "social";
export type SortOrder =
  | "nameAsc"
  | "nameDesc"
  | "surnameAsc"
  | "surnameDesc"
  | "interactionAsc"
  | "interactionDesc";

const COLUMN_DEFINITIONS: Record<ColumnKey, { label: string; icon: ReactNode }> = {
  name: { label: "Name", icon: <IconUser size={16} /> },
  headline: { label: "Headline", icon: <IconBriefcase size={16} /> },
  place: { label: "Location", icon: <IconMapPin size={16} /> },
  lastInteraction: { label: "Last Interaction", icon: <IconClock size={16} /> },
  social: { label: "Social Media", icon: <IconUserCircle size={16} /> },
};

export interface ColumnConfig {
  key: ColumnKey;
  label: string;
  visible: boolean;
  icon?: ReactNode;
  fixed?: boolean;
}

export interface MenuAction {
  key: string;
  label: string;
  icon: ReactNode;
  color?: string;
  onClick: (contactId: string) => void;
}

export interface BulkSelectionAction {
  key: string;
  label: string;
  icon: ReactNode;
  color?: string;
  variant?: "filled" | "light" | "outline" | "subtle" | "default";
  onClick: (selectedIds: Set<string>) => void;
  disabled?: boolean;
  disabledTooltip?: string;
  loading?: boolean;
}

interface StandardContactActions {
  onMergeOne?: (contactId: string) => void;
  onMergeSelected?: (leftContactId: string, rightContactId: string) => void;
  onAddToGroupsOne?: (contactId: string) => void;
  onAddToGroupsSelected?: (contactIds: string[]) => void;
  onDeleteOne?: (contactId: string) => void;
  onDeleteSelected?: (contactIds: string[]) => void;
  mergeMenuLabel?: string;
  mergeBulkLabel?: string;
  addToGroupsMenuLabel?: string;
  addToGroupsBulkLabel?: string;
  deleteMenuLabel?: string;
  deleteBulkLabel?: string;
  isDeleteSelectedLoading?: boolean;
}

interface LoadMoreAction {
  label: string;
  onClick: () => void;
  loading?: boolean;
}

interface ContactsTableV2Props {
  contacts: Contact[];
  selectedIds?: Set<string>;
  isHeaderShown?: boolean;
  headerStickyTop?: number;
  searchPlaceholder?: string;
  searchDefaultValue?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  columnsForMenu?: ColumnConfig[];
  setColumnsForMenu?: React.Dispatch<React.SetStateAction<ColumnConfig[]>>;
  sortOrderForMenu?: SortOrder;
  setSortOrderForMenu?: (order: SortOrder) => void;
  visibleColumns: ColumnKey[] | ColumnConfig[];
  onSelectAll?: () => void;
  onSelectOne?: (id: string, options?: { shiftKey?: boolean; index?: number }) => void;
  allSelected?: boolean;
  someSelected?: boolean;
  showSelection?: boolean;
  nonSelectableIds?: Set<string>;
  nonSelectableTooltip?: string;
  standardActions?: StandardContactActions;
  menuActions?: MenuAction[];
  bulkSelectionActions?: BulkSelectionAction[];
  loadMoreAction?: LoadMoreAction;
  hasMoreToLoad?: boolean;
  disableNameLink?: boolean;
  dateLocale?: string;
}

interface SocialLink {
  key: SocialActionKey;
  icon: ReactNode;
  href?: string;
  color: string;
  label: string;
  disabled?: boolean;
}

function ContactSocialIcons({ contact }: { contact: Contact }) {
  const socialByKey: Record<SocialActionKey, SocialLink> = {
    phone: {
      key: "phone",
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
    email: {
      key: "email",
      icon: <IconMail size={18} />,
      href: (() => {
        const emails = Array.isArray(contact.emails) ? contact.emails : [];
        const preferredEmail = emails.find((e: any) => e?.preferred) || emails[0];
        if (preferredEmail && typeof preferredEmail === "object" && "value" in preferredEmail) {
          const email = preferredEmail as any;
          return `mailto:${email.value}`;
        }
      })(),
      color: "red",
      label: "Email",
      disabled: (() => {
        const emails = Array.isArray(contact.emails) ? contact.emails : [];
        return emails.length === 0;
      })(),
    },
    linkedin: {
      key: "linkedin",
      icon: <IconBrandLinkedin size={18} />,
      href: contact.linkedin ? createSocialMediaUrl("linkedin", contact.linkedin) : undefined,
      color: "blue",
      label: "LinkedIn",
      disabled: !contact.linkedin,
    },
    instagram: {
      key: "instagram",
      icon: <IconBrandInstagram size={18} />,
      href: contact.instagram ? createSocialMediaUrl("instagram", contact.instagram) : undefined,
      color: "pink",
      label: "Instagram",
      disabled: !contact.instagram,
    },
    whatsapp: {
      key: "whatsapp",
      icon: <IconBrandWhatsapp size={18} />,
      href: contact.whatsapp ? createSocialMediaUrl("whatsapp", contact.whatsapp) : undefined,
      color: "green",
      label: "WhatsApp",
      disabled: !contact.whatsapp,
    },
    facebook: {
      key: "facebook",
      icon: <IconBrandFacebook size={18} />,
      href: contact.facebook ? createSocialMediaUrl("facebook", contact.facebook) : undefined,
      color: "blue",
      label: "Facebook",
      disabled: !contact.facebook,
    },
    signal: {
      key: "signal",
      icon: <Image src="/icons/signal.svg" alt="Signal" width={18} height={18} />,
      href: contact.signal || undefined,
      color: "indigo",
      label: "Signal",
      disabled: !contact.signal,
    },
  };

  const socials: SocialLink[] = SOCIAL_ACTION_ORDER.map((key) => socialByKey[key]);

  return (
    <Group wrap="nowrap" className="gap-1!">
      {socials.map((social) => {
        if (!social || social.disabled) {
          return (
            <Space
              key={social.key}
              w={"calc(1.75rem * var(--mantine-scale))"}
              h={"calc(1.75rem * var(--mantine-scale))"}
            />
          );
        }

        return (
          <Tooltip
            key={social.key}
            label={getSocialActionTooltip(social.key, contact.firstName)}
            withArrow
          >
            <span>
              <ActionIconLink
                variant="light"
                color={social.color}
                href={social.href}
                size="md"
                target={social.href && social.href.startsWith("http") ? "_blank" : undefined}
                ariaLabel={social.label}
                icon={social.icon}
              />
            </span>
          </Tooltip>
        );
      })}
    </Group>
  );
}

export default function ContactsTableV2({
  contacts,
  selectedIds,
  isHeaderShown = true,
  headerStickyTop = 0,
  searchPlaceholder = "Search by name...",
  searchDefaultValue,
  searchValue,
  onSearchChange,
  columnsForMenu,
  setColumnsForMenu,
  sortOrderForMenu,
  setSortOrderForMenu,
  visibleColumns: visibleColumnsProp,
  onSelectAll,
  onSelectOne,
  allSelected,
  someSelected,
  showSelection,
  nonSelectableIds,
  nonSelectableTooltip,
  standardActions,
  menuActions,
  bulkSelectionActions,
  loadMoreAction,
  hasMoreToLoad,
  disableNameLink,
  dateLocale,
}: ContactsTableV2Props) {
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(dateLocale || "en-US", { dateStyle: "short" }),
    [dateLocale],
  );

  const selectedContacts = contacts.filter((contact) => selectedIds?.has(contact.id));

  const standardMenuActions: MenuAction[] = [];
  if (standardActions?.onMergeOne) {
    standardMenuActions.push({
      key: "mergeWith",
      label: standardActions.mergeMenuLabel || "Merge...",
      icon: <IconArrowMerge size={14} />,
      onClick: (contactId) => standardActions.onMergeOne?.(contactId),
    });
  }
  if (standardActions?.onAddToGroupsOne) {
    standardMenuActions.push({
      key: "addToGroups",
      label: standardActions.addToGroupsMenuLabel || "Edit groups...",
      icon: <IconUsersPlus size={14} />,
      onClick: (contactId) => standardActions.onAddToGroupsOne?.(contactId),
    });
  }
  const standardDeleteMenuAction: MenuAction | null = standardActions?.onDeleteOne
    ? {
        key: "deleteContact",
        label: standardActions.deleteMenuLabel || "Delete",
        icon: <IconTrash size={14} />,
        color: "red",
        onClick: (contactId) => standardActions.onDeleteOne?.(contactId),
      }
    : null;

  const standardBulkSelectionActions: BulkSelectionAction[] = [];
  if (standardActions?.onMergeSelected) {
    standardBulkSelectionActions.push({
      key: "mergeSelected",
      label: standardActions.mergeBulkLabel || "Merge",
      icon: <IconArrowMerge size={16} />,
      onClick: () => {
        if (selectedContacts.length === 2) {
          standardActions.onMergeSelected?.(selectedContacts[0].id, selectedContacts[1].id);
        }
      },
      disabled: selectedContacts.length !== 2,
      disabledTooltip: "Exactly two contacts must be selected.",
    });
  }
  if (standardActions?.onAddToGroupsSelected) {
    standardBulkSelectionActions.push({
      key: "addSelectedToGroups",
      label: standardActions.addToGroupsBulkLabel || "Add to groups",
      icon: <IconUsersPlus size={16} />,
      onClick: () => {
        const ids = selectedContacts.map((contact) => contact.id);
        standardActions.onAddToGroupsSelected?.(ids);
      },
    });
  }
  const standardDeleteBulkAction: BulkSelectionAction | null = standardActions?.onDeleteSelected
    ? {
        key: "deleteSelected",
        label: standardActions.deleteBulkLabel || "Delete",
        icon: <IconTrash size={16} />,
        color: "red",
        onClick: () => {
          const ids = selectedContacts.map((contact) => contact.id);
          standardActions.onDeleteSelected?.(ids);
        },
        loading: standardActions.isDeleteSelectedLoading,
      }
    : null;

  const effectiveMenuActions: MenuAction[] = [
    ...(menuActions || []),
    ...standardMenuActions,
    ...(standardDeleteMenuAction ? [standardDeleteMenuAction] : []),
  ];
  const effectiveBulkSelectionActions: BulkSelectionAction[] = [
    ...standardBulkSelectionActions,
    ...(bulkSelectionActions || []),
    ...(standardDeleteBulkAction ? [standardDeleteBulkAction] : []),
  ];

  const normalizedColumns: ColumnConfig[] = useMemo(
    () =>
      Array.isArray(visibleColumnsProp)
        ? visibleColumnsProp[0] && typeof visibleColumnsProp[0] === "string"
          ? (visibleColumnsProp as ColumnKey[]).map((key) => ({
              key,
              label: COLUMN_DEFINITIONS[key].label,
              icon: COLUMN_DEFINITIONS[key].icon,
              visible: true,
              fixed: key === "name",
            }))
          : (visibleColumnsProp as ColumnConfig[])
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      visibleColumnsProp
        ?.map((c) => (typeof c === "string" ? c : `${c.key}:${Number(c.visible)}:${c.fixed ?? 0}`))
        .join(","),
    ],
  );

  const sourceColumns = columnsForMenu ?? normalizedColumns;

  const tableColumns: DataColumnConfig<Contact>[] = useMemo(
    () =>
      sourceColumns.map((column) => ({
        key: column.key,
        label: column.label,
        icon: column.icon,
        visible: column.visible,
        fixed: column.fixed,
        minWidthClass: column.key === "name" ? "min-w-60" : "min-w-24",
        render: (contact: Contact) => {
          switch (column.key) {
            case "name":
              return (
                <PersonChip
                  person={{
                    id: contact.id,
                    firstName: contact.firstName,
                    middleName: contact.middleName,
                    lastName: contact.lastName,
                    avatar: contact.avatar,
                  }}
                  color={nonSelectableIds?.has(contact.id) ? "gray" : undefined}
                  isClickable={!disableNameLink}
                  size="md"
                />
              );
            case "headline": {
              const headlineValue = contact.headline || "-";
              return (
                <Tooltip label={headlineValue} withArrow>
                  <Text size="sm" lineClamp={1}>
                    {headlineValue}
                  </Text>
                </Tooltip>
              );
            }
            case "place": {
              const placeValue = contact.place || "-";
              return (
                <Tooltip label={placeValue} withArrow>
                  <Text size="sm" lineClamp={1}>
                    {placeValue}
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
            default:
              return null;
          }
        },
      })),
    // nonSelectableIds and disableNameLink are included because they affect the name column render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sourceColumns, nonSelectableIds, disableNameLink, dateFormatter],
  );

  const rowActions: RowAction<Contact>[] = effectiveMenuActions.map((action) => ({
    key: action.key,
    label: action.label,
    icon: action.icon,
    color: action.color,
    onClick: (contact) => action.onClick(contact.id),
  }));

  const bulkActions: BulkAction[] = effectiveBulkSelectionActions.map((action) => ({
    key: action.key,
    label: action.label,
    icon: action.icon,
    color: action.color,
    variant: action.variant,
    onClick: action.onClick,
    disabled: action.disabled,
    disabledTooltip: action.disabledTooltip,
    loading: action.loading,
  }));

  const sortOptions: SortOption<SortOrder>[] = [
    { key: "nameAsc", label: "Name A→Z" },
    { key: "nameDesc", label: "Name Z→A" },
    { key: "surnameAsc", label: "Surname A→Z" },
    { key: "surnameDesc", label: "Surname Z→A" },
    { key: "interactionDesc", label: "Newest interaction" },
    { key: "interactionAsc", label: "Oldest interaction" },
  ];

  const labels: DataTableLabels = {
    searchPlaceholder,
    emptyStateMessage: "No contacts found",
    loadMoreLabel: loadMoreAction?.label,
    selectedCountTemplate: "{count} selected",
    totalCountTemplate: "{count} total people",
    actionsAriaLabel: "Contact actions",
    columnVisibility: {
      buttonLabel: "Visible columns",
      visibleSection: "Visible",
      hiddenSection: "Hidden",
      noVisible: "No visible columns",
      noHidden: "No hidden columns",
    },
    sort: {
      buttonLabel: "Sort",
    },
  };

  return (
    <DataTable<Contact, SortOrder>
      data={contacts}
      columns={tableColumns}
      getRowId={(contact) => contact.id}
      selectedIds={selectedIds}
      onSelectAll={showSelection ? onSelectAll : undefined}
      onSelectOne={showSelection ? onSelectOne : undefined}
      allSelected={allSelected}
      someSelected={someSelected}
      nonSelectableIds={nonSelectableIds}
      nonSelectableTooltip={nonSelectableTooltip}
      searchValue={searchValue ?? searchDefaultValue}
      onSearchChange={onSearchChange}
      sortOptions={sortOrderForMenu && setSortOrderForMenu ? sortOptions : undefined}
      currentSort={sortOrderForMenu}
      onSortChange={setSortOrderForMenu}
      onColumnsChange={
        setColumnsForMenu
          ? (nextColumns) => {
              setColumnsForMenu(
                nextColumns.map((column) => ({
                  key: column.key as ColumnKey,
                  label: column.label,
                  icon: column.icon,
                  visible: column.visible,
                  fixed: column.fixed,
                })),
              );
            }
          : undefined
      }
      rowActions={rowActions.length > 0 ? rowActions : undefined}
      bulkActions={bulkActions.length > 0 ? bulkActions : undefined}
      hasMore={Boolean(loadMoreAction && hasMoreToLoad)}
      onLoadMore={loadMoreAction?.onClick}
      loadMoreLoading={loadMoreAction?.loading}
      showHeader={isHeaderShown}
      stickyHeaderOffset={headerStickyTop}
      labels={labels}
      headerContent={null}
      showSelectAll={showSelection}
      getRowSelectionAriaLabel={(contact) => `Select ${formatContactName(contact)}`}
    />
  );
}
