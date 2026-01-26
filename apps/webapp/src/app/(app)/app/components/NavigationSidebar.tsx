"use client";

import { Group, Text, Stack, Box } from "@mantine/core";
import { IconSettings, IconUsers, IconUsersGroup, IconMessageCircle } from "@tabler/icons-react";
import { usePathname } from "next/navigation";
import { NavLinkItem } from "./NavLinkItem";
import { UserAvatar } from "@/app/(app)/app/components/UserAvatar";
import { WEBAPP_ROUTES } from "@bondery/helpers";
import { BonderyLogotypeBlack, BonderyLogotypeWhite } from "@bondery/branding";

interface NavigationSidebarContentProps {
  userName: string;
  avatarUrl: string | null;
}

const primaryLinks = [
  { href: WEBAPP_ROUTES.PEOPLE, label: "People", icon: IconUsers },
  { href: WEBAPP_ROUTES.GROUPS, label: "Groups", icon: IconUsersGroup },
];

const secondaryLinks = [
  { href: WEBAPP_ROUTES.FEEDBACK, label: "Feedback", icon: IconMessageCircle },
  { href: WEBAPP_ROUTES.SETTINGS, label: "Settings", icon: IconSettings },
];

export function NavigationSidebarContent({ userName, avatarUrl }: NavigationSidebarContentProps) {
  const pathname = usePathname();

  return (
    <Box style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Group mb="md">
        <Box darkHidden>
          <BonderyLogotypeBlack width={140} height={36} />
        </Box>
        <Box lightHidden>
          <BonderyLogotypeWhite width={140} height={36} />
        </Box>
      </Group>

      <Stack gap="xs">
        {primaryLinks.map((link) => (
          <NavLinkItem key={link.href} {...link} active={pathname === link.href} />
        ))}
      </Stack>

      <Stack gap="xs" mt="auto">
        {secondaryLinks.map((link) => (
          <NavLinkItem key={link.href} {...link} active={pathname === link.href} />
        ))}
      </Stack>

      <Group mt="md">
        <UserAvatar avatarUrl={avatarUrl} userName={userName} size="md" />
        <Text size="sm" fw={500}>
          {userName}
        </Text>
      </Group>
    </Box>
  );
}
