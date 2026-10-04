"use client";

import { getAuthUserFacingError } from "@bondery/helpers/api";
import { errorNotificationTemplate, ModalTitle } from "@bondery/mantine-next";
import { PASSKEY_LIMITS } from "@bondery/schemas";
import { Box, Button, Group, Skeleton, Stack, Text, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconAlertCircle, IconFingerprint, IconPlus, IconTrash } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InlineEditableInput } from "@/app/(app)/app/(shell)/person/[personId]/components/info/InlineEditableInput";
import { openStandardConfirmModal } from "@/components/modals/openStandardConfirmModal";
import { captureEvent } from "@/lib/analytics/client";
import {
  type AaguidCatalog,
  loadVendoredAaguidCatalog,
  lookupAaguidCatalogName,
  lookupAaguidIcons,
  lookupBetterAuthAuthenticatorName,
} from "@/lib/auth/aaguid-catalog";
import { createWebappAuthClient } from "@/lib/auth/client";
import { isWebAuthnSupported } from "@/lib/auth/passkey-support";
import { ensureFreshIdentity } from "@/lib/auth/reconfirm";
import { runAddPasskeyCeremony } from "@/lib/auth/runAddPasskeyCeremony";
import { useCommonTranslations, useSettingsPageTranslations } from "@/lib/i18n/generated/hooks";
import { formatLastUsedAtWithFormatter, useDateFormatter } from "@/lib/i18n/useDateFormatter";
import { useWebappRuntimeConfig } from "@/lib/platform/runtimeConfig.client";
import {
  type PasskeyRecord,
  passkeyLastUsedAtIso,
  usePasskeysQuery,
} from "@/lib/query/hooks/usePasskeys";
import { settingsKeys } from "@/lib/query/keys";
import { SettingsCredentialCard } from "./SettingsCredentialCard";

type PasskeyRowProps = {
  catalog: AaguidCatalog | null;
  deleteAriaLabel: string;
  fallbackName: string;
  lastUsedLabel: string;
  nameFieldLabel: string;
  onDeleted: () => void;
  onRenamed: (name: string) => void;
  passkey: PasskeyRecord;
};

const CATALOG_ICON_PX = 18;

function CatalogIconImg({ src }: { src: string }) {
  return (
    // Catalog icons are data: SVG URIs — next/image cannot optimize them.
    // biome-ignore lint/performance/noImgElement: data-URI SVG; never decode
    <img alt="" aria-hidden height={CATALOG_ICON_PX} src={src} width={CATALOG_ICON_PX} />
  );
}

function PasskeyRowIcon({
  aaguid,
  catalog,
}: {
  aaguid?: string | null;
  catalog: AaguidCatalog | null;
}) {
  const icons = catalog ? lookupAaguidIcons(catalog, aaguid) : null;
  if (!icons) {
    return <IconFingerprint size={CATALOG_ICON_PX} stroke={1.5} />;
  }

  const { iconDark, iconLight } = icons;
  if (iconLight && iconDark) {
    return (
      <>
        <Box darkHidden>
          <CatalogIconImg src={iconLight} />
        </Box>
        <Box lightHidden>
          <CatalogIconImg src={iconDark} />
        </Box>
      </>
    );
  }

  const src = iconLight ?? iconDark;
  if (!src) {
    return <IconFingerprint size={CATALOG_ICON_PX} stroke={1.5} />;
  }

  return <CatalogIconImg src={src} />;
}

function PasskeyRow({
  catalog,
  deleteAriaLabel,
  fallbackName,
  lastUsedLabel,
  nameFieldLabel,
  onDeleted,
  onRenamed,
  passkey,
}: PasskeyRowProps) {
  const t = useSettingsPageTranslations("Profile");
  const tCommon = useCommonTranslations();
  const runtimeConfig = useWebappRuntimeConfig();
  const authClient = useMemo(() => createWebappAuthClient(runtimeConfig), [runtimeConfig]);
  const [name, setName] = useState(passkey.name?.trim() || fallbackName);
  const [isSaving, setIsSaving] = useState(false);
  const persistedNameRef = useRef(passkey.name?.trim() || fallbackName);

  useEffect(() => {
    const next = passkey.name?.trim() || fallbackName;
    setName(next);
    persistedNameRef.current = next;
  }, [fallbackName, passkey.name]);

  const saveName = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === persistedNameRef.current) {
      setName(persistedNameRef.current);
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await authClient.passkey.updatePasskey({
        id: passkey.id,
        name: trimmed,
      });
      if (error) {
        throw error;
      }
      persistedNameRef.current = trimmed;
      setName(trimmed);
      onRenamed(trimmed);
      captureEvent("account_settings:passkey_update");
    } catch (error) {
      setName(persistedNameRef.current);
      notifications.show(
        errorNotificationTemplate({
          description: getAuthUserFacingError(error, tCommon),
          title: tCommon("feedback.errorTitle"),
        }),
      );
    } finally {
      setIsSaving(false);
    }
  }, [authClient.passkey, name, onRenamed, passkey.id, tCommon]);

  const catalogIcons = catalog ? lookupAaguidIcons(catalog, passkey.aaguid) : null;
  const iconTooltip =
    catalogIcons && catalog
      ? (lookupAaguidCatalogName(catalog, passkey.aaguid) ??
        lookupBetterAuthAuthenticatorName(passkey.aaguid) ??
        undefined)
      : undefined;

  const handleDelete = () => {
    const displayName = persistedNameRef.current;
    openStandardConfirmModal({
      cancelLabel: tCommon("confirm.noCancel"),
      confirmColor: "red",
      confirmLabel: tCommon("confirm.yesDelete"),
      confirmLeftSection: <IconTrash size={16} />,
      message: <Text size="sm">{t("Passkeys.DeleteMessage")}</Text>,
      onConfirm: async () => {
        const { error } = await authClient.passkey.deletePasskey({ id: passkey.id });
        if (error) {
          notifications.show(
            errorNotificationTemplate({
              description: getAuthUserFacingError(error, tCommon),
              title: tCommon("feedback.errorTitle"),
            }),
          );
          return;
        }
        captureEvent("account_settings:passkey_delete");
        onDeleted();
      },
      title: (
        <ModalTitle
          icon={<IconAlertCircle size={24} />}
          isDangerous
          text={t("Passkeys.DeleteTitle", { name: displayName })}
        />
      ),
    });
  };

  return (
    <SettingsCredentialCard
      deleteAriaLabel={deleteAriaLabel}
      deleteTooltip={t("Passkeys.RevokeTooltip")}
      icon={<PasskeyRowIcon aaguid={passkey.aaguid} catalog={catalog} />}
      iconTooltip={iconTooltip || undefined}
      label={
        <InlineEditableInput
          aria-label={nameFieldLabel}
          isSaving={isSaving}
          maxLength={PASSKEY_LIMITS.nameMaxLength}
          onBlur={() => void saveName()}
          onChange={setName}
          size="sm"
          style={{ width: "100%" }}
          value={name}
        />
      }
      lastUsedLabel={lastUsedLabel}
      onDelete={handleDelete}
    />
  );
}

export function PasskeysBlock() {
  const t = useSettingsPageTranslations("Profile");
  const tCommon = useCommonTranslations();
  const queryClient = useQueryClient();
  const formatter = useDateFormatter();
  const runtimeConfig = useWebappRuntimeConfig();
  const authClient = useMemo(() => createWebappAuthClient(runtimeConfig), [runtimeConfig]);
  const { data: passkeys = [], error, isError, isLoading } = usePasskeysQuery();
  const [webAuthnSupported, setWebAuthnSupported] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [catalog, setCatalog] = useState<AaguidCatalog | null>(null);

  useEffect(() => {
    setWebAuthnSupported(isWebAuthnSupported());
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadVendoredAaguidCatalog()
      .then((loaded) => {
        if (!cancelled) {
          setCatalog(loaded);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCatalog({});
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const atLimit = passkeys.length >= PASSKEY_LIMITS.maxPerUser;
  const tooltipLabel = atLimit
    ? t("Passkeys.LimitReached")
    : webAuthnSupported
      ? undefined
      : t("Passkeys.UnsupportedTooltip");

  const lastUsedLabel = (passkey: PasskeyRecord) =>
    formatLastUsedAtWithFormatter(passkeyLastUsedAtIso(passkey), formatter, {
      lastUsed: (time) => t("Passkeys.LastUsed", { time }),
      lessThanMinuteAgo: t("Passkeys.LessThanMinuteAgo"),
      neverUsed: t("Passkeys.NeverUsed"),
    });

  const runCeremony = useCallback(async () => {
    return runAddPasskeyCeremony({
      authClient,
      catalog,
      createErrorDescription: t("Passkeys.CreateErrorDescription"),
      createErrorTitle: t("Passkeys.CreateErrorTitle"),
      fallbackName: t("Passkeys.FallbackName"),
      nameTemplate: ({ browser, os }) => t("Passkeys.NameTemplate", { browser, os }),
      queryClient,
      tCommon,
    });
  }, [authClient, catalog, queryClient, t, tCommon]);

  const handleAdd = async () => {
    if (atLimit || !webAuthnSupported || isAdding) {
      return;
    }

    setIsAdding(true);
    try {
      const stepped = await ensureFreshIdentity({ purpose: "add_passkey" });
      if (stepped !== "fresh") {
        return;
      }

      const result = await runCeremony();
      if (result !== "session_stale") {
        return;
      }

      const retryStep = await ensureFreshIdentity({ purpose: "add_passkey" });
      if (retryStep !== "fresh") {
        return;
      }
      await runCeremony();
    } finally {
      setIsAdding(false);
    }
  };

  const addButton = (
    <Tooltip disabled={!tooltipLabel} label={tooltipLabel}>
      <span>
        <Button
          disabled={atLimit || !webAuthnSupported}
          leftSection={<IconPlus size={16} />}
          loading={isAdding}
          onClick={() => void handleAdd()}
          size="sm"
          variant="outline"
        >
          {t("Passkeys.Add")}
        </Button>
      </span>
    </Tooltip>
  );

  return (
    <Stack gap="md">
      <Group align="flex-start" justify="space-between" wrap="nowrap">
        <div>
          <Text fw={500} mb={4} size="sm">
            {t("Passkeys.Title")}
          </Text>
          <Text c="dimmed" size="xs">
            {t("Passkeys.Description")}
          </Text>
        </div>
        {addButton}
      </Group>

      {isLoading ? (
        <Stack gap="sm">
          <Skeleton height={56} radius="md" />
          <Skeleton height={56} radius="md" />
        </Stack>
      ) : isError ? (
        <Text c="dimmed" size="sm">
          {getAuthUserFacingError(error, tCommon)}
        </Text>
      ) : passkeys.length === 0 ? (
        <Text c="dimmed" size="sm">
          {t("Passkeys.EmptyTitle")}
        </Text>
      ) : (
        <Stack gap="sm">
          {passkeys.map((passkey) => (
            <PasskeyRow
              catalog={catalog}
              deleteAriaLabel={t("Passkeys.DeleteAriaLabel", {
                name: passkey.name?.trim() || t("Passkeys.FallbackName"),
              })}
              fallbackName={t("Passkeys.FallbackName")}
              key={passkey.id}
              lastUsedLabel={lastUsedLabel(passkey)}
              nameFieldLabel={t("Passkeys.NameField")}
              onDeleted={() => {
                queryClient.setQueryData<PasskeyRecord[]>(settingsKeys.passkeys(), (current) =>
                  (current ?? []).filter((item) => item.id !== passkey.id),
                );
              }}
              onRenamed={(nextName) => {
                queryClient.setQueryData<PasskeyRecord[]>(settingsKeys.passkeys(), (current) =>
                  (current ?? []).map((item) =>
                    item.id === passkey.id ? { ...item, name: nextName } : item,
                  ),
                );
              }}
              passkey={passkey}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
