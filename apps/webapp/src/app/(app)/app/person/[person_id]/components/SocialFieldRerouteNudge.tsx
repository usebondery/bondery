"use client";

import { Alert, Button, Group, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import type { RerouteSuggestion, SocialFieldKey } from "./useSocialFieldEditor";

interface SocialFieldRerouteNudgeProps {
  field: SocialFieldKey;
  suggestion: RerouteSuggestion;
  fieldLabels: Record<SocialFieldKey, string>;
  onMove: () => void;
  onReplace: () => void;
  onKeepHere: () => void;
  disabled?: boolean;
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
  const t = useTranslations("Socials");

  if (suggestion.fromField !== field) {
    return null;
  }

  const targetLabel = fieldLabels[suggestion.toField];
  const sourceLabel = fieldLabels[suggestion.fromField];
  const whatsappLabel = fieldLabels.whatsapp;

  const title =
    suggestion.reason === "wrong_platform"
      ? t("RerouteWrongPlatformDescription", { platform: targetLabel, field: sourceLabel })
      : suggestion.reason === "looks_like_phone"
        ? t("RerouteLooksLikePhoneDescription", {
            platform: whatsappLabel,
            field: sourceLabel,
          })
        : t("RerouteLooksLikeWebsiteDescription", { field: sourceLabel });

  const bodyParams = { platform: targetLabel, field: sourceLabel };

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
      variant="light"
      color="blue"
      p="sm"
      icon={<IconInfoCircle size={16} stroke={1.5} />}
      styles={{
        message: { display: "flex", flexDirection: "column", gap: 10 },
      }}
      title={title}
    >
      <Text size="xs">{body}</Text>
      <Group gap="xs" wrap="wrap">
        <Button size="compact-sm" onClick={primaryAction} disabled={disabled}>
          {primaryLabel}
        </Button>
        <Button size="compact-sm" variant="default" onClick={onKeepHere} disabled={disabled}>
          {t("RerouteSetAs", { platform: sourceLabel })}
        </Button>
      </Group>
    </Alert>
  );
}
