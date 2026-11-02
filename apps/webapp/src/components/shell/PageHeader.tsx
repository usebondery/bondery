"use client";

import type { DocId } from "@bondery/helpers";
import { ActionIconButton, ActionIconLink, type AppHref, HelpButton } from "@bondery/mantine-next";
import { Flex, Group, Title } from "@mantine/core";
import type { Icon } from "@tabler/icons-react";
import { IconArrowLeft } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useCommonTranslations } from "@/lib/i18n/generated/hooks";
import classes from "./PageHeader.module.css";

interface PageHeaderProps {
  action?: ReactNode;
  backHref?: AppHref;
  backOnClick?: () => void;
  helpDoc?: DocId;
  helpLabel?: string;
  icon: Icon;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  title: string;
}

function PageHeaderActions({ children }: { children: ReactNode }) {
  return (
    <Flex
      align={{ base: "stretch", sm: "center" }}
      className={classes.actions}
      direction={{ base: "column", sm: "row" }}
      gap="sm"
      justify="flex-end"
      w={{ base: "100%", sm: "auto" }}
    >
      {children}
    </Flex>
  );
}

export function PageHeader({
  icon: Icon,
  title,
  helpDoc,
  helpLabel,
  action,
  primaryAction,
  secondaryAction,
  backHref,
  backOnClick,
}: PageHeaderProps) {
  const tCommon = useCommonTranslations();
  const resolvedAction = action ? (
    <PageHeaderActions>{action}</PageHeaderActions>
  ) : primaryAction || secondaryAction ? (
    <PageHeaderActions>
      {secondaryAction}
      {primaryAction}
    </PageHeaderActions>
  ) : undefined;

  return (
    <Flex
      align={{ base: "stretch", sm: "center" }}
      direction={{ base: "column", sm: "row" }}
      gap="sm"
      justify={resolvedAction ? { base: "flex-start", sm: "space-between" } : "flex-start"}
      mb="xl"
    >
      <Group gap="sm" wrap="wrap">
        {backOnClick ? (
          <ActionIconButton
            aria-label={tCommon("a11y.back")}
            icon={<IconArrowLeft />}
            onClick={backOnClick}
            size="xl"
            variant="default"
          />
        ) : null}
        {!backOnClick && backHref && (
          <ActionIconLink
            ariaLabel={tCommon("a11y.back")}
            href={backHref}
            icon={<IconArrowLeft />}
            size="xl"
            variant="default"
          />
        )}
        <Icon size={32} stroke={1.5} />
        <Title order={1}>{title}</Title>
        {helpLabel ? <HelpButton doc={helpDoc} label={helpLabel} /> : null}
      </Group>
      {resolvedAction}
    </Flex>
  );
}
