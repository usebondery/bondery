"use client";

import { Group, Space, Stack, Text, Tooltip } from "@mantine/core";
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
import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Contact } from "@bondery/schemas";
import {
  ActionIconLink,
  DataTable,
  PersonChip,
  PersonAvatar,
  type BulkAction,
  type DataColumnConfig,
  type DataTableLabels,
  type RowAction,
  type SortOption,
} from "@bondery/mantine-next";
import { formatContactName } from "@/lib/nameHelpers";
import { createSocialUrl } from "@bondery/helpers";
import {
  SOCIAL_ACTION_ORDER,
  type SocialActionKey,
} from "@/lib/socialActionTooltips";
import { useSocialActionTooltips } from "@/lib/i18n/useSocialActionTooltips";
import { getTelephoneReactMaskExpression, countryCodes } from "@bondery/helpers/phone";
import { abbreviateLocationCountry } from "@bondery/helpers";
import { useContactsTableCopy } from "@/lib/i18n/useContactsTableCopy";

export type ColumnKey =
  | "name"
  | "headline"
  | "location"
  | "lastInteraction"
  | "social"
  | "phone"
  | "email"
  | "avatar";
export type SortOrder =
  | "nameAsc"
  | "nameDesc"
  | "surnameAsc"
  | "surnameDesc"
  | "interactionAsc"
  | "interactionDesc"
  | "createdAtAsc"
  | "createdAtDesc";

/**
 * Formats a phone number for display using the appropriate country mask.
 * @param prefix Country code prefix (e.g., "+420", "+1")
 * @param value Phone number digits
 * @returns Formatted phone string
 */
function formatPhoneForDisplay(prefix: string, value: string): string {
  if (!value) return prefix || "";

  const mask = getTelephoneReactMaskExpression(prefix);
  const digits = value.replace(/\D/g, "");

  let formatted = "";
  let digitIndex = 0;

  for (const char of mask) {
    if (char === "0" && digitIndex < digits.length) {
      formatted += digits[digitIndex];
      digitIndex++;
    } else if (char !== "0") {
      formatted += char;
    }
  }

  // Append any remaining digits that didn't fit the mask
  if (digitIndex < digits.length) {
    formatted += digits.slice(digitIndex);
  }

  return [prefix, formatted.trim()].filter(Boolean).join(" ");
}

export interface ColumnConfig {
  key: ColumnKey;
  label: string;
  visible: boolean;
  icon?: ReactNode;
  fixed?: boolean;
  hideHeader?: boolean;
}

export interface MenuAction {
  key: string;
  label: string;
  icon: ReactNode;
  color?: string;
  onClick: (contactId: string) => void;
  disabled?: (contact: Contact) => boolean;
  disabledTooltip?: string;
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
  mergeDisabledTooltip?: string;
  mergeBulkLabel?: string;
  addToGroupsMenuLabel?: string;
  addToGroupsBulkLabel?: string;
  deleteMenuLabel?: string;
  deleteDisabledTooltip?: string;
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
  searchLoading?: boolean;
  noContactsFound: string;
  noContactsMatchSearch: string;
  columnsForMenu?: ColumnConfig[];
  setColumnsForMenu?: React.Dispatch<React.SetStateAction<ColumnConfig[]>>;
  sortOrderForMenu?: SortOrder;
  setSortOrderForMenu?: (order: SortOrder) => void;
  visibleColumns: ColumnKey[] | ColumnConfig[];
  onSelectAll?: () => void;
  onSelectOne?: (
    id: string,
    options?: { shiftKey?: boolean; index?: number },
  ) => void;
  allSelected?: boolean;
  someSelected?: boolean;
  showSelection?: boolean;
  nonSelectableIds?: Set<string>;
  nonSelectableTooltip?: string;
  standardActions?: StandardContactActions;
  menuActions?: MenuAction[];
  bulkSelectionActions?: BulkSelectionAction[];
  loadMoreAction?: LoadMoreAction;
  hasMore?: boolean;
  totalCount?: number;
  onSelectAllTotal?: () => void;
  /** Whether all items across all pages are selected (filter-scoped sentinel) */
  isAllTotalSelected?: boolean;
  /** IDs explicitly excluded from the "all total" selection */
  excludedIds?: Set<string>;
  disableNameLink?: boolean;
  dateLocale?: string;
  /** Optional custom renderer for the location cell. Receives the row (typed as Contact but may be any shape) and should return a ReactNode. */
  renderLocationCell?: (contact: Contact) => ReactNode;
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
  const { getSocialActionTooltip, getSocialActionLabel } = useSocialActionTooltips();

  const socialByKey: Record<SocialActionKey, SocialLink> = useMemo(
    () => ({
    phone: {
      key: "phone",
      icon: <IconPhone size={18} />,
      href: (() => {
        const phones = Array.isArray(contact.phones) ? contact.phones : [];
        const preferredPhone =
          phones.find((p: any) => p?.preferred) || phones[0];
        if (
          preferredPhone &&
          typeof preferredPhone === "object" &&
          "value" in preferredPhone
        ) {
          const phone = preferredPhone as any;
          return `tel:${phone.prefix || ""}${phone.value}`;
        }
      })(),
      color: "blue",
      label: getSocialActionLabel("phone"),
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
        const preferredEmail =
          emails.find((e: any) => e?.preferred) || emails[0];
        if (
          preferredEmail &&
          typeof preferredEmail === "object" &&
          "value" in preferredEmail
        ) {
          const email = preferredEmail as any;
          return `mailto:${email.value}`;
        }
      })(),
      color: "red",
      label: getSocialActionLabel("email"),
      disabled: (() => {
        const emails = Array.isArray(contact.emails) ? contact.emails : [];
        return emails.length === 0;
      })(),
    },
    linkedin: {
      key: "linkedin",
      icon: <IconBrandLinkedin size={18} />,
      href: contact.linkedin
        ? createSocialUrl("linkedin", contact.linkedin)
        : undefined,
      color: "blue",
      label: getSocialActionLabel("linkedin"),
      disabled: !contact.linkedin,
    },
    instagram: {
      key: "instagram",
      icon: <IconBrandInstagram size={18} />,
      href: contact.instagram
        ? createSocialUrl("instagram", contact.instagram)
        : undefined,
      color: "pink",
      label: getSocialActionLabel("instagram"),
      disabled: !contact.instagram,
    },
    whatsapp: {
      key: "whatsapp",
      icon: <IconBrandWhatsapp size={18} />,
      href: contact.whatsapp
        ? createSocialUrl("whatsapp", contact.whatsapp)
        : undefined,
      color: "green",
      label: getSocialActionLabel("whatsapp"),
      disabled: !contact.whatsapp,
    },
    facebook: {
      key: "facebook",
      icon: <IconBrandFacebook size={18} />,
      href: contact.facebook
        ? createSocialUrl("facebook", contact.facebook)
        : undefined,
      color: "blue",
      label: getSocialActionLabel("facebook"),
      disabled: !contact.facebook,
    },
    signal: {
      key: "signal",
      icon: (
        <Image src="/icons/brands/signal.svg" alt="Signal" width={18} height={18} />
      ),
      href: contact.signal || undefined,
      color: "indigo",
      label: getSocialActionLabel("signal"),
      disabled: !contact.signal,
    },
    }),
    [contact, getSocialActionLabel],
  );

  const socials: SocialLink[] = SOCIAL_ACTION_ORDER.map(
    (key) => socialByKey[key],
  );

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
                target={
                  social.href && social.href.startsWith("http")
                    ? "_blank"
                    : undefined
                }
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
  searchPlaceholder,
  searchDefaultValue,
  searchValue,
  onSearchChange,
  searchLoading,
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
  hasMore,
  totalCount,
  onSelectAllTotal,
  isAllTotalSelected,
  excludedIds,
  disableNameLink,
  dateLocale,
  noContactsFound,
  noContactsMatchSearch,
  renderLocationCell,
}: ContactsTableV2Props) {
  const { columnDefinitions, sortOptions, buildTableLabels, t } = useContactsTableCopy();
  const [searchIsActive, setSearchIsActive] = useState(() =>
    Boolean(searchValue ?? searchDefaultValue),
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchIsActive(value.length > 0);
      onSearchChange?.(value);
    },
    [onSearchChange],
  );

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(dateLocale || "en-US", { dateStyle: "short" }),
    [dateLocale],
  );

  const selectedContacts = contacts.filter((contact) =>
    selectedIds?.has(contact.id),
  );

  const standardMenuActions: MenuAction[] = [];
  if (standardActions?.onMergeOne) {
    standardMenuActions.push({
      key: "mergeWith",
      label: standardActions.mergeMenuLabel || t("MergeMenu"),
      icon: <IconArrowMerge size={14} />,
      onClick: (contactId) => standardActions.onMergeOne?.(contactId),
    });
  }
  if (standardActions?.onAddToGroupsOne) {
    standardMenuActions.push({
      key: "addToGroups",
      label: standardActions.addToGroupsMenuLabel || t("EditGroupsMenu"),
      icon: <IconUsersPlus size={14} />,
      onClick: (contactId) => standardActions.onAddToGroupsOne?.(contactId),
    });
  }
  const standardDeleteMenuAction: MenuAction | null =
    standardActions?.onDeleteOne
      ? {
          key: "deleteContact",
          label: standardActions.deleteMenuLabel || t("Delete"),
          icon: <IconTrash size={14} />,
          color: "red",
          onClick: (contactId) => standardActions.onDeleteOne?.(contactId),
        }
      : null;

  const standardBulkSelectionActions: BulkSelectionAction[] = [];
  if (standardActions?.onMergeSelected) {
    standardBulkSelectionActions.push({
      key: "mergeSelected",
      label: standardActions.mergeBulkLabel || t("MergeBulk"),
      icon: <IconArrowMerge size={16} />,
      onClick: () => {
        if (selectedContacts.length === 2) {
          standardActions.onMergeSelected?.(
            selectedContacts[0].id,
            selectedContacts[1].id,
          );
        }
      },
      disabled: selectedContacts.length !== 2,
      disabledTooltip: t("MergeExactlyTwoTooltip"),
    });
  }
  if (standardActions?.onAddToGroupsSelected) {
    standardBulkSelectionActions.push({
      key: "addSelectedToGroups",
      label: standardActions.addToGroupsBulkLabel || t("EditGroupsBulk"),
      icon: <IconUsersPlus size={16} />,
      onClick: () => {
        const ids = selectedContacts.map((contact) => contact.id);
        standardActions.onAddToGroupsSelected?.(ids);
      },
    });
  }
  const standardDeleteBulkAction: BulkSelectionAction | null =
    standardActions?.onDeleteSelected
      ? {
          key: "deleteSelected",
          label: standardActions.deleteBulkLabel || t("Delete"),
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
              label: columnDefinitions[key].label,
              icon: columnDefinitions[key].icon,
              visible: true,
              fixed: key === "name",
              hideHeader: key === "name",
            }))
          : (visibleColumnsProp as ColumnConfig[])
        : [],
    [
      visibleColumnsProp
        ?.map((c) =>
          typeof c === "string"
            ? c
            : `${c.key}:${Number(c.visible)}:${c.fixed ?? 0}`,
        )
        .join(","),
      columnDefinitions,
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
        hideHeader: column.hideHeader ?? column.key === "name",
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
            case "location": {
              if (renderLocationCell) return renderLocationCell(contact);
              const locationValue = contact.location || "-";
              const shortLocation = contact.location
                ? abbreviateLocationCountry(contact.location)
                : "-";
              return (
                <Tooltip label={locationValue} withArrow>
                  <Text size="sm" lineClamp={1}>
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
              const phones = Array.isArray(contact.phones)
                ? contact.phones
                : [];
              const preferred =
                phones.find((p: any) => p?.preferred) || phones[0];
              if (
                !preferred ||
                typeof preferred !== "object" ||
                !("value" in preferred)
              )
                return "-";
              const phone = preferred as { prefix?: string; value: string };
              const phoneDisplay = formatPhoneForDisplay(
                phone.prefix || "",
                phone.value,
              );
              const otherPhoneCount = phones.length - 1;
              return (
                <Tooltip label={phoneDisplay} withArrow>
                  <Stack gap={0}>
                    <Text size="sm" lineClamp={1}>
                      {phoneDisplay || "-"}
                    </Text>
                    {otherPhoneCount > 0 && (
                      <Text size="xs" c="dimmed">
                        +{otherPhoneCount} other{" "}
                        {otherPhoneCount === 1 ? "phone" : "phones"}
                      </Text>
                    )}
                  </Stack>
                </Tooltip>
              );
            }
            case "email": {
              const emails = Array.isArray(contact.emails)
                ? contact.emails
                : [];
              const preferred =
                emails.find((e: any) => e?.preferred) || emails[0];
              if (
                !preferred ||
                typeof preferred !== "object" ||
                !("value" in preferred)
              )
                return "-";
              const email = preferred as { value: string };
              const otherEmailCount = emails.length - 1;
              return (
                <Tooltip label={email.value} withArrow>
                  <Stack gap={0}>
                    <Text size="sm" lineClamp={1}>
                      {email.value || "-"}
                    </Text>
                    {otherEmailCount > 0 && (
                      <Text size="xs" c="dimmed">
                        +{otherEmailCount} other{" "}
                        {otherEmailCount === 1 ? "email" : "emails"}
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
                    id: contact.id,
                    firstName: contact.firstName,
                    lastName: contact.lastName,
                    avatar: contact.avatar,
                  }}
                  size={32}
                />
              );
            default:
              return null;
          }
        },
      })),
    // nonSelectableIds and disableNameLink are included because they affect the name column render.
    [sourceColumns, nonSelectableIds, disableNameLink, dateFormatter],
  );

  const rowActions: RowAction<Contact>[] = effectiveMenuActions.map(
    (action) => ({
      key: action.key,
      label: action.label,
      icon: action.icon,
      color: action.color,
      onClick: (contact) => action.onClick(contact.id),
      disabled: action.disabled,
      disabledTooltip: action.disabledTooltip,
    }),
  );

  const bulkActions: BulkAction[] = effectiveBulkSelectionActions.map(
    (action) => ({
      key: action.key,
      label: action.label,
      icon: action.icon,
      color: action.color,
      variant: action.variant,
      onClick: action.onClick,
      disabled: action.disabled,
      disabledTooltip: action.disabledTooltip,
      loading: action.loading,
    }),
  );

  const labels: DataTableLabels = buildTableLabels({
    searchPlaceholder,
    emptyStateMessage: searchIsActive ? noContactsMatchSearch : noContactsFound,
    loadMoreLabel: loadMoreAction?.label,
  });

  // allTotalSelected is now passed from the parent via isAllTotalSelected prop.
  const allTotalSelected = isAllTotalSelected ?? false;

  return (
    <DataTable<Contact, SortOrder>
      data={contacts}
      columns={tableColumns}
      getRowId={(contact) => (contact as any)._rowKey ?? contact.id}
      selectedIds={selectedIds}
      onSelectAll={showSelection ? onSelectAll : undefined}
      onSelectOne={showSelection ? onSelectOne : undefined}
      allSelected={allSelected}
      someSelected={someSelected}
      nonSelectableIds={nonSelectableIds}
      nonSelectableTooltip={nonSelectableTooltip}
      searchValue={searchValue ?? searchDefaultValue}
      onSearchChange={handleSearchChange}
      searchLoading={searchLoading}
      sortOptions={
        sortOrderForMenu && setSortOrderForMenu ? sortOptions : undefined
      }
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
      hasMore={Boolean(loadMoreAction && hasMore)}
      onLoadMore={loadMoreAction?.onClick}
      loadMoreLoading={loadMoreAction?.loading}
      totalCount={totalCount}
      onSelectAllTotal={onSelectAllTotal}
      allTotalSelected={allTotalSelected}
      excludedIds={excludedIds}
      showHeader={isHeaderShown}
      stickyHeaderOffset={headerStickyTop}
      labels={labels}
      headerContent={null}
      showSelectAll={showSelection}
      getRowSelectionAriaLabel={(contact) =>
        `Select ${formatContactName(contact)}`
      }
    />
  );
}
