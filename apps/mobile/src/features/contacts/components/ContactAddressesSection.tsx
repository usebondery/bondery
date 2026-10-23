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
import {
  useCommonTranslations,
  useContactAddressTranslations,
  useContactInfoTranslations,
} from "@/lib/i18n/generated/hooks";
import { copyToClipboard } from "../../../lib/clipboard/copyToClipboard";
import { LIMITS } from "../../../lib/config";
import { notifications } from "../../../lib/toast/notifications";
import { useShowErrorToast } from "../../../lib/toast/useShowErrorToast";
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
  onSaveAddresses: (addresses: ContactAddressEntry[]) => void;
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
  const tContactAddress = useContactAddressTranslations();
  const tContactInfo = useContactInfoTranslations();
  const t = useCommonTranslations();
  const colors = useMobileThemeColors();
  const showErrorToast = useShowErrorToast();
  const [sheet, setSheet] = useState<SheetState>({ open: false });
  const errorTitle = t("feedback.errorTitle");

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

  function persistAddresses(nextAddresses: ContactAddressEntry[]) {
    try {
      onSaveAddresses(nextAddresses);
    } catch (err) {
      showErrorToast(err, tContactAddress("SaveErrorTitle"));
      throw err;
    }
  }

  function handleSaveEntry(entry: ContactAddressEntry) {
    if (!sheet.open) {
      return;
    }

    let nextAddresses: ContactAddressEntry[];

    if (sheet.mode === "add") {
      nextAddresses = [...addresses, entry];
    } else {
      nextAddresses = addresses.map((a, i) => (i === sheet.index ? entry : a));
    }

    persistAddresses(nextAddresses);
  }

  function handleDeleteEntry() {
    if (!sheet.open || sheet.mode !== "edit") {
      return;
    }

    persistAddresses(addresses.filter((_, i) => i !== sheet.index));
  }

  function handleSetPreferred(index: number) {
    if (index === 0) {
      return;
    }
    const preferred = addresses[index];
    const rest = addresses.filter((_, i) => i !== index);
    persistAddresses([preferred, ...rest]);
  }

  function openInMaps(address: ContactAddressEntry) {
    const url = buildNativeMapsUrl(address);
    Linking.openURL(url).catch(() => {
      notifications.show({
        message: "Could not open maps",
        title: t("feedback.errorTitle"),
        type: "error",
      });
    });
  }

  async function copyAddress(address: ContactAddressEntry) {
    const label = formatDisplayAddress(address);
    if (!label) {
      return;
    }

    await copyToClipboard(label, {
      errorDescription: "Could not copy address",
      errorHeadline: t("feedback.errorTitle"),
      successDescription: label,
      successHeadline: tContactAddress("CopySuccessTitle"),
    });
  }

  const sheetEntry = sheet.open && sheet.mode === "edit" ? sheet.entry : null;

  return (
    <View style={contactDetailStyles.section}>
      <ContactDetailSectionHeader
        action={
          canAdd
            ? {
                accessibilityLabel: tContactAddress("AddAddressAction"),
                icon: <IconMapPinPlus size={16} stroke={colors.primary} />,
                label: tContactInfo("Add"),
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
            {tContactAddress("NoAddresses")}
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
              label: tContactAddress("OpenInMapsAction"),
              onPress: () => openInMaps(address),
            },
            {
              icon: <IconPencil size={16} stroke={colors.iconPrimary} />,
              id: "edit",
              label: tContactAddress("EditAction"),
              onPress: () => openEditSheet(index, address),
            },
            {
              disabled: isPreferred,
              hint: isPreferred ? tContactAddress("DisabledReasonAlreadyPreferred") : undefined,
              icon: (
                <IconStar size={16} stroke={isPreferred ? colors.textMuted : colors.iconPrimary} />
              ),
              id: "set-preferred",
              label: tContactAddress("SetAsPreferred"),
              onPress: () => void handleSetPreferred(index),
            },
            {
              icon: <IconCopy size={16} stroke={colors.iconPrimary} />,
              id: "copy",
              label: tContactAddress("CopyAction"),
              onPress: () => void copyAddress(address),
            },
            {
              icon: <IconTrash size={16} stroke={colors.dangerAccent} />,
              id: "delete",
              label: tContactAddress("DeleteAction"),
              onPress: () => {
                persistAddresses(addresses.filter((_, addressIndex) => addressIndex !== index));
              },
              tone: "danger" as const,
            },
          ];

          return (
            <ContactChannelRow
              accessibilityHint="Tap to open in maps"
              accessibilityLabel={`${accessibilityAddressLabel}${isPreferred ? `, ${tContactInfo("Preferred")}` : ""}`}
              channelIcon={<IconMapPin size={16} stroke={colors.iconSecondary} />}
              isPreferred={isPreferred}
              key={address.addressFormatted ?? address.value}
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
              menuAccessibilityLabel={tContactAddress("ActionsLabel")}
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
        mode={sheet.open ? sheet.mode : "add"}
        onCancel={closeSheet}
        onDelete={sheet.open && sheet.mode === "edit" ? handleDeleteEntry : undefined}
        onError={() => {
          notifications.show({
            message: tContactAddress("SaveErrorTitle"),
            title: errorTitle,
            type: "error",
          });
        }}
        onOpenChange={(open) => {
          if (!open) {
            closeSheet();
          }
        }}
        onPersist={handleSaveEntry}
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
