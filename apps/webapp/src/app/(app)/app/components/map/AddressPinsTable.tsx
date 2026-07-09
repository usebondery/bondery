"use client";

import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { AnchorLink } from "@bondery/mantine-next";
import type { AddressPin } from "@bondery/schemas";
import { Badge, Center, Paper, Stack, Table, Text, TextInput } from "@mantine/core";
import { useDebouncedCallback } from "@mantine/hooks";
import { IconHome, IconMapPin, IconSearch } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { DEBOUNCE_MS } from "@/lib/platform/config";

interface AddressPinsTableProps {
  noAddressesFound: string;
  noAddressesMatchSearch: string;
  pins: AddressPin[];
  searchPlaceholder: string;
}

const ADDRESS_TYPE_COLORS: Record<string, string> = {
  home: "blue",
  other: "gray",
  work: "grape",
};

function formatPinName(pin: AddressPin): string {
  return [pin.firstName, pin.lastName].filter(Boolean).join(" ");
}

/**
 * Read-only table rendered in the map page Addresses view.
 * Shows one row per people_addresses record currently visible in the viewport.
 * No selection, no bulk actions — address records are not independently actionable.
 */
export function AddressPinsTable({
  pins,
  searchPlaceholder,
  noAddressesFound,
  noAddressesMatchSearch,
}: AddressPinsTableProps) {
  const t = useWebTranslations("MapPage");
  const tAddress = useWebTranslations("ContactAddress");
  const [search, setSearch] = useState("");

  const addressTypeLabel = (type: string) => {
    switch (type) {
      case "home":
        return tAddress("TypeHome");
      case "work":
        return tAddress("TypeWork");
      default:
        return tAddress("TypeOther");
    }
  };

  const handleSearch = useDebouncedCallback((q: string) => setSearch(q), DEBOUNCE_MS.tableSearch);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return pins;
    }
    return pins.filter((p) => {
      const name = formatPinName(p).toLowerCase();
      const addr = (p.addressFormatted ?? "").toLowerCase();
      const city = (p.addressCity ?? "").toLowerCase();
      return name.includes(q) || addr.includes(q) || city.includes(q);
    });
  }, [pins, search]);

  if (pins.length === 0) {
    return (
      <Paper p="xl" radius="md" shadow="sm" withBorder>
        <Center>
          <Stack align="center" gap="xs">
            <IconMapPin color="var(--mantine-color-dimmed)" size={32} stroke={1.2} />
            <Text c="dimmed" size="sm">
              {noAddressesFound}
            </Text>
          </Stack>
        </Center>
      </Paper>
    );
  }

  return (
    <Paper p="md" radius="md" shadow="sm" withBorder>
      <Stack gap="md">
        <TextInput
          leftSection={<IconSearch size={16} />}
          onChange={(e) => handleSearch(e.currentTarget.value)}
          placeholder={searchPlaceholder}
        />

        {filtered.length === 0 ? (
          <Center py="xl">
            <Text c="dimmed" size="sm">
              {noAddressesMatchSearch}
            </Text>
          </Center>
        ) : (
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("PinColumnName")}</Table.Th>
                <Table.Th>{t("PinColumnType")}</Table.Th>
                <Table.Th>{t("PinColumnAddress")}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filtered.map((pin) => {
                const displayAddress =
                  pin.addressFormatted ??
                  [pin.addressCity, pin.addressCountry].filter(Boolean).join(", ") ??
                  "";

                return (
                  <Table.Tr key={pin.addressId}>
                    <Table.Td>
                      <AnchorLink
                        fw={500}
                        href={`${WEBAPP_ROUTES.PERSON}/${pin.personId}`}
                        size="sm"
                      >
                        {formatPinName(pin)}
                      </AnchorLink>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={ADDRESS_TYPE_COLORS[pin.addressType] ?? "gray"}
                        leftSection={<IconHome size={10} />}
                        size="sm"
                        variant="light"
                      >
                        {addressTypeLabel(pin.addressType)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text c={displayAddress ? undefined : "dimmed"} size="sm">
                        {displayAddress || "—"}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        )}
      </Stack>
    </Paper>
  );
}
