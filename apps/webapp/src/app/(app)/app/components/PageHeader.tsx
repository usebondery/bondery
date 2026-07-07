"use client";

import { ActionIcon, Group, Title } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import type { Icon } from "@tabler/icons-react";
import type { DocId } from "@bondery/helpers";
import type { ReactNode } from "react";
import { ActionIconLink, HelpButton } from "@bondery/mantine-next";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";

interface PageHeaderProps {
  icon: Icon;
  title: string;
  helpDoc?: DocId;
  helpLabel?: string;
  action?: ReactNode;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  backHref?: string;
  backOnClick?: () => void;
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
  const tCommon = useTranslations("WebAppCommon");
  const resolvedAction =
    action ||
    (primaryAction || secondaryAction ? (
      <Group gap="sm">
        {secondaryAction}
        {primaryAction}
      </Group>
    ) : undefined);

  return (
    <Group justify={resolvedAction ? "space-between" : "flex-start"} gap="sm" mb={"xl"}>
      <Group gap="sm">
        {backOnClick ? (
          <ActionIcon aria-label={tCommon("BackAriaLabel")} variant="default" size="xl" onClick={backOnClick}>
            <IconArrowLeft size={20} />
          </ActionIcon>
        ) : null}
        {!backOnClick && backHref && (
          <ActionIconLink
            href={backHref}
            ariaLabel={tCommon("BackAriaLabel")}
            variant="default"
            size="xl"
            icon={<IconArrowLeft size={20} />}
          />
        )}
        <Icon size={32} stroke={1.5} />
        <Title order={1}>{title}</Title>
        {helpLabel ? <HelpButton doc={helpDoc} label={helpLabel} /> : null}
      </Group>
      {resolvedAction}
    </Group>
  );
}
