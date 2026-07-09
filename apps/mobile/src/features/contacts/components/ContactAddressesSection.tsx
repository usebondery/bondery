import { countryCodeToFlagEmoji } from "@bondery/helpers/locale";
import type { ContactAddressEntry } from "@bondery/schemas";
import {
  IconCopy,
  IconMapPin,
  IconMapPinPlus,
  IconPencil,
  IconStar,
  IconTrash,
} from "@tabler/icons-react-native";
import { useState } from "react";
import { Linking, Platform, StyleSheet, Text, View } from "react-native";
import { copyToClipboard } from "../../../lib/clipboard/copyToClipboard";
import { LIMITS } from "../../../lib/config";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { useAppToast } from "../../../lib/toast/useAppToast";
import { MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { formatAddressCardLines, formatDisplayAddress } from "../contactUtils";
import { ContactChannelRow } from "./ContactChannelRow";
import { ContactDetailSectionHeader } from "./ContactDetailSectionHeader";
import { contactDetailStyles } from "./contactDetailStyles";
import { EditAddressSheet } from "./EditAddressSheet";

type SheetState =
  | { open: false }
  | { open: true; mode: "add" }
  | { open: true; mode: "edit"; index: number; entry: ContactAddressEntry };

interface ContactAddressesSectionProps {
  addresses: ContactAddressEntry[];
  onSaveAddresses: (addresses: ContactAddressEntry[]) => Promise<void>;
}

function buildNativeMapsUrl(address: ContactAddressEntry): string {
  const label = formatDisplayAddress(address);
  const { latitude: lat, longitude: lon } = address;
  const hasCoords = lat != null && lon != null && !Number.isNaN(lat) && !Number.isNaN(lon);

  if (Platform.OS === "ios") {
    return hasCoords
      ? `maps:?ll=${lat},${lon}&q=${encodeURIComponent(label)}`
      : `maps:?q=${encodeURIComponent(label)}`;
  }

  return hasCoords
    ? `geo:${lat},${lon}?q=${encodeURIComponent(label)}`
    : `geo:0,0?q=${encodeURIComponent(label)}`;
}

function formatAddressAccessibilityLabel(lines: ReturnType<typeof formatAddressCardLines>): string {
  return [lines.streetLine, lines.cityLine, lines.countryName].filter(Boolean).join(", ");
}

export function ContactAddressesSection({
  addresses,
  onSaveAddresses,
}: ContactAddressesSectionProps) {
  const colors = useMobileThemeColors();
  const t = useMobileTranslations();
  const { showToast } = useAppToast();
  const [sheet, setSheet] = useState<SheetState>({ open: false });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canAdd = addresses.length < LIMITS.maxAddresses;

  function openAddSheet() {
    setSheet({ mode: "add", open: true });
  }

  function openEditSheet(index: number, entry: ContactAddressEntry) {
    setSheet({ entry, index, mode: "edit", open: true });
  }

  function closeSheet() {
    setSheet({ open: false });
  }

  async function handleSave(entry: ContactAddressEntry) {
    if (!sheet.open) {
      return;
    }

    setIsSubmitting(true);
    try {
      let nextAddresses: ContactAddressEntry[];

      if (sheet.mode === "add") {
        nextAddresses = [...addresses, entry];
      } else {
        nextAddresses = addresses.map((a, i) => (i === sheet.index ? entry : a));
      }

      await onSaveAddresses(nextAddresses);
      closeSheet();
    } catch (err) {
      showToast({
        description:
          err instanceof Error ? err.message : t("SaveErrorMessage", { ns: "ContactAddress" }),
        headline: t("SaveErrorTitle", { ns: "ContactAddress" }),
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(index: number) {
    setIsSubmitting(true);
    try {
      const nextAddresses = addresses.filter((_, i) => i !== index);
      await onSaveAddresses(nextAddresses);
      closeSheet();
    } catch (err) {
      showToast({
        description:
          err instanceof Error ? err.message : t("SaveErrorMessage", { ns: "ContactAddress" }),
        headline: t("SaveErrorTitle", { ns: "ContactAddress" }),
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSetPreferred(index: number) {
    if (index === 0) {
      return;
    }
    const preferred = addresses[index];
    const rest = addresses.filter((_, i) => i !== index);
    const nextAddresses = [preferred, ...rest];

    try {
      await onSaveAddresses(nextAddresses);
    } catch (err) {
      showToast({
        description:
          err instanceof Error ? err.message : t("SaveErrorMessage", { ns: "ContactAddress" }),
        headline: t("SaveErrorTitle", { ns: "ContactAddress" }),
        type: "error",
      });
    }
  }

  function openInMaps(address: ContactAddressEntry) {
    const url = buildNativeMapsUrl(address);
    Linking.openURL(url).catch(() => {
      showToast({
        description: "Could not open maps",
        headline: t("feedback.errorTitle", { ns: "common" }),
        type: "error",
      });
    });
  }

  async function copyAddress(address: ContactAddressEntry) {
    const label = formatDisplayAddress(address);
    if (!label) {
      return;
    }

    await copyToClipboard(label, showToast, {
      errorDescription: "Could not copy address",
      errorHeadline: t("feedback.errorTitle", { ns: "common" }),
      successDescription: label,
      successHeadline: t("CopySuccessTitle", { ns: "ContactAddress" }),
    });
  }

  const sheetEntry = sheet.open && sheet.mode === "edit" ? sheet.entry : null;
  const sheetIndex = sheet.open && sheet.mode === "edit" ? sheet.index : -1;

  return (
    <View style={contactDetailStyles.section}>
      <ContactDetailSectionHeader
        action={
          canAdd
            ? {
                accessibilityLabel: t("AddAddressAction", { ns: "ContactAddress" }),
                icon: <IconMapPinPlus size={16} stroke={colors.primary} />,
                label: t("Add", { ns: "ContactInfo" }),
                onPress: openAddSheet,
              }
            : undefined
        }
        titleKey="Title"
        titleNamespace="ContactAddress"
      />

      {addresses.length === 0 ? (
        <View
          style={[
            contactDetailStyles.card,
            styles.emptyCard,
            { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {t("NoAddresses", { ns: "ContactAddress" })}
          </Text>
        </View>
      ) : (
        addresses.map((address, index) => {
          const cardLines = formatAddressCardLines(address);
          const accessibilityAddressLabel = formatAddressAccessibilityLabel(cardLines);
          const isPreferred = index === 0;

          const menuItems = [
            {
              icon: <IconMapPin size={16} stroke={colors.iconPrimary} />,
              id: "native-maps",
              label: t("OpenInMapsAction", { ns: "ContactAddress" }),
              onPress: () => openInMaps(address),
            },
            {
              icon: <IconPencil size={16} stroke={colors.iconPrimary} />,
              id: "edit",
              label: t("EditAction", { ns: "ContactAddress" }),
              onPress: () => openEditSheet(index, address),
            },
            {
              disabled: isPreferred,
              hint: isPreferred
                ? t("DisabledReasonAlreadyPreferred", { ns: "ContactAddress" })
                : undefined,
              icon: (
                <IconStar size={16} stroke={isPreferred ? colors.textMuted : colors.iconPrimary} />
              ),
              id: "set-preferred",
              label: t("SetAsPreferred", { ns: "ContactAddress" }),
              onPress: () => void handleSetPreferred(index),
            },
            {
              icon: <IconCopy size={16} stroke={colors.iconPrimary} />,
              id: "copy",
              label: t("CopyAction", { ns: "ContactAddress" }),
              onPress: () => void copyAddress(address),
            },
            {
              icon: <IconTrash size={16} stroke={colors.dangerAccent} />,
              id: "delete",
              label: t("DeleteAction", { ns: "ContactAddress" }),
              onPress: () => void handleDelete(index),
              tone: "danger" as const,
            },
          ];

          return (
            <ContactChannelRow
              accessibilityHint="Tap to open in maps"
              accessibilityLabel={`${accessibilityAddressLabel}${isPreferred ? `, ${t("Preferred", { ns: "ContactInfo" })}` : ""}`}
              channelIcon={<IconMapPin size={16} stroke={colors.iconSecondary} />}
              isPreferred={isPreferred}
              key={address.formatted || address.value}
              labelContent={
                <View style={styles.addressLines}>
                  {cardLines.streetLine ? (
                    <Text style={[contactDetailStyles.cardPrimary, { color: colors.textPrimary }]}>
                      {cardLines.streetLine}
                    </Text>
                  ) : null}
                  {cardLines.cityLine ? (
                    <Text style={[styles.addressSecondary, { color: colors.textPrimary }]}>
                      {cardLines.cityLine}
                    </Text>
                  ) : null}
                  {cardLines.countryName ? (
                    <View style={styles.countryRow}>
                      {cardLines.countryCode ? (
                        <Text style={styles.countryFlag}>
                          {countryCodeToFlagEmoji(cardLines.countryCode)}
                        </Text>
                      ) : null}
                      <Text style={[styles.addressSecondary, { color: colors.textPrimary }]}>
                        {cardLines.countryName}
                      </Text>
                    </View>
                  ) : null}
                </View>
              }
              menuAccessibilityLabel={t("ActionsLabel", { ns: "ContactAddress" })}
              menuItems={menuItems}
              onLongPress={() => void copyAddress(address)}
              onPress={() => openInMaps(address)}
              primaryLabel={accessibilityAddressLabel || address.value}
              type={address.type}
              typeNamespace="ContactAddress"
            />
          );
        })
      )}

      <EditAddressSheet
        initialEntry={sheetEntry}
        isSubmitting={isSubmitting}
        mode={sheet.open ? sheet.mode : "add"}
        onCancel={closeSheet}
        onDelete={
          sheet.open && sheet.mode === "edit" ? () => void handleDelete(sheetIndex) : undefined
        }
        onOpenChange={(open) => {
          if (!open) {
            closeSheet();
          }
        }}
        onSave={handleSave}
        open={sheet.open}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  addressLines: {
    gap: 2,
  },
  addressSecondary: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.medium,
    lineHeight: 20,
  },
  countryFlag: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.bodyLarge,
    lineHeight: 20,
  },
  countryRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  emptyText: {
    fontSize: 14,
  },
});
