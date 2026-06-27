"use client";

import { useEffect, useMemo, useState } from "react";
import { ActionIcon, Card, Group, Menu, Stack, Text, Tooltip } from "@mantine/core";
import { useTranslations } from "next-intl";
import { formatAddressLabel, buildManualContactAddress } from "@bondery/helpers/address";
import { geocodeSuggestionDisplayLabel } from "@bondery/helpers/geocode";
import {
  CONTACT_LIMITS,
  firstZodErrorMessage,
  replaceAddressesSchema,
  type Contact,
  type ContactAddressEntry,
  type ContactAddressType,
} from "@bondery/schemas";
import {
  IconBrandGoogle,
  IconBrandWaze,
  IconChevronRight,
  IconClock,
  IconCompass,
  IconAdjustments,
  IconCopy,
  IconDotsVertical,
  IconLoader2,
  IconMapPin,
  IconMapPinSearch,
  IconMapPinStar,
  IconPlus,
  IconRoute,
  IconStar,
  IconTrash,
} from "@tabler/icons-react";
import Image from "next/image";
import { LocationLookupInput } from "@/app/(app)/app/components/LocationLookupInput";
import { fetchTimezoneForCoordinates } from "@/lib/geocode";
import { resolveToCanonicalTimezone } from "@bondery/helpers/locale";
import {
  ActionIconLink,
  TypePicker,
  successNotificationTemplate,
  errorNotificationTemplate,
} from "@bondery/mantine-next";
import { ADDRESS_TYPE_OPTIONS } from "@/lib/config";
import { PeopleMap, type PeopleMapFocus } from "@/app/(app)/app/components/map/PeopleMap";
import { formatContactName } from "@/lib/nameHelpers";
import { notifications } from "@mantine/notifications";

interface ContactAddressSectionProps {
  contact: Contact;
  isSaving?: boolean;
  onSave: (payload: {
    addresses: ContactAddressEntry[];
    suggestedLocation: {
      location: string;
      latitude: number | null;
      longitude: number | null;
    } | null;
    forceLocation?: boolean;
    /** When true, skip the address save — only update the location field */
    locationOnly?: boolean;
    /** When true, skip address + location save — only update the timezone field */
    timezoneOnly?: boolean;
    /** IANA timezone string to save (used together with timezoneOnly) */
    timezone?: string;
  }) => void;
}

interface EditableAddress extends ContactAddressEntry {
  id: string;
}

interface DraftAddress {
  type: ContactAddressType;
  value: string;
  suggestion: ContactAddressEntry | null;
}

function normalizeNullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function applyGeocodedSuggestion(
  suggestion: ContactAddressEntry,
  type: ContactAddressType,
): Omit<EditableAddress, "id"> {
  return { ...suggestion, type };
}

function normalizeAddressTypes(entries: ContactAddressEntry[]): ContactAddressEntry[] {
  return entries;
}

function toEditableAddresses(contact: Contact): EditableAddress[] {
  const existing = Array.isArray(contact.addresses)
    ? (contact.addresses as ContactAddressEntry[])
    : [];

  if (existing.length > 0) {
    return normalizeAddressTypes(existing).map((address, index) => {
      const computedValue = formatAddressLabel({
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.addressCity,
        postalCode: address.addressPostalCode,
        state: address.addressState,
        countryCode: address.addressCountryCode,
      });
      return {
        ...address,
        id: `${address.type}-${index}`,
        value:
          computedValue ||
          address.value ||
          address.addressFormatted ||
          address.addressLine1 ||
          contact.location ||
          "",
        type: address.type,
      };
    });
  }

  // No addresses in people_addresses yet — show nothing.
  return [];
}

export function ContactAddressSection({ contact, isSaving, onSave }: ContactAddressSectionProps) {
  const t = useTranslations("ContactAddress");
  const typeOptions = useMemo(
    () =>
      ADDRESS_TYPE_OPTIONS.map((option) => ({
        value: option.value,
        emoji: option.emoji,
        label:
          option.value === "home"
            ? t("TypeHome")
            : option.value === "work"
              ? t("TypeWork")
              : t("TypeOther"),
      })),
    [t],
  );

  const [addresses, setAddresses] = useState<EditableAddress[]>(() => toEditableAddresses(contact));
  const [draft, setDraft] = useState<DraftAddress>({ type: "home", value: "", suggestion: null });
  const [mapFocus, setMapFocus] = useState<PeopleMapFocus | null>(null);
  const [suggestionsByValue, setSuggestionsByValue] = useState<Record<string, ContactAddressEntry>>(
    {},
  );

  const toSuggestionKey = (value: string) => value.trim().toLowerCase();

  const getSuggestionForValue = (value: string): ContactAddressEntry | null => {
    if (!value) {
      return null;
    }

    return suggestionsByValue[toSuggestionKey(value)] || null;
  };

  const hasValidCoordinates = (latitude: number | null, longitude: number | null): boolean => {
    if (latitude === null || longitude === null) {
      return false;
    }

    return Number.isFinite(latitude) && Number.isFinite(longitude);
  };

  const enrichWithSuggestionIfAvailable = <T extends ContactAddressEntry>(entry: T): T => {
    if (hasValidCoordinates(entry.latitude, entry.longitude)) {
      return entry;
    }

    const suggestion = getSuggestionForValue(entry.value);
    if (!suggestion) {
      return entry;
    }

    const enriched = applyGeocodedSuggestion(suggestion, entry.type);
    return {
      ...entry,
      ...enriched,
      type: entry.type,
      value: entry.value,
    } as T;
  };

  useEffect(() => {
    const next = toEditableAddresses(contact);
    const usedTypes = new Set(next.map((entry) => entry.type));
    const nextDraftType =
      ["home", "work", "other"].find(
        (candidate) => !usedTypes.has(candidate as ContactAddressType),
      ) || "home";

    setAddresses(next);
    setSuggestionsByValue({});
    setDraft({
      type: nextDraftType as ContactAddressType,
      value: "",
      suggestion: null,
    });
  }, [contact.addresses, contact.location, contact.latitude, contact.longitude]);

  const getTypeData = (currentType?: ContactAddressType) =>
    typeOptions.map((option) => ({
      ...option,
      disabled: false,
    }));

  const canAddMore = addresses.length < CONTACT_LIMITS.maxAddresses;

  const preferredAddressId = addresses[0]?.id;

  const markers = useMemo(() => {
    const addressMarkers = addresses
      .map((entry, index) => {
        const latitude = Number(entry.latitude);
        const longitude = Number(entry.longitude);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          return null;
        }

        return {
          id: `${entry.id}-${index}`,
          name: `${formatContactName(contact)} · ${entry.value}`,
          firstName: contact.firstName,
          lastName: contact.lastName,
          latitude,
          longitude,
          avatarUrl: contact.avatar,
        };
      })
      .filter((marker): marker is NonNullable<typeof marker> => Boolean(marker));

    if (addressMarkers.length > 0) {
      return addressMarkers;
    }

    return [];
  }, [addresses, contact]);

  const [detectingTimezoneId, setDetectingTimezoneId] = useState<string | null>(null);

  const mapCenter = useMemo<[number, number]>(() => {
    if (!markers.length) {
      return [0, 0];
    }

    const [sumLat, sumLon] = markers.reduce(
      ([latAcc, lonAcc], marker) => [latAcc + marker.latitude, lonAcc + marker.longitude],
      [0, 0],
    );

    return [sumLat / markers.length, sumLon / markers.length];
  }, [markers]);

  /**
   * Normalises, enriches and persists the current address list.
   * Only sets `suggestedLocation` when the anchor entry has valid coordinates,
   * preventing unnecessary location-change prompts for manual (ungeocoded) entries.
   * @param addrList - The address list to save (fresh copy, not from React state).
   * @param locationAnchor - When provided, this entry is preferred as the
   *   source for `suggestedLocation` coordinates instead of the first entry.
   */
  const saveNow = (
    addrList: EditableAddress[],
    locationAnchor?: EditableAddress | null,
    forceLocation = false,
  ) => {
    const normalized = addrList
      .map((entry) => ({ ...entry, value: entry.value.trim() }))
      .filter((entry) => entry.value.length > 0)
      .map((entry) => enrichWithSuggestionIfAvailable(entry))
      .map(({ id, ...rest }) => rest);

    const parsedAddresses = replaceAddressesSchema.safeParse(normalized);
    if (!parsedAddresses.success) {
      notifications.show(
        errorNotificationTemplate({
          title: t("DeleteErrorTitle"),
          description: firstZodErrorMessage(parsedAddresses.error),
        }),
      );
      return;
    }

    const anchorValue = locationAnchor?.value.trim();
    const locationSource = anchorValue
      ? (parsedAddresses.data.find((e) => e.value === anchorValue) ?? parsedAddresses.data[0])
      : parsedAddresses.data[0];

    const suggestedLocation =
      locationSource?.latitude !== null &&
      locationSource?.latitude !== undefined &&
      locationSource?.longitude !== null &&
      locationSource?.longitude !== undefined
        ? {
            location: locationSource.value,
            latitude: locationSource.latitude,
            longitude: locationSource.longitude,
          }
        : null;

    onSave({
      addresses: parsedAddresses.data,
      suggestedLocation,
      forceLocation: forceLocation || undefined,
    });
  };

  /**
   * Commits the current draft entry (optionally overriding with a suggestion)
   * and immediately persists all addresses via `saveNow`.
   * @param overrideSuggestion - When the user selects from the autocomplete
   *   dropdown this holds the selected suggestion; otherwise the existing
   *   draft suggestion (or a cached one) is used.
   */
  const handleCommitDraft = (overrideSuggestion?: ContactAddressEntry) => {
    const normalizedValue = normalizeNullableText(
      overrideSuggestion ? geocodeSuggestionDisplayLabel(overrideSuggestion) : draft.value,
    );
    if (!normalizedValue || !canAddMore) return;

    const suggestion =
      overrideSuggestion ?? draft.suggestion ?? getSuggestionForValue(normalizedValue);

    const nextBase = suggestion
      ? applyGeocodedSuggestion(suggestion, draft.type)
      : buildManualContactAddress({
          value: normalizedValue,
          type: draft.type,
          label: null,
          timezone: null,
        });

    const newEntry: EditableAddress = enrichWithSuggestionIfAvailable({
      ...nextBase,
      id: `${draft.type}-${Date.now()}`,
      value: normalizedValue,
    });

    const newAddresses = [...addresses, newEntry];

    if (overrideSuggestion) {
      setSuggestionsByValue((prev) => ({
        ...prev,
        [toSuggestionKey(geocodeSuggestionDisplayLabel(overrideSuggestion))]: overrideSuggestion,
      }));
    }

    setAddresses(newAddresses);
    setDraft({ type: draft.type, value: "", suggestion: null });
    saveNow(newAddresses, newEntry);
  };

  return (
    <Stack gap="md">
      <Text size="sm" fw={500}>
        {t("Title")}
      </Text>

      <Group align="flex-start" grow wrap="nowrap">
        <Stack gap="sm" style={{ flex: "1 1 0", minWidth: 0 }}>
          {addresses.map((entry) => (
            <Card
              key={entry.id}
              withBorder
              shadow="none"
              p="sm"
              radius="md"
              style={{
                borderColor:
                  entry.id === preferredAddressId ? "var(--mantine-color-orange-6)" : undefined,
              }}
            >
              <Stack gap="xs">
                <Group gap="xs" wrap="nowrap" align="center">
                  <ActionIconLink
                    variant="light"
                    color={entry.id === preferredAddressId ? "orange" : "blue"}
                    href={
                      entry.value
                        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(entry.value)}`
                        : undefined
                    }
                    disabled={!entry.value}
                    ariaLabel={t("LookupLabel")}
                    icon={
                      entry.id === preferredAddressId ? (
                        <IconMapPinStar size={18} />
                      ) : (
                        <IconMapPin size={18} />
                      )
                    }
                  />

                  <LocationLookupInput
                    placeholder={t("LookupPlaceholder")}
                    ariaLabel={t("LookupLabel")}
                    value={entry.value}
                    disabled={isSaving}
                    style={{ flex: "1 1 auto" }}
                    onChange={(value) =>
                      setAddresses((previous) =>
                        previous.map((address) =>
                          address.id === entry.id
                            ? value === address.value
                              ? address
                              : {
                                  ...address,
                                  value,
                                  latitude: null,
                                  longitude: null,
                                  addressFormatted: null,
                                  addressGeocodeSource: "manual",
                                }
                            : address,
                        ),
                      )
                    }
                    onSuggestionSelect={(selected) => {
                      const enriched = applyGeocodedSuggestion(selected, entry.type);
                      setSuggestionsByValue((previous) => ({
                        ...previous,
                        [toSuggestionKey(geocodeSuggestionDisplayLabel(selected))]: selected,
                      }));
                      const newAddresses = addresses.map((address) =>
                        address.id === entry.id ? { ...address, ...enriched } : address,
                      );
                      setAddresses(newAddresses);
                      const anchorEntry = newAddresses.find((a) => a.id === entry.id);
                      saveNow(newAddresses, anchorEntry);
                    }}
                  />

                  <TypePicker
                    value={entry.type}
                    data={getTypeData(entry.type)}
                    disabled={isSaving}
                    ariaLabel={t("TypeLabel")}
                    onChange={(value) => {
                      if (!value) return;
                      setAddresses((previous) =>
                        previous.map((address) =>
                          address.id === entry.id
                            ? { ...address, type: value as ContactAddressType }
                            : address,
                        ),
                      );
                    }}
                    style={{ flex: "0 0 130px" }}
                  />

                  <Menu withinPortal position="bottom-end">
                    <Menu.Target>
                      <ActionIcon
                        variant="subtle"
                        aria-label={t("ActionsLabel")}
                        disabled={isSaving}
                      >
                        <IconDotsVertical size={16} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Tooltip
                        label={t("DisabledReasonEmptyAddress")}
                        withArrow
                        disabled={Boolean(entry.value)}
                        withinPortal
                      >
                        <span>
                          <Menu.Item
                            leftSection={<IconCopy size={14} />}
                            disabled={!entry.value}
                            onClick={() => {
                              void navigator.clipboard.writeText(entry.value || "");
                              notifications.show(
                                successNotificationTemplate({
                                  title: t("CopySuccessTitle"),
                                  description: t("AddressCopiedMessage"),
                                }),
                              );
                            }}
                          >
                            {t("CopyAction")}
                          </Menu.Item>
                        </span>
                      </Tooltip>
                      <Tooltip
                        label={t("DisabledReasonNoCoordinates")}
                        withArrow
                        disabled={hasValidCoordinates(entry.latitude, entry.longitude)}
                        withinPortal
                      >
                        <span>
                          <Menu.Item
                            leftSection={<IconMapPinSearch size={14} />}
                            disabled={!hasValidCoordinates(entry.latitude, entry.longitude)}
                            onClick={() => {
                              if (!hasValidCoordinates(entry.latitude, entry.longitude)) {
                                return;
                              }

                              setMapFocus({
                                latitude: entry.latitude as number,
                                longitude: entry.longitude as number,
                                zoom: 14,
                                token: `${entry.id}-${Date.now()}`,
                              });
                            }}
                          >
                            {t("ShowOnMapAction")}
                          </Menu.Item>
                        </span>
                      </Tooltip>
                      <Menu.Sub>
                        <Menu.Sub.Target>
                          <Menu.Sub.Item
                            leftSection={<IconAdjustments size={14} />}
                            rightSection={<IconChevronRight size={14} />}
                          >
                            {t("SetAsAction")}
                          </Menu.Sub.Item>
                        </Menu.Sub.Target>

                        <Menu.Sub.Dropdown>
                          <Menu.Item
                            leftSection={<IconCompass size={14} />}
                            disabled={!hasValidCoordinates(entry.latitude, entry.longitude)}
                            onClick={() => {
                              const anchorValue = entry.value.trim();
                              const normalized = addresses
                                .map((a) => ({ ...a, value: a.value.trim() }))
                                .filter((a) => a.value.length > 0)
                                .map(({ id, ...rest }) => rest);
                              const locationSource =
                                normalized.find((e) => e.value === anchorValue) ?? normalized[0];
                              if (!locationSource) return;
                              onSave({
                                addresses: normalized,
                                suggestedLocation: {
                                  location: locationSource.value,
                                  latitude: locationSource.latitude,
                                  longitude: locationSource.longitude,
                                },
                                forceLocation: true,
                                locationOnly: true,
                              });
                            }}
                          >
                            {t("SetAsLocation")}
                          </Menu.Item>

                          <Menu.Item
                            leftSection={<IconStar size={14} />}
                            disabled={entry.id === preferredAddressId}
                            onClick={() => {
                              const selected = addresses.find((address) => address.id === entry.id);
                              if (!selected) return;
                              const newAddresses = [
                                selected,
                                ...addresses.filter((address) => address.id !== entry.id),
                              ];
                              setAddresses(newAddresses);
                              saveNow(newAddresses);
                            }}
                          >
                            {t("SetAsPreferred")}
                          </Menu.Item>

                          <Tooltip
                            label={t("DisabledReasonNoCoordinates")}
                            withArrow
                            disabled={hasValidCoordinates(entry.latitude, entry.longitude)}
                            withinPortal
                          >
                            <span>
                              <Menu.Item
                                leftSection={
                                  detectingTimezoneId === entry.id ? (
                                    <IconLoader2 size={14} className="animate-spin" />
                                  ) : (
                                    <IconClock size={14} />
                                  )
                                }
                                disabled={
                                  !hasValidCoordinates(entry.latitude, entry.longitude) ||
                                  detectingTimezoneId !== null
                                }
                                onClick={async () => {
                                  if (
                                    !hasValidCoordinates(entry.latitude, entry.longitude) ||
                                    detectingTimezoneId !== null
                                  ) {
                                    return;
                                  }
                                  setDetectingTimezoneId(entry.id);
                                  try {
                                    const tz = await fetchTimezoneForCoordinates(
                                      entry.latitude as number,
                                      entry.longitude as number,
                                    );
                                    if (!tz) {
                                      notifications.show(
                                        errorNotificationTemplate({
                                          title: t("SetAsTimezoneError"),
                                          description: "",
                                        }),
                                      );
                                      return;
                                    }
                                    const canonical = resolveToCanonicalTimezone(tz);
                                    onSave({
                                      addresses: [],
                                      suggestedLocation: null,
                                      timezoneOnly: true,
                                      timezone: canonical,
                                    });
                                  } catch {
                                    notifications.show(
                                      errorNotificationTemplate({
                                        title: t("SetAsTimezoneError"),
                                        description: "",
                                      }),
                                    );
                                  } finally {
                                    setDetectingTimezoneId(null);
                                  }
                                }}
                              >
                                {detectingTimezoneId === entry.id
                                  ? t("DetectingTimezone")
                                  : t("SetAsTimezone")}
                              </Menu.Item>
                            </span>
                          </Tooltip>
                        </Menu.Sub.Dropdown>
                      </Menu.Sub>
                      <Menu.Sub>
                        <Menu.Sub.Target>
                          <Tooltip
                            label={t("DisabledReasonEmptyAddress")}
                            withArrow
                            disabled={Boolean(entry.value)}
                            withinPortal
                          >
                            <span>
                              <Menu.Sub.Item
                                leftSection={<IconRoute size={14} />}
                                rightSection={<IconChevronRight size={14} />}
                                disabled={!entry.value}
                              >
                                {t("OpenInMapsAction")}
                              </Menu.Sub.Item>
                            </span>
                          </Tooltip>
                        </Menu.Sub.Target>

                        <Menu.Sub.Dropdown>
                          <Menu.Item
                            leftSection={<IconBrandGoogle size={14} />}
                            onClick={() => {
                              const query = encodeURIComponent(entry.value);
                              window.open(
                                `https://www.google.com/maps/search/?api=1&query=${query}`,
                                "_blank",
                                "noopener,noreferrer",
                              );
                            }}
                          >
                            {t("OpenInGoogleMaps")}
                          </Menu.Item>
                          <Menu.Item
                            leftSection={
                              <Image src="/icons/mapy.svg" alt="Mapy.com" width={14} height={14} />
                            }
                            onClick={() => {
                              const query = encodeURIComponent(entry.value);
                              window.open(
                                `https://mapy.com/en/zakladni?q=${query}`,
                                "_blank",
                                "noopener,noreferrer",
                              );
                            }}
                          >
                            {t("OpenInMapy")}
                          </Menu.Item>
                          <Menu.Item
                            leftSection={<IconBrandWaze size={14} />}
                            onClick={() => {
                              const query = encodeURIComponent(entry.value);
                              window.open(
                                `https://waze.com/ul?q=${query}&navigate=yes`,
                                "_blank",
                                "noopener,noreferrer",
                              );
                            }}
                          >
                            {t("OpenInWaze")}
                          </Menu.Item>
                        </Menu.Sub.Dropdown>
                      </Menu.Sub>
                      <Menu.Item
                        color="red"
                        leftSection={<IconTrash size={14} />}
                        onClick={() => {
                          const newAddresses = addresses.filter(
                            (address) => address.id !== entry.id,
                          );
                          setAddresses(newAddresses);
                          saveNow(newAddresses);
                        }}
                      >
                        {t("DeleteAction")}
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Group>
              </Stack>
            </Card>
          ))}

          {canAddMore ? (
            <Card withBorder shadow="none" p="sm" radius="md">
              <Stack gap="xs">
                <Group gap="xs" wrap="nowrap" align="center">
                  <Tooltip label={t("AddAddressAction")} withArrow>
                    <ActionIcon
                      variant="light"
                      color="green"
                      aria-label={t("AddAddressAction")}
                      onClick={() => handleCommitDraft()}
                      disabled={isSaving}
                    >
                      <IconPlus size={18} />
                    </ActionIcon>
                  </Tooltip>

                  <LocationLookupInput
                    placeholder={t("LookupPlaceholder")}
                    ariaLabel={t("LookupLabel")}
                    value={draft.value}
                    disabled={isSaving}
                    style={{ flex: "1 1 auto" }}
                    onChange={(value) =>
                      setDraft((previous) => ({
                        ...previous,
                        value,
                        suggestion: value === previous.value ? previous.suggestion : null,
                      }))
                    }
                    onSuggestionSelect={(selected) => {
                      handleCommitDraft(selected);
                    }}
                  />

                  <TypePicker
                    value={draft.type}
                    data={getTypeData()}
                    disabled={isSaving}
                    ariaLabel={t("TypeLabel")}
                    onChange={(value) => {
                      if (!value) return;
                      setDraft((previous) => ({
                        ...previous,
                        type: value as ContactAddressType,
                      }));
                    }}
                    style={{ flex: "0 0 130px" }}
                  />
                </Group>
              </Stack>
            </Card>
          ) : (
            <Text size="sm" c="dimmed">
              {t("MaxAddressesReached")}
            </Text>
          )}
        </Stack>

        <Stack gap="xs" style={{ flex: "1 1 0", minWidth: 0 }}>
          {markers.length > 0 ? (
            <PeopleMap
              markers={markers}
              center={mapCenter}
              zoom={12}
              focus={mapFocus}
              height={420}
              disableChipNavigation
            />
          ) : (
            <Card withBorder shadow="none" p="md" radius="md">
              <Text size="sm" c="dimmed">
                {t("MapEmptyState")}
              </Text>
            </Card>
          )}
        </Stack>
      </Group>
    </Stack>
  );
}
