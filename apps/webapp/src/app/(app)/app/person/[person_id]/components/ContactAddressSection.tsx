"use client";

import { useEffect, useMemo, useState } from "react";
import { ActionIcon, Button, Card, Group, Menu, Stack, Text, Tooltip } from "@mantine/core";
import { useTranslations } from "next-intl";
import { IconDotsVertical, IconMapPin, IconPlus, IconTrash } from "@tabler/icons-react";
import type { Contact, ContactAddressEntry, ContactAddressType } from "@bondery/types";
import { LocationLookupInput } from "@/app/(app)/app/components/LocationLookupInput";
import type { MapSuggestionItem } from "@/app/(app)/app/map/actions";
import { TypePicker } from "@/app/(app)/app/components/shared/TypePicker";
import { ActionIconLink } from "@bondery/mantine-next";
import { ADDRESS_TYPE_OPTIONS } from "@/lib/config";

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

function toAddressFromSuggestion(
  item: MapSuggestionItem,
  type: ContactAddressType,
): Omit<EditableAddress, "id"> {
  const municipality = pickByType(item.regionalStructure, "regional.municipality");
  const municipalityPart = pickByType(item.regionalStructure, "regional.municipality_part");
  const region = pickLastByType(item.regionalStructure, "regional.region");
  const countryEntry = pickByType(item.regionalStructure, "regional.country");

  return {
    type,
    value: item.label,
    latitude: item.position.lat,
    longitude: item.position.lon,
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

function toEditableAddresses(contact: Contact): EditableAddress[] {
  const existing = Array.isArray(contact.addresses)
    ? (contact.addresses as ContactAddressEntry[])
    : [];

  if (existing.length > 0) {
    return existing.slice(0, 3).map((address, index) => ({
      ...address,
      id: `${address.type}-${index}`,
      value:
        address.value || address.addressFormatted || address.addressLine1 || contact.place || "",
      type: address.type || toDefaultAddressType(index),
    }));
  }

  const fallbackValue =
    contact.addressFormatted || contact.addressLine1 || contact.place || contact.addressCity || "";

  if (!fallbackValue) {
    return [];
  }

  return [
    {
      id: "home-0",
      type: "home",
      value: fallbackValue,
      latitude: contact.latitude,
      longitude: contact.longitude,
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

  useEffect(() => {
    const next = toEditableAddresses(contact);
    setAddresses(next);
    setDraft({
      type:
        next.length === 0 ? "home" : next.some((entry) => entry.type === "home") ? "work" : "home",
      value: "",
      suggestion: null,
    });
  }, [contact]);

  const usedTypes = new Set(addresses.map((entry) => entry.type));

  const getTypeData = (currentType?: ContactAddressType) =>
    typeOptions.map((option) => ({
      ...option,
      disabled: usedTypes.has(option.value as ContactAddressType) && option.value !== currentType,
    }));

  const canAddMore = addresses.length < 3;

  const addDraftAddress = () => {
    const normalizedValue = normalizeNullableText(draft.value);
    if (!normalizedValue || !canAddMore || usedTypes.has(draft.type)) {
      return;
    }

    const nextBase = draft.suggestion
      ? toAddressFromSuggestion(draft.suggestion, draft.type)
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
      {
        ...nextBase,
        id: `${draft.type}-${Date.now()}`,
        value: normalizedValue,
      },
    ];

    setAddresses(nextAddresses);

    const nextDraftType =
      ["home", "work", "other"].find(
        (candidate) => !nextAddresses.some((entry) => entry.type === candidate),
      ) || "home";

    setDraft({
      type: nextDraftType as ContactAddressType,
      value: "",
      suggestion: null,
    });
  };

  const handleSave = () => {
    const pendingValue = normalizeNullableText(draft.value);
    const canIncludePendingDraft =
      Boolean(pendingValue) && !usedTypes.has(draft.type) && addresses.length < 3;

    const pendingDraftAddress: EditableAddress | null = canIncludePendingDraft
      ? {
          ...(draft.suggestion
            ? toAddressFromSuggestion(draft.suggestion, draft.type)
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
      .map(({ id, ...rest }) => rest);

    const locationSource =
      normalized.find((entry) => entry.type === "home") || normalized[0] || null;

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

      {addresses.map((entry) => (
        <Card key={entry.id} withBorder p="sm" radius="md">
          <Stack gap="xs">
            <Group gap="xs" wrap="nowrap" align="center">
              <ActionIconLink
                variant="light"
                color="blue"
                href={
                  entry.value
                    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(entry.value)}`
                    : undefined
                }
                disabled={!entry.value}
                ariaLabel={t("LookupLabel")}
              >
                <IconMapPin size={18} />
              </ActionIconLink>

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
                        ? {
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
                  <ActionIcon variant="subtle" aria-label={t("ActionsLabel")} disabled={isSaving}>
                    <IconDotsVertical size={16} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
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

      {/*
      {canAddMore ? (
        <Card withBorder p="sm" radius="md">
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
                    suggestion: null,
                  }))
                }
                onSuggestionSelect={(selected) =>
                  setDraft((previous) => ({
                    ...previous,
                    value: selected.label,
                    suggestion: selected,
                  }))
                }
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
      */}

      <Group justify="flex-end">
        <Button onClick={handleSave} loading={isSaving} disabled={isSaving}>
          {t("SaveAction")}
        </Button>
      </Group>
    </Stack>
  );
}
