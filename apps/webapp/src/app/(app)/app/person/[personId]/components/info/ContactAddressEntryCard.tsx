"use client";

import { geocodeSuggestionDisplayLabel } from "@bondery/helpers/geocode";
import { resolveToCanonicalTimezone } from "@bondery/helpers/locale";
import {
  ActionIconLink,
  errorNotificationTemplate,
  successNotificationTemplate,
  TypePicker,
} from "@bondery/mantine-next";
import type { ContactAddressEntry, ContactAddressType } from "@bondery/schemas";
import type { TranslateFn } from "@bondery/translations";
import { ActionIcon, Card, Group, Menu, Stack, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconAdjustments,
  IconBrandGoogle,
  IconBrandWaze,
  IconChevronRight,
  IconClock,
  IconCompass,
  IconCopy,
  IconDotsVertical,
  IconLoader2,
  IconMapPin,
  IconMapPinSearch,
  IconMapPinStar,
  IconRoute,
  IconStar,
  IconTrash,
} from "@tabler/icons-react";
import Image from "next/image";
import type { PeopleMapFocus } from "@/components/map/PeopleMap";
import { LocationLookupInput } from "@/components/shell/LocationLookupInput";
import { fetchTimezoneForCoordinates } from "@/lib/api/geocode";
import {
  applyGeocodedSuggestion,
  type ContactAddressSavePayload,
  type EditableAddress,
  hasValidCoordinates,
  toSuggestionKey,
} from "../../utils/contactAddressUtils";

interface ContactAddressEntryCardProps {
  addresses: EditableAddress[];
  detectingTimezoneId: string | null;
  entry: EditableAddress;
  getTypeData: (currentType?: ContactAddressType) => Array<{
    emoji: string;
    label: string;
    value: string;
    disabled: boolean;
  }>;
  isPreferred: boolean;
  isSaving?: boolean;
  onSave: (payload: ContactAddressSavePayload) => void;
  onSaveNow: (
    addrList: EditableAddress[],
    locationAnchor?: EditableAddress | null,
    forceLocation?: boolean,
  ) => void;
  onSetAddresses: (addresses: EditableAddress[]) => void;
  onSetDetectingTimezoneId: (id: string | null) => void;
  onSetMapFocus: (focus: PeopleMapFocus) => void;
  onSetSuggestionsByValue: React.Dispatch<
    React.SetStateAction<Record<string, ContactAddressEntry>>
  >;
  t: TranslateFn<"ContactAddress">;
}

export function ContactAddressEntryCard({
  entry,
  isPreferred,
  isSaving,
  addresses,
  getTypeData,
  detectingTimezoneId,
  onSetAddresses,
  onSetSuggestionsByValue,
  onSetMapFocus,
  onSetDetectingTimezoneId,
  onSave,
  onSaveNow,
  t,
}: ContactAddressEntryCardProps) {
  return (
    <Card
      key={entry.id}
      p="sm"
      radius="md"
      shadow="none"
      style={{
        borderColor: isPreferred ? "var(--mantine-color-orange-6)" : undefined,
      }}
      withBorder
    >
      <Stack gap="xs">
        <Group align="center" gap="xs" wrap="nowrap">
          <ActionIconLink
            ariaLabel={t("LookupLabel")}
            color={isPreferred ? "orange" : "blue"}
            disabled={!entry.value}
            href={
              entry.value
                ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(entry.value)}`
                : undefined
            }
            icon={isPreferred ? <IconMapPinStar size={18} /> : <IconMapPin size={18} />}
            variant="light"
          />

          <LocationLookupInput
            ariaLabel={t("LookupLabel")}
            disabled={isSaving}
            onChange={(value) =>
              onSetAddresses(
                addresses.map((address) =>
                  address.id === entry.id
                    ? value === address.value
                      ? address
                      : {
                          ...address,
                          addressFormatted: null,
                          addressGeocodeSource: "manual",
                          latitude: null,
                          longitude: null,
                          value,
                        }
                    : address,
                ),
              )
            }
            onSuggestionSelect={(selected) => {
              const enriched = applyGeocodedSuggestion(selected, entry.type);
              onSetSuggestionsByValue((previous) => ({
                ...previous,
                [toSuggestionKey(geocodeSuggestionDisplayLabel(selected))]: selected,
              }));
              const newAddresses = addresses.map((address) =>
                address.id === entry.id ? { ...address, ...enriched } : address,
              );
              onSetAddresses(newAddresses);
              const anchorEntry = newAddresses.find((a) => a.id === entry.id);
              onSaveNow(newAddresses, anchorEntry);
            }}
            placeholder={t("LookupPlaceholder")}
            style={{ flex: "1 1 auto" }}
            value={entry.value}
          />

          <TypePicker
            ariaLabel={t("TypeLabel")}
            data={getTypeData(entry.type)}
            disabled={isSaving}
            onChange={(value) => {
              if (!value) {
                return;
              }
              onSetAddresses(
                addresses.map((address) =>
                  address.id === entry.id
                    ? { ...address, type: value as ContactAddressType }
                    : address,
                ),
              );
            }}
            style={{ flex: "0 0 130px" }}
            value={entry.type}
          />

          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon aria-label={t("ActionsLabel")} disabled={isSaving} variant="subtle">
                <IconDotsVertical size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Tooltip
                disabled={Boolean(entry.value)}
                label={t("DisabledReasonEmptyAddress")}
                withArrow
                withinPortal
              >
                <span>
                  <Menu.Item
                    disabled={!entry.value}
                    leftSection={<IconCopy size={14} />}
                    onClick={() => {
                      void navigator.clipboard.writeText(entry.value || "");
                      notifications.show(
                        successNotificationTemplate({
                          description: t("AddressCopiedMessage"),
                          title: t("CopySuccessTitle"),
                        }),
                      );
                    }}
                  >
                    {t("CopyAction")}
                  </Menu.Item>
                </span>
              </Tooltip>
              <Tooltip
                disabled={hasValidCoordinates(entry.latitude, entry.longitude)}
                label={t("DisabledReasonNoCoordinates")}
                withArrow
                withinPortal
              >
                <span>
                  <Menu.Item
                    disabled={!hasValidCoordinates(entry.latitude, entry.longitude)}
                    leftSection={<IconMapPinSearch size={14} />}
                    onClick={() => {
                      if (!hasValidCoordinates(entry.latitude, entry.longitude)) {
                        return;
                      }

                      onSetMapFocus({
                        latitude: entry.latitude as number,
                        longitude: entry.longitude as number,
                        token: `${entry.id}-${Date.now()}`,
                        zoom: 14,
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
                    disabled={!hasValidCoordinates(entry.latitude, entry.longitude)}
                    leftSection={<IconCompass size={14} />}
                    onClick={() => {
                      const anchorValue = entry.value.trim();
                      const normalized = addresses
                        .map((a) => ({ ...a, value: a.value.trim() }))
                        .filter((a) => a.value.length > 0)
                        .map(({ id, ...rest }) => rest);
                      const locationSource =
                        normalized.find((e) => e.value === anchorValue) ?? normalized[0];
                      if (!locationSource) {
                        return;
                      }
                      onSave({
                        addresses: normalized,
                        forceLocation: true,
                        locationOnly: true,
                        suggestedLocation: {
                          latitude: locationSource.latitude,
                          location: locationSource.value,
                          longitude: locationSource.longitude,
                        },
                      });
                    }}
                  >
                    {t("SetAsLocation")}
                  </Menu.Item>

                  <Menu.Item
                    disabled={isPreferred}
                    leftSection={<IconStar size={14} />}
                    onClick={() => {
                      const selected = addresses.find((address) => address.id === entry.id);
                      if (!selected) {
                        return;
                      }
                      const newAddresses = [
                        selected,
                        ...addresses.filter((address) => address.id !== entry.id),
                      ];
                      onSetAddresses(newAddresses);
                      onSaveNow(newAddresses);
                    }}
                  >
                    {t("SetAsPreferred")}
                  </Menu.Item>

                  <Tooltip
                    disabled={hasValidCoordinates(entry.latitude, entry.longitude)}
                    label={t("DisabledReasonNoCoordinates")}
                    withArrow
                    withinPortal
                  >
                    <span>
                      <Menu.Item
                        leftSection={
                          detectingTimezoneId === entry.id ? (
                            <IconLoader2 className="animate-spin" size={14} />
                          ) : (
                            <IconClock size={14} />
                          )
                        }
                        onClick={async () => {
                          if (
                            !hasValidCoordinates(entry.latitude, entry.longitude) ||
                            detectingTimezoneId !== null
                          ) {
                            return;
                          }
                          onSetDetectingTimezoneId(entry.id);
                          try {
                            const tz = await fetchTimezoneForCoordinates(
                              entry.latitude as number,
                              entry.longitude as number,
                            );
                            if (!tz) {
                              notifications.show(
                                errorNotificationTemplate({
                                  description: "",
                                  title: t("SetAsTimezoneError"),
                                }),
                              );
                              return;
                            }
                            const canonical = resolveToCanonicalTimezone(tz);
                            onSave({
                              addresses: [],
                              suggestedLocation: null,
                              timezone: canonical,
                              timezoneOnly: true,
                            });
                          } catch {
                            notifications.show(
                              errorNotificationTemplate({
                                description: "",
                                title: t("SetAsTimezoneError"),
                              }),
                            );
                          } finally {
                            onSetDetectingTimezoneId(null);
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
                    disabled={Boolean(entry.value)}
                    label={t("DisabledReasonEmptyAddress")}
                    withArrow
                    withinPortal
                  >
                    <span>
                      <Menu.Sub.Item
                        disabled={!entry.value}
                        leftSection={<IconRoute size={14} />}
                        rightSection={<IconChevronRight size={14} />}
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
                      <Image alt="Mapy.com" height={14} src="/icons/brands/mapy.svg" width={14} />
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
                  const newAddresses = addresses.filter((address) => address.id !== entry.id);
                  onSetAddresses(newAddresses);
                  onSaveNow(newAddresses);
                }}
              >
                {t("DeleteAction")}
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Stack>
    </Card>
  );
}
