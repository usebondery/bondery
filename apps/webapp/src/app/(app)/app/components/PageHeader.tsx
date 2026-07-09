"use client";

import type { DocId } from "@bondery/helpers";
import { ActionIconLink, HelpButton } from "@bondery/mantine-next";
import { ActionIcon, Group, Title } from "@mantine/core";
import type { Icon } from "@tabler/icons-react";
import { IconArrowLeft } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useCommonTranslations } from "@/lib/i18n/useWebTranslations";

interface PageHeaderProps {
  action?: ReactNode;
  backHref?: string;
  backOnClick?: () => void;
  helpDoc?: DocId;
  helpLabel?: string;
  icon: Icon;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  title: string;
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
  const resolvedAction =
    action ||
    (primaryAction || secondaryAction ? (
      <Group gap="sm">
        {secondaryAction}
        {primaryAction}
      </Group>
    ) : undefined);

  return (
    <Group gap="sm" justify={resolvedAction ? "space-between" : "flex-start"} mb={"xl"}>
      <Group gap="sm">
        {backOnClick ? (
          <ActionIcon
            aria-label={tCommon("a11y.back")}
            onClick={backOnClick}
            size="xl"
            variant="default"
          >
            <IconArrowLeft size={20} />
          </ActionIcon>
        ) : null}
        {!backOnClick && backHref && (
          <ActionIconLink
            ariaLabel={tCommon("a11y.back")}
            href={backHref}
            icon={<IconArrowLeft size={20} />}
            size="xl"
            variant="default"
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
