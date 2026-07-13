"use client";

import { buildManualContactAddress } from "@bondery/helpers/address";
import { formatContactName } from "@bondery/helpers/contact";
import { geocodeSuggestionDisplayLabel } from "@bondery/helpers/geocode";
import { errorNotificationTemplate, TypePicker } from "@bondery/mantine-next";
import {
  CONTACT_LIMITS,
  type Contact,
  type ContactAddressEntry,
  type ContactAddressType,
  firstZodErrorMessage,
  replaceAddressesSchema,
} from "@bondery/schemas";
import { ActionIcon, Card, Group, Stack, Text, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconPlus } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { PeopleMap, type PeopleMapFocus } from "@/components/map/PeopleMap";
import { LocationLookupInput } from "@/components/shell/LocationLookupInput";
import { useContactAddressTranslations } from "@/lib/i18n/generated/hooks";
import { ADDRESS_TYPE_OPTIONS } from "@/lib/platform/config";
import {
  applyGeocodedSuggestion,
  type ContactAddressSavePayload,
  type DraftAddress,
  type EditableAddress,
  normalizeNullableText,
  toEditableAddresses,
  toSuggestionKey,
} from "../../utils/contactAddressUtils";
import { ContactAddressEntryCard } from "./ContactAddressEntryCard";

interface ContactAddressSectionProps {
  contact: Contact;
  isSaving?: boolean;
  onSave: (payload: ContactAddressSavePayload) => void;
}

export function ContactAddressSection({ contact, isSaving, onSave }: ContactAddressSectionProps) {
  const t = useContactAddressTranslations();
  const typeOptions = useMemo(
    () =>
      ADDRESS_TYPE_OPTIONS.map((option) => ({
        emoji: option.emoji,
        label:
          option.value === "home"
            ? t("TypeHome")
            : option.value === "work"
              ? t("TypeWork")
              : t("TypeOther"),
        value: option.value,
      })),
    [t],
  );

  const [addresses, setAddresses] = useState<EditableAddress[]>(() => toEditableAddresses(contact));
  const [draft, setDraft] = useState<DraftAddress>({ suggestion: null, type: "home", value: "" });
  const [mapFocus, setMapFocus] = useState<PeopleMapFocus | null>(null);
  const [suggestionsByValue, setSuggestionsByValue] = useState<Record<string, ContactAddressEntry>>(
    {},
  );
  const [detectingTimezoneId, setDetectingTimezoneId] = useState<string | null>(null);

  const getSuggestionForValue = (value: string): ContactAddressEntry | null => {
    if (!value) {
      return null;
    }

    return suggestionsByValue[toSuggestionKey(value)] || null;
  };

  const enrichWithSuggestionIfAvailable = <T extends ContactAddressEntry>(entry: T): T => {
    if (entry.latitude !== null && entry.longitude !== null && Number.isFinite(entry.latitude)) {
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
      suggestion: null,
      type: nextDraftType as ContactAddressType,
      value: "",
    });
  }, [contact.addresses, contact.location, contact.latitude, contact.longitude, contact]);

  const getTypeData = (_currentType?: ContactAddressType) =>
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
          avatarUrl: contact.avatar,
          firstName: contact.firstName,
          id: `${entry.id}-${index}`,
          lastName: contact.lastName,
          latitude,
          longitude,
          name: `${formatContactName(contact)} · ${entry.value}`,
        };
      })
      .filter((marker): marker is NonNullable<typeof marker> => Boolean(marker));

    return addressMarkers.length > 0 ? addressMarkers : [];
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
          description: firstZodErrorMessage(parsedAddresses.error),
          title: t("SaveErrorTitle"),
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
            latitude: locationSource.latitude,
            location: locationSource.value,
            longitude: locationSource.longitude,
          }
        : null;

    onSave({
      addresses: parsedAddresses.data,
      forceLocation: forceLocation || undefined,
      suggestedLocation,
    });
  };

  const handleCommitDraft = (overrideSuggestion?: ContactAddressEntry) => {
    const normalizedValue = normalizeNullableText(
      overrideSuggestion ? geocodeSuggestionDisplayLabel(overrideSuggestion) : draft.value,
    );
    if (!normalizedValue || !canAddMore) {
      return;
    }

    const suggestion =
      overrideSuggestion ?? draft.suggestion ?? getSuggestionForValue(normalizedValue);

    const nextBase = suggestion
      ? applyGeocodedSuggestion(suggestion, draft.type)
      : buildManualContactAddress({
          label: null,
          timezone: null,
          type: draft.type,
          value: normalizedValue,
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
    setDraft({ suggestion: null, type: draft.type, value: "" });
    saveNow(newAddresses, newEntry);
  };

  return (
    <Stack gap="md">
      <Text fw={500} size="sm">
        {t("Title")}
      </Text>

      <Group align="flex-start" grow wrap="nowrap">
        <Stack gap="sm" style={{ flex: "1 1 0", minWidth: 0 }}>
          {addresses.map((entry) => (
            <ContactAddressEntryCard
              addresses={addresses}
              detectingTimezoneId={detectingTimezoneId}
              entry={entry}
              getTypeData={getTypeData}
              isPreferred={entry.id === preferredAddressId}
              isSaving={isSaving}
              key={entry.id}
              onSave={onSave}
              onSaveNow={saveNow}
              onSetAddresses={setAddresses}
              onSetDetectingTimezoneId={setDetectingTimezoneId}
              onSetMapFocus={setMapFocus}
              onSetSuggestionsByValue={setSuggestionsByValue}
              t={t}
            />
          ))}

          {canAddMore ? (
            <Card p="sm" radius="md" shadow="none" withBorder>
              <Stack gap="xs">
                <Group align="center" gap="xs" wrap="nowrap">
                  <Tooltip label={t("AddAddressAction")} withArrow>
                    <ActionIcon
                      aria-label={t("AddAddressAction")}
                      color="green"
                      disabled={isSaving}
                      onClick={() => handleCommitDraft()}
                      variant="light"
                    >
                      <IconPlus size={18} />
                    </ActionIcon>
                  </Tooltip>

                  <LocationLookupInput
                    ariaLabel={t("LookupLabel")}
                    disabled={isSaving}
                    onChange={(value) =>
                      setDraft((previous) => ({
                        ...previous,
                        suggestion: value === previous.value ? previous.suggestion : null,
                        value,
                      }))
                    }
                    onSuggestionSelect={(selected) => {
                      handleCommitDraft(selected);
                    }}
                    placeholder={t("LookupPlaceholder")}
                    style={{ flex: "1 1 auto" }}
                    value={draft.value}
                  />

                  <TypePicker
                    ariaLabel={t("TypeLabel")}
                    data={getTypeData()}
                    disabled={isSaving}
                    onChange={(value) => {
                      if (!value) {
                        return;
                      }
                      setDraft((previous) => ({
                        ...previous,
                        type: value as ContactAddressType,
                      }));
                    }}
                    style={{ flex: "0 0 130px" }}
                    value={draft.type}
                  />
                </Group>
              </Stack>
            </Card>
          ) : (
            <Text c="dimmed" size="sm">
              {t("MaxAddressesReached")}
            </Text>
          )}
        </Stack>

        <Stack gap="xs" style={{ flex: "1 1 0", minWidth: 0 }}>
          {markers.length > 0 ? (
            <PeopleMap
              center={mapCenter}
              disableChipNavigation
              focus={mapFocus}
              height={420}
              markers={markers}
              zoom={12}
            />
          ) : (
            <Card p="md" radius="md" shadow="none" withBorder>
              <Text c="dimmed" size="sm">
                {t("MapEmptyState")}
              </Text>
            </Card>
          )}
        </Stack>
      </Group>
    </Stack>
  );
}
