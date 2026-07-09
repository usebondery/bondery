"use client";

import { getUserFacingError } from "@bondery/helpers/api";
import { resolveToCanonicalTimezone } from "@bondery/helpers/locale";
import {
  errorNotificationTemplate,
  ModalTitle,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import type { Contact, ContactAddressEntry } from "@bondery/schemas";
import { Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconClock, IconMapPin } from "@tabler/icons-react";
import type { Dispatch, SetStateAction } from "react";
import { openStandardConfirmModal } from "@/components/modals/openStandardConfirmModal";
import { fetchTimezoneForCoordinates } from "@/lib/api/geocode";
import type { useUpdateContactMutation } from "@/lib/query/hooks/useContacts";
import type { ContactAddressSavePayload } from "../utils/contactAddressUtils";

type UpdateContactMutation = ReturnType<typeof useUpdateContactMutation>;

interface UsePersonAddressSaveOptions {
  contact: Contact | null;
  handleContactFieldSave: (field: string, value: string) => Promise<void>;
  personId: string;
  setContact: Dispatch<SetStateAction<Contact | null>>;
  setSavingField: Dispatch<SetStateAction<string | null>>;
  tAddress: (key: string) => string;
  tCommon: (key: string) => string;
  updateContactMutation: UpdateContactMutation;
}

export function usePersonAddressSave({
  contact,
  personId,
  setContact,
  setSavingField,
  tAddress,
  tCommon,
  updateContactMutation,
  handleContactFieldSave,
}: UsePersonAddressSaveOptions) {
  const handleSaveAddress = async (payload: ContactAddressSavePayload) => {
    if (!contact || !personId) {
      return;
    }

    if (payload.timezoneOnly && payload.timezone) {
      await handleContactFieldSave("timezone", payload.timezone);
      return;
    }

    setSavingField("address");

    if (payload.locationOnly && payload.suggestedLocation) {
      const addressEntries = Array.isArray(payload.addresses)
        ? payload.addresses.filter(
            (entry): entry is ContactAddressEntry =>
              typeof entry === "object" && entry !== null && !Array.isArray(entry),
          )
        : [];
      const preferredAddress =
        addressEntries.length > 0
          ? addressEntries.find((entry) => entry.type === "home") || addressEntries[0]
          : null;
      const _locationAddress =
        addressEntries.find((entry) => entry.value === payload.suggestedLocation?.location) ??
        preferredAddress;
      try {
        await updateContactMutation.mutateAsync({
          latitude: payload.suggestedLocation.latitude,
          location: payload.suggestedLocation.location,
          longitude: payload.suggestedLocation.longitude,
        });
        setContact((previous) => {
          if (!previous) {
            return previous;
          }
          return {
            ...previous,
            latitude: payload.suggestedLocation?.latitude ?? null,
            location: payload.suggestedLocation?.location ?? null,
            longitude: payload.suggestedLocation?.longitude ?? null,
          };
        });
        notifications.show(
          successNotificationTemplate({
            description: tAddress("LocationUpdateSuccessMessage"),
            title: tAddress("LocationUpdateSuccessTitle"),
          }),
        );

        const lat = payload.suggestedLocation?.latitude;
        const lon = payload.suggestedLocation?.longitude;
        if (lat != null && lon != null) {
          openStandardConfirmModal({
            cancelLabel: tAddress("LocationUpdateCancel"),
            confirmLabel: tAddress("LocationUpdateConfirm"),
            message: <Text size="sm">{tAddress("TimezoneUpdateModalMessage")}</Text>,
            onConfirm: async () => {
              setSavingField("address");
              try {
                const rawTz = await fetchTimezoneForCoordinates(lat, lon).catch(() => null);
                const canonical = rawTz ? resolveToCanonicalTimezone(rawTz) : null;
                if (!canonical) {
                  notifications.show(
                    errorNotificationTemplate({
                      description: "",
                      title: tAddress("SetAsTimezoneError"),
                    }),
                  );
                  return;
                }
                await updateContactMutation.mutateAsync({ timezone: canonical });
                setContact((previous) =>
                  previous ? { ...previous, timezone: canonical } : previous,
                );
                notifications.show(
                  successNotificationTemplate({
                    description: "",
                    title: tAddress("SetAsTimezoneSuccess"),
                  }),
                );
              } catch {
                notifications.show(
                  errorNotificationTemplate({
                    description: "",
                    title: tAddress("SetAsTimezoneError"),
                  }),
                );
              } finally {
                setSavingField(null);
              }
            },
            title: (
              <ModalTitle
                icon={<IconClock size={18} />}
                text={tAddress("TimezoneUpdateModalTitle")}
              />
            ),
          });
        }
      } catch {
        notifications.show(
          errorNotificationTemplate({
            description: tAddress("LocationUpdateErrorMessage"),
            title: tAddress("LocationUpdateErrorTitle"),
          }),
        );
      } finally {
        setSavingField(null);
      }
      return;
    }

    try {
      await updateContactMutation.mutateAsync({ addresses: payload.addresses });

      const addressEntries = Array.isArray(payload.addresses)
        ? payload.addresses.filter(
            (entry): entry is ContactAddressEntry =>
              typeof entry === "object" && entry !== null && !Array.isArray(entry),
          )
        : [];

      const preferredAddress =
        addressEntries.length > 0
          ? addressEntries.find((entry) => entry.type === "home") || addressEntries[0]
          : null;

      const _locationAddress = payload.suggestedLocation
        ? (addressEntries.find((entry) => entry.value === payload.suggestedLocation?.location) ??
          preferredAddress)
        : preferredAddress;

      setContact((previous) => {
        if (!previous) {
          return previous;
        }
        return {
          ...previous,
          addresses: payload.addresses,
        };
      });

      notifications.show(
        successNotificationTemplate({
          description: tAddress("SaveSuccessMessage"),
          title: tAddress("SaveSuccessTitle"),
        }),
      );

      if (payload.suggestedLocation) {
        const applyLocationUpdate = async () => {
          setSavingField("address");
          try {
            const lat = payload.suggestedLocation?.latitude;
            const lon = payload.suggestedLocation?.longitude;

            let canonicalTimezone: string | null = null;
            if (lat != null && lon != null) {
              const rawTz = await fetchTimezoneForCoordinates(lat, lon).catch(() => null);
              if (rawTz) {
                canonicalTimezone = resolveToCanonicalTimezone(rawTz);
              }
            }

            const locationPatch: Record<string, unknown> = {
              latitude: lat,
              location: payload.suggestedLocation?.location,
              longitude: lon,
            };
            if (canonicalTimezone) {
              locationPatch.timezone = canonicalTimezone;
            }

            await updateContactMutation.mutateAsync(locationPatch);
            setContact((previous) => {
              if (!previous) {
                return previous;
              }
              return {
                ...previous,
                latitude: payload.suggestedLocation?.latitude ?? null,
                location: payload.suggestedLocation?.location ?? null,
                longitude: payload.suggestedLocation?.longitude ?? null,
                ...(canonicalTimezone ? { timezone: canonicalTimezone } : {}),
              };
            });
            notifications.show(
              successNotificationTemplate({
                description: tAddress("LocationUpdateSuccessMessage"),
                title: tAddress("LocationUpdateSuccessTitle"),
              }),
            );
          } catch {
            notifications.show(
              errorNotificationTemplate({
                description: tAddress("LocationUpdateErrorMessage"),
                title: tAddress("LocationUpdateErrorTitle"),
              }),
            );
          } finally {
            setSavingField(null);
          }
        };

        if (payload.forceLocation) {
          void applyLocationUpdate();
        } else {
          openStandardConfirmModal({
            cancelLabel: tAddress("LocationUpdateCancel"),
            confirmLabel: tAddress("LocationUpdateConfirm"),
            message: <Text size="sm">{tAddress("LocationUpdateModalMessage")}</Text>,
            onConfirm: applyLocationUpdate,
            title: (
              <ModalTitle
                icon={<IconMapPin size={18} />}
                text={tAddress("LocationUpdateModalTitle")}
              />
            ),
          });
        }
      }
    } catch (error) {
      const message = getUserFacingError(error, tCommon);
      notifications.show(
        errorNotificationTemplate({
          description: message,
          title: tAddress("SaveErrorTitle"),
        }),
      );
    } finally {
      setSavingField(null);
    }
  };

  return { handleSaveAddress };
}
