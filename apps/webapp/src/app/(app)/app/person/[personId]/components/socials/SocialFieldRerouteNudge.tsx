"use client";

import { Alert, Button, Group, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useSocialsTranslations } from "@/lib/i18n/generated/hooks";
import type { RerouteSuggestion, SocialFieldKey } from "../../hooks/useSocialFieldEditor";

interface SocialFieldRerouteNudgeProps {
  disabled?: boolean;
  field: SocialFieldKey;
  fieldLabels: Record<SocialFieldKey, string>;
  onKeepHere: () => void;
  onMove: () => void;
  onReplace: () => void;
  suggestion: RerouteSuggestion;
}

export function SocialFieldRerouteNudge({
  field,
  suggestion,
  fieldLabels,
  onMove,
  onReplace,
  onKeepHere,
  disabled,
}: SocialFieldRerouteNudgeProps) {
  const t = useSocialsTranslations();

  if (suggestion.fromField !== field) {
    return null;
  }

  const targetLabel = fieldLabels[suggestion.toField];
  const sourceLabel = fieldLabels[suggestion.fromField];
  const whatsappLabel = fieldLabels.whatsapp;

  const title =
    suggestion.reason === "wrong_platform"
      ? t("RerouteWrongPlatformDescription", { field: sourceLabel, platform: targetLabel })
      : suggestion.reason === "looks_like_phone"
        ? t("RerouteLooksLikePhoneDescription", {
            field: sourceLabel,
            platform: whatsappLabel,
          })
        : t("RerouteLooksLikeWebsiteDescription", { field: sourceLabel });

  const bodyParams = { field: sourceLabel, platform: targetLabel };

  const body =
    suggestion.reason === "wrong_platform"
      ? t(
          suggestion.targetHasValue
            ? "RerouteWrongPlatformBodyConflict"
            : "RerouteWrongPlatformBody",
          bodyParams,
        )
      : suggestion.reason === "looks_like_phone"
        ? t(
            suggestion.targetHasValue
              ? "RerouteLooksLikePhoneBodyConflict"
              : "RerouteLooksLikePhoneBody",
            bodyParams,
          )
        : t(
            suggestion.targetHasValue
              ? "RerouteLooksLikeWebsiteBodyConflict"
              : "RerouteLooksLikeWebsiteBody",
            bodyParams,
          );

  const primaryLabel = suggestion.targetHasValue
    ? t("RerouteReplace")
    : t("RerouteSetAs", { platform: targetLabel });

  const primaryAction = suggestion.targetHasValue ? onReplace : onMove;

  return (
    <Alert
      color="blue"
      icon={<IconInfoCircle size={16} stroke={1.5} />}
      p="sm"
      styles={{
        message: { display: "flex", flexDirection: "column", gap: 10 },
      }}
      title={title}
      variant="light"
    >
      <Text size="xs">{body}</Text>
      <Group gap="xs" wrap="wrap">
        <Button disabled={disabled} onClick={primaryAction} size="compact-sm">
          {primaryLabel}
        </Button>
        <Button disabled={disabled} onClick={onKeepHere} size="compact-sm" variant="default">
          {t("RerouteSetAs", { platform: sourceLabel })}
        </Button>
      </Group>
    </Alert>
  );
}
