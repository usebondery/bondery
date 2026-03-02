"use client";

import { useEffect, useMemo, useState } from "react";
import { ActionIcon, Button, Card, Group, Menu, Stack, Text, Tooltip } from "@mantine/core";
import { useTranslations } from "next-intl";
import {
  IconBrandGoogle,
  IconBrandWaze,
  IconChevronRight,
  IconCopy,
  IconDotsVertical,
  IconMapPin,
  IconMapPinSearch,
  IconMapPinPlus,
  IconPlus,
  IconRoute,
  IconStar,
  IconTrash,
} from "@tabler/icons-react";
import Image from "next/image";
import type { Contact, ContactAddressEntry, ContactAddressType } from "@bondery/types";
import { LocationLookupInput } from "@/app/(app)/app/components/LocationLookupInput";
import type { MapSuggestionItem } from "@/app/(app)/app/map/actions";
import { ActionIconLink, TypePicker, successNotificationTemplate } from "@bondery/mantine-next";
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
      place: string;
      latitude: number | null;
      longitude: number | null;
    } | null;
  }) => void;
}

interface EditableAddress extends ContactAddressEntry {
  id: string;
}

interface DraftAddress {
  type: ContactAddressType;
  value: string;
  suggestion: MapSuggestionItem | null;
}

function deriveGranularity(
  type: string | null | undefined,
): "address" | "city" | "state" | "country" {
  if (type === "regional.country") return "country";
  if (type === "regional.region") return "state";
  if (type === "regional.municipality" || type === "regional.municipality_part") return "city";
  return "address";
}

function pickByType(
  entries: Array<{ type?: string; name?: string; isoCode?: string }>,
  wantedType: string,
): { type?: string; name?: string; isoCode?: string } | null {
  const match = entries.find((entry) => entry.type === wantedType);
  return match || null;
}

function pickLastByType(
  entries: Array<{ type?: string; name?: string; isoCode?: string }>,
  wantedType: string,
): { type?: string; name?: string; isoCode?: string } | null {
  const matches = entries.filter((entry) => entry.type === wantedType);
  if (matches.length === 0) return null;
  return matches[matches.length - 1] || null;
}

function normalizeNullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isValidCoordinatePair(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function isWithinCzechiaBounds(latitude: number, longitude: number): boolean {
  return latitude >= 48.4 && latitude <= 51.2 && longitude >= 12.0 && longitude <= 19.0;
}

function normalizeCoordinatePair(
  latitude: number | null,
  longitude: number | null,
  countryCode?: string | null,
): { latitude: number | null; longitude: number | null } {
  if (latitude === null || longitude === null) {
    return { latitude: null, longitude: null };
  }

  const directValid = isValidCoordinatePair(latitude, longitude);
  const swappedValid = isValidCoordinatePair(longitude, latitude);

  if (!directValid && !swappedValid) {
    return { latitude: null, longitude: null };
  }

  const normalizedCountryCode = String(countryCode || "").toUpperCase();
  if (normalizedCountryCode === "CZ" && directValid && swappedValid) {
    const directInside = isWithinCzechiaBounds(latitude, longitude);
    const swappedInside = isWithinCzechiaBounds(longitude, latitude);

    if (!directInside && swappedInside) {
      return { latitude: longitude, longitude: latitude };
    }

    if (directInside && !swappedInside) {
      return { latitude, longitude };
    }
  }

  if (directValid) {
    return { latitude, longitude };
  }

  if (swappedValid) {
    return { latitude: longitude, longitude: latitude };
  }

  return { latitude: null, longitude: null };
}

function toAddressFromSuggestion(
  item: MapSuggestionItem,
  type: ContactAddressType,
): Omit<EditableAddress, "id"> {
  const municipality = pickByType(item.regionalStructure, "regional.municipality");
  const municipalityPart = pickByType(item.regionalStructure, "regional.municipality_part");
  const region = pickLastByType(item.regionalStructure, "regional.region");
  const countryEntry = pickByType(item.regionalStructure, "regional.country");
  const normalizedCoordinates = normalizeCoordinatePair(
    item.position.lat,
    item.position.lon,
    countryEntry?.isoCode,
  );

  return {
    type,
    value: item.label,
    latitude: normalizedCoordinates.latitude,
    longitude: normalizedCoordinates.longitude,
    addressLine1: item.type === "regional.address" ? item.name : null,
    addressLine2: null,
    addressCity: (municipality?.name || municipalityPart?.name || null) as string | null,
    addressPostalCode: item.zip || null,
    addressState: (region?.name || null) as string | null,
    addressStateCode: null,
    addressCountry: (countryEntry?.name || null) as string | null,
    addressCountryCode: (countryEntry?.isoCode || null) as string | null,
    addressGranularity: deriveGranularity(item.type),
    addressFormatted: item.label,
    addressGeocodeSource: "mapy.com",
  };
}

function toDefaultAddressType(index: number): ContactAddressType {
  if (index === 0) return "home";
  if (index === 1) return "work";
  return "other";
}

function normalizeAddressTypes(entries: ContactAddressEntry[]): ContactAddressEntry[] {
  const availableTypes: ContactAddressType[] = ["home", "work", "other"];
  const usedTypes = new Set<ContactAddressType>();

  return entries.slice(0, 3).map((entry, index) => {
    const preferredType = (entry.type || toDefaultAddressType(index)) as ContactAddressType;

    if (!usedTypes.has(preferredType)) {
      usedTypes.add(preferredType);
      return {
        ...entry,
        type: preferredType,
      };
    }

    const fallbackType = availableTypes.find((candidate) => !usedTypes.has(candidate));
    const resolvedType = fallbackType || preferredType;
    usedTypes.add(resolvedType);

    return {
      ...entry,
      type: resolvedType,
    };
  });
}

function toEditableAddresses(contact: Contact): EditableAddress[] {
  const existing = Array.isArray(contact.addresses)
    ? (contact.addresses as ContactAddressEntry[])
    : [];

  if (existing.length > 0) {
    return normalizeAddressTypes(existing).map((address, index) => ({
      ...address,
      ...normalizeCoordinatePair(address.latitude, address.longitude, address.addressCountryCode),
      id: `${address.type}-${index}`,
      value:
        address.value || address.addressFormatted || address.addressLine1 || contact.place || "",
      type: address.type,
    }));
  }

  const fallbackValue =
    contact.addressFormatted || contact.addressLine1 || contact.place || contact.addressCity || "";

  if (!fallbackValue) {
    return [];
  }

  const normalizedFallbackCoordinates = normalizeCoordinatePair(
    contact.latitude,
    contact.longitude,
    contact.addressCountryCode,
  );

  return [
    {
      id: "home-0",
      type: "home",
      value: fallbackValue,
      latitude: normalizedFallbackCoordinates.latitude,
      longitude: normalizedFallbackCoordinates.longitude,
      addressLine1: contact.addressLine1,
      addressLine2: contact.addressLine2,
      addressCity: contact.addressCity,
      addressPostalCode: contact.addressPostalCode,
      addressState: contact.addressState,
      addressStateCode: contact.addressStateCode,
      addressCountry: contact.addressCountry,
      addressCountryCode: contact.addressCountryCode,
      addressGranularity: contact.addressGranularity,
      addressFormatted: contact.addressFormatted,
      addressGeocodeSource: contact.addressGeocodeSource,
    },
  ];
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
  const [suggestionsByValue, setSuggestionsByValue] = useState<Record<string, MapSuggestionItem>>(
    {},
  );

  const toSuggestionKey = (value: string) => value.trim().toLowerCase();

  const getSuggestionForValue = (value: string): MapSuggestionItem | null => {
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

    const enriched = toAddressFromSuggestion(suggestion, entry.type);
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
  }, [
    contact.addresses,
    contact.place,
    contact.addressLine1,
    contact.addressLine2,
    contact.addressCity,
    contact.addressPostalCode,
    contact.addressState,
    contact.addressStateCode,
    contact.addressCountry,
    contact.addressCountryCode,
    contact.addressGranularity,
    contact.addressFormatted,
    contact.addressGeocodeSource,
    contact.latitude,
    contact.longitude,
  ]);

  const usedTypes = new Set(addresses.map((entry) => entry.type));

  const getTypeData = (currentType?: ContactAddressType) =>
    typeOptions.map((option) => ({
      ...option,
      disabled: usedTypes.has(option.value as ContactAddressType) && option.value !== currentType,
    }));

  const canAddMore = addresses.length < 3;

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

  const addDraftAddress = () => {
    const normalizedValue = normalizeNullableText(draft.value);
    if (!normalizedValue || !canAddMore || usedTypes.has(draft.type)) {
      return;
    }

    const fallbackSuggestion = getSuggestionForValue(normalizedValue);

    const nextBase =
      draft.suggestion || fallbackSuggestion
        ? toAddressFromSuggestion(
            (draft.suggestion || fallbackSuggestion) as MapSuggestionItem,
            draft.type,
          )
        : {
            type: draft.type,
            value: normalizedValue,
            latitude: null,
            longitude: null,
            addressLine1: null,
            addressLine2: null,
            addressCity: null,
            addressPostalCode: null,
            addressState: null,
            addressStateCode: null,
            addressCountry: null,
            addressCountryCode: null,
            addressGranularity: "address" as const,
            addressFormatted: null,
            addressGeocodeSource: "manual",
          };

    const nextAddresses = [
      ...addresses,
      enrichWithSuggestionIfAvailable({
        ...nextBase,
        id: `${draft.type}-${Date.now()}`,
        value: normalizedValue,
      }),
    ];

    setAddresses(nextAddresses);

    const nextDraftType =
      ["home", "work", "other"].find(
        (candidate) => !nextAddresses.some((entry) => entry.type === candidate),
      ) || draft.type;

    setDraft({
      type: nextDraftType as ContactAddressType,
      value: "",
      suggestion: null,
    });
  };

  const handleSave = () => {
    const pendingValue = normalizeNullableText(draft.value);
    const canIncludePendingDraft =
      Boolean(pendingValue) && addresses.length < 3 && !usedTypes.has(draft.type);

    const pendingDraftAddress: EditableAddress | null = canIncludePendingDraft
      ? {
          ...(draft.suggestion || getSuggestionForValue(pendingValue as string)
            ? toAddressFromSuggestion(
                (draft.suggestion ||
                  getSuggestionForValue(pendingValue as string)) as MapSuggestionItem,
                draft.type,
              )
            : {
                type: draft.type,
                value: pendingValue as string,
                latitude: null,
                longitude: null,
                addressLine1: null,
                addressLine2: null,
                addressCity: null,
                addressPostalCode: null,
                addressState: null,
                addressStateCode: null,
                addressCountry: null,
                addressCountryCode: null,
                addressGranularity: "address" as const,
                addressFormatted: null,
                addressGeocodeSource: "manual",
              }),
          id: `${draft.type}-${Date.now()}`,
          value: pendingValue as string,
        }
      : null;

    const addressesToSave = pendingDraftAddress ? [...addresses, pendingDraftAddress] : addresses;

    if (pendingDraftAddress) {
      setAddresses(addressesToSave);
      setDraft((previous) => ({ ...previous, value: "", suggestion: null }));
    }

    const normalized = addressesToSave
      .map((entry) => ({
        ...entry,
        value: entry.value.trim(),
      }))
      .filter((entry) => entry.value.length > 0)
      .map((entry) => enrichWithSuggestionIfAvailable(entry))
      .map(({ id, ...rest }) => rest);

    const locationSource = normalized[0] || null;

    const suggestedLocation = locationSource
      ? {
          place: locationSource.value,
          latitude: locationSource.latitude,
          longitude: locationSource.longitude,
        }
      : null;

    onSave({
      addresses: normalized,
      suggestedLocation,
    });
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
                        <IconMapPinPlus size={18} />
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
                      const enriched = toAddressFromSuggestion(selected, entry.type);
                      setSuggestionsByValue((previous) => ({
                        ...previous,
                        [toSuggestionKey(selected.label)]: selected,
                      }));
                      setAddresses((previous) =>
                        previous.map((address) =>
                          address.id === entry.id
                            ? {
                                ...address,
                                ...enriched,
                              }
                            : address,
                        ),
                      );
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
                      <Tooltip
                        label={t("DisabledReasonAlreadyPreferred")}
                        withArrow
                        disabled={entry.id !== preferredAddressId}
                        withinPortal
                      >
                        <span>
                          <Menu.Item
                            leftSection={<IconStar size={14} />}
                            disabled={entry.id === preferredAddressId}
                            onClick={() =>
                              setAddresses((previous) => {
                                const selected = previous.find(
                                  (address) => address.id === entry.id,
                                );
                                if (!selected) return previous;
                                return [
                                  selected,
                                  ...previous.filter((address) => address.id !== entry.id),
                                ];
                              })
                            }
                          >
                            {t("SetAsPreferred")}
                          </Menu.Item>
                        </span>
                      </Tooltip>
                      <Menu.Item
                        color="red"
                        leftSection={<IconTrash size={14} />}
                        onClick={() =>
                          setAddresses((previous) =>
                            previous.filter((address) => address.id !== entry.id),
                          )
                        }
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
                      onClick={addDraftAddress}
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
                      setSuggestionsByValue((previous) => ({
                        ...previous,
                        [toSuggestionKey(selected.label)]: selected,
                      }));
                      setDraft((previous) => ({
                        ...previous,
                        value: selected.label,
                        suggestion: selected,
                      }));
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

          <Group justify="flex-end">
            <Button onClick={handleSave} loading={isSaving} disabled={isSaving}>
              {t("SaveAction")}
            </Button>
          </Group>
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
