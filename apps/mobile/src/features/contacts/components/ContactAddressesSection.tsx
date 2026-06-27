import { useState } from "react";
import { Linking, Platform, StyleSheet, Text, View } from "react-native";
import {
  IconCopy,
  IconMapPin,
  IconMapPinPlus,
  IconPencil,
  IconStar,
  IconTrash,
} from "@tabler/icons-react-native";
import { countryCodeToFlagEmoji } from "@bondery/helpers/locale";
import type { ContactAddressEntry } from "@bondery/schemas";
import { copyToClipboard } from "../../../lib/clipboard/copyToClipboard";
import { LIMITS } from "../../../lib/config";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { useAppToast } from "../../../lib/toast/useAppToast";
import { MOBILE_TYPOGRAPHY } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { formatAddressCardLines, formatDisplayAddress } from "../contactUtils";
import { ContactChannelRow } from "./ContactChannelRow";
import { ContactDetailSectionHeader } from "./ContactDetailSectionHeader";
import { EditAddressSheet } from "./EditAddressSheet";
import { contactDetailStyles } from "./contactDetailStyles";

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
    setSheet({ open: true, mode: "add" });
  }

  function openEditSheet(index: number, entry: ContactAddressEntry) {
    setSheet({ open: true, mode: "edit", index, entry });
  }

  function closeSheet() {
    setSheet({ open: false });
  }

  async function handleSave(entry: ContactAddressEntry) {
    if (!sheet.open) return;

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
        type: "error",
        headline: t("ContactAddress.SaveErrorTitle"),
        description: err instanceof Error ? err.message : t("ContactAddress.SaveErrorMessage"),
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
        type: "error",
        headline: t("ContactAddress.SaveErrorTitle"),
        description: err instanceof Error ? err.message : t("ContactAddress.SaveErrorMessage"),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSetPreferred(index: number) {
    if (index === 0) return;
    const preferred = addresses[index];
    const rest = addresses.filter((_, i) => i !== index);
    const nextAddresses = [preferred, ...rest];

    try {
      await onSaveAddresses(nextAddresses);
    } catch (err) {
      showToast({
        type: "error",
        headline: t("ContactAddress.SaveErrorTitle"),
        description: err instanceof Error ? err.message : t("ContactAddress.SaveErrorMessage"),
      });
    }
  }

  function openInMaps(address: ContactAddressEntry) {
    const url = buildNativeMapsUrl(address);
    Linking.openURL(url).catch(() => {
      showToast({
        type: "error",
        headline: t("MobileApp.Common.ErrorTitle"),
        description: "Could not open maps",
      });
    });
  }

  async function copyAddress(address: ContactAddressEntry) {
    const label = formatDisplayAddress(address);
    if (!label) return;

    await copyToClipboard(label, showToast, {
      successHeadline: t("ContactAddress.CopySuccessTitle"),
      successDescription: label,
      errorHeadline: t("MobileApp.Common.ErrorTitle"),
      errorDescription: "Could not copy address",
    });
  }

  const sheetEntry = sheet.open && sheet.mode === "edit" ? sheet.entry : null;
  const sheetIndex = sheet.open && sheet.mode === "edit" ? sheet.index : -1;

  return (
    <View style={contactDetailStyles.section}>
      <ContactDetailSectionHeader
        titleKey="ContactAddress.Title"
        action={
          canAdd
            ? {
                label: t("ContactInfo.Add"),
                accessibilityLabel: t("ContactAddress.AddAddressAction"),
                icon: <IconMapPinPlus size={16} stroke={colors.primary} />,
                onPress: openAddSheet,
              }
            : undefined
        }
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
            {t("ContactAddress.NoAddresses")}
          </Text>
        </View>
      ) : (
        addresses.map((address, index) => {
          const cardLines = formatAddressCardLines(address);
          const accessibilityAddressLabel = formatAddressAccessibilityLabel(cardLines);
          const isPreferred = index === 0;

          const menuItems = [
            {
              id: "native-maps",
              icon: <IconMapPin size={16} stroke={colors.iconPrimary} />,
              label: t("ContactAddress.OpenInMapsAction"),
              onPress: () => openInMaps(address),
            },
            {
              id: "edit",
              icon: <IconPencil size={16} stroke={colors.iconPrimary} />,
              label: t("ContactAddress.EditAction"),
              onPress: () => openEditSheet(index, address),
            },
            {
              id: "set-preferred",
              icon: <IconStar size={16} stroke={isPreferred ? colors.textMuted : colors.iconPrimary} />,
              label: t("ContactAddress.SetAsPreferred"),
              disabled: isPreferred,
              hint: isPreferred ? t("ContactAddress.DisabledReasonAlreadyPreferred") : undefined,
              onPress: () => void handleSetPreferred(index),
            },
            {
              id: "copy",
              icon: <IconCopy size={16} stroke={colors.iconPrimary} />,
              label: t("ContactAddress.CopyAction"),
              onPress: () => void copyAddress(address),
            },
            {
              id: "delete",
              icon: <IconTrash size={16} stroke={colors.dangerAccent} />,
              label: t("ContactAddress.DeleteAction"),
              tone: "danger" as const,
              onPress: () => void handleDelete(index),
            },
          ];

          return (
            <ContactChannelRow
              key={`${accessibilityAddressLabel}-${index}`}
              primaryLabel={accessibilityAddressLabel || address.value}
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
              type={address.type}
              typeNamespace="ContactAddress"
              isPreferred={isPreferred}
              channelIcon={<IconMapPin size={16} stroke={colors.iconSecondary} />}
              menuItems={menuItems}
              menuAccessibilityLabel={t("ContactAddress.ActionsLabel")}
              accessibilityLabel={`${accessibilityAddressLabel}${isPreferred ? `, ${t("ContactInfo.Preferred")}` : ""}`}
              accessibilityHint="Tap to open in maps"
              onPress={() => openInMaps(address)}
              onLongPress={() => void copyAddress(address)}
            />
          );
        })
      )}

      <EditAddressSheet
        open={sheet.open}
        mode={sheet.open ? sheet.mode : "add"}
        initialEntry={sheetEntry}
        isSubmitting={isSubmitting}
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
        onCancel={closeSheet}
        onSave={handleSave}
        onDelete={
          sheet.open && sheet.mode === "edit"
            ? () => void handleDelete(sheetIndex)
            : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  emptyText: {
    fontSize: 14,
  },
  addressLines: {
    gap: 2,
  },
  addressSecondary: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.medium,
    lineHeight: 20,
  },
  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  countryFlag: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.bodyLarge,
    lineHeight: 20,
  },
});
