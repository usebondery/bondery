"use client";

import { BRAND_PRIMARY_COLOR } from "@bondery/branding";
import { Box, Card, Flex, Group, Loader, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useCommonTranslations, useLoginPageTranslations } from "@/lib/i18n/generated/hooks";
import { Logo } from "./Logo";

type LoginBrandShellProps = {
  children: ReactNode;
  loading?: boolean;
  websiteUrl: string;
};

export function LoginBrandShell({ children, loading = false, websiteUrl }: LoginBrandShellProps) {
  const t = useLoginPageTranslations();
  const tBenefits = useLoginPageTranslations("Benefits");
  const tCommon = useCommonTranslations();
  const benefits = [tBenefits("FreeForever"), tBenefits("ImportSocials"), tBenefits("PlugInApps")];

  return (
    <Flex
      align="center"
      className="bg-[light-dark(var(--mantine-color-gray-0),var(--mantine-color-dark-8))]"
      justify="center"
      mih="100dvh"
      p="xl"
    >
      <Card
        className="w-full max-w-[70rem] overflow-hidden md:h-[calc(80dvh-var(--mantine-spacing-xl)*2)]"
        padding={0}
        radius="xl"
        shadow="md"
        withBorder
      >
        <Flex direction={{ base: "column", md: "row" }} h="100%">
          <Stack flex={1} gap="xl" p="xl" style={{ backgroundColor: BRAND_PRIMARY_COLOR }}>
            <Logo ariaLabel={t("LogoAriaLabel")} color="white" href={websiteUrl} size={28} />
            <Stack flex={1} gap="lg" justify="center">
              <Title c="white" fz={{ base: "h3", md: "h2" }} lh={1.2} order={1}>
                {tCommon("app.description")}
              </Title>
              <Stack gap="sm" visibleFrom="md">
                {benefits.map((label) => (
                  <Group gap="sm" key={label} wrap="nowrap">
                    <ThemeIcon color="white" radius="xl" size={20} variant="outline">
                      <IconCheck size={12} stroke={2.75} />
                    </ThemeIcon>
                    <Text c="white" size="md">
                      {label}
                    </Text>
                  </Group>
                ))}
              </Stack>
            </Stack>
          </Stack>
          <Flex align="center" flex={1} justify="center" p="xl">
            {loading ? (
              <Loader
                aria-label={tCommon("a11y.loading")}
                data-testid="login-card-loader"
                size="lg"
              />
            ) : (
              <Box maw="24rem" w="100%">
                {children}
              </Box>
            )}
          </Flex>
        </Flex>
      </Card>
    </Flex>
  );
}
