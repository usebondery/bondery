"use client";

import { useDebouncedCallback } from "@mantine/hooks";
import { DEBOUNCE_MS } from "@/lib/config";
import {
  Badge,
  Center,
  Paper,
  Stack,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { IconHome, IconMapPin, IconSearch } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { AnchorLink } from "@bondery/mantine-next";
import type { AddressPin } from "@/app/(app)/app/map/types";

interface AddressPinsTableProps {
  pins: AddressPin[];
  searchPlaceholder: string;
  noAddressesFound: string;
  noAddressesMatchSearch: string;
}

const ADDRESS_TYPE_COLORS: Record<string, string> = {
  home: "blue",
  work: "grape",
  other: "gray",
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
  const [search, setSearch] = useState("");

  const handleSearch = useDebouncedCallback((q: string) => setSearch(q), DEBOUNCE_MS.tableSearch);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pins;
    return pins.filter((p) => {
      const name = formatPinName(p).toLowerCase();
      const addr = (p.addressFormatted ?? "").toLowerCase();
      const city = (p.addressCity ?? "").toLowerCase();
      return name.includes(q) || addr.includes(q) || city.includes(q);
    });
  }, [pins, search]);

  if (pins.length === 0) {
    return (
      <Paper withBorder shadow="sm" radius="md" p="xl">
        <Center>
          <Stack align="center" gap="xs">
            <IconMapPin size={32} stroke={1.2} color="var(--mantine-color-dimmed)" />
            <Text c="dimmed" size="sm">
              {noAddressesFound}
            </Text>
          </Stack>
        </Center>
      </Paper>
    );
  }

  return (
    <Paper withBorder shadow="sm" radius="md" p="md">
      <Stack gap="md">
        <TextInput
          leftSection={<IconSearch size={16} />}
          placeholder={searchPlaceholder}
          onChange={(e) => handleSearch(e.currentTarget.value)}
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
                <Table.Th>Name</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Address</Table.Th>
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
                        href={`${WEBAPP_ROUTES.PERSON}/${pin.personId}`}
                        size="sm"
                        fw={500}
                      >
                        {formatPinName(pin)}
                      </AnchorLink>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        size="sm"
                        variant="light"
                        color={ADDRESS_TYPE_COLORS[pin.addressType] ?? "gray"}
                        leftSection={<IconHome size={10} />}
                      >
                        {pin.addressType}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c={displayAddress ? undefined : "dimmed"}>
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
