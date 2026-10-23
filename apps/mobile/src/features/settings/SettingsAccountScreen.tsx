import { IconLogout, IconTrash } from "@tabler/icons-react-native";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, ScrollView } from "react-native";
import { StackNavBar } from "../../components/chrome";
import { Button } from "../../components/ui/Button";
import { Sheet } from "../../components/ui/Sheet";
import { Stack } from "../../components/ui/Stack";
import { Text } from "../../components/ui/Text";
import { deleteMyAccount, fetchSettings } from "../../lib/api/client";
import { resolveDisplayedError } from "../../lib/api/resolveDisplayedError";
import { authClient } from "../../lib/auth/client";
import { endLocalSession } from "../../lib/auth/session";
import {
  useCommonTranslations,
  useMobileAuthTranslations,
  useMobileSettingsTranslations,
  useSettingsPageTranslations,
} from "../../lib/i18n/generated/hooks";
import { goBackOrReplace } from "../../lib/navigation/goBackOrReplace";
import { syncEffectState } from "../../lib/react/syncEffectState";
import { useMyselfContact } from "../../lib/sync/hooks/useSyncQuery";
import { MOBILE_LAYOUT } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { SettingsAccountProfileCard } from "./components/SettingsAccountProfileCard";
import { SettingsAsyncState } from "./components/SettingsAsyncState";

function plainTextFromHtml(value: string): string {
  return value.replace(/<[^>]+>/g, "");
}

export function SettingsAccountScreen() {
  const tMobileAuth = useMobileAuthTranslations();
  const tMobileSettings = useMobileSettingsTranslations();
  const tSettingsPage = useSettingsPageTranslations();
  const t = useCommonTranslations();
  const router = useRouter();
  const colors = useMobileThemeColors();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [fallbackName, setFallbackName] = useState<string | null>(null);
  const [fallbackAvatarUrl, setFallbackAvatarUrl] = useState<string | null>(null);
  const { data: myselfContact } = useMyselfContact();
  const [pendingAction, setPendingAction] = useState<"logout" | "delete" | null>(null);
  const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function loadAccount() {
    setIsLoading(true);
    setLoadError(null);

    try {
      const settingsResponse = await fetchSettings();
      setEmail(settingsResponse.data?.email ?? null);
      setFallbackName(settingsResponse.data?.name ?? null);
      setFallbackAvatarUrl(settingsResponse.data?.avatarUrl ?? null);
    } catch (err) {
      setLoadError(resolveDisplayedError(err, t));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    syncEffectState(() => {
      void loadAccount();
    });
  }, []);

  const signOut = async () => {
    if (!authClient) {
      throw new Error(tMobileAuth("MissingConfig"));
    }

    await endLocalSession({ reason: "user_initiated" });
  };

  const handleLogout = async () => {
    if (pendingAction) {
      return;
    }

    setActionError(null);
    setPendingAction("logout");

    try {
      await signOut();
    } catch (logoutError) {
      setActionError(resolveDisplayedError(logoutError, t));
    } finally {
      setPendingAction(null);
    }
  };

  const runDeleteAccount = async () => {
    if (pendingAction) {
      return;
    }

    setActionError(null);
    setPendingAction("delete");

    try {
      await deleteMyAccount();
      await endLocalSession({ reason: "account_deleted" });

      setDeleteConfirmOpen(false);
      Alert.alert(
        tSettingsPage("DataManagement.DeleteSuccess"),
        tSettingsPage("DataManagement.AccountDeleted"),
      );
    } catch (deleteError) {
      setActionError(resolveDisplayedError(deleteError, t));
    } finally {
      setPendingAction(null);
    }
  };

  const confirmDeleteAccount = () => {
    void runDeleteAccount();
  };

  return (
    <>
      <StackNavBar
        onBack={() => goBackOrReplace(router, "/settings")}
        title={tMobileSettings("Account")}
        variant="elevated"
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingBottom: MOBILE_LAYOUT.spacing.contentBottom,
          paddingHorizontal: MOBILE_LAYOUT.spacing.horizontal,
          paddingTop: MOBILE_LAYOUT.spacing.contentTop,
        }}
        style={{ backgroundColor: colors.appBackground }}
      >
        <Stack>
          <SettingsAsyncState
            errorDescription={loadError}
            errorTitle={tMobileSettings("AccountLoadErrorTitle")}
            isLoading={isLoading}
            loadingMinHeight={120}
            onRetry={() => {
              void loadAccount();
            }}
          >
            <SettingsAccountProfileCard
              contact={myselfContact}
              email={email}
              fallbackAvatarUrl={fallbackAvatarUrl}
              fallbackName={fallbackName}
            />
          </SettingsAsyncState>

          {!isLoading && !loadError ? (
            <Stack gap="sm">
              <Button
                align="spread"
                color="neutral"
                disabled={pendingAction !== null}
                onPress={() => {
                  void handleLogout();
                }}
                rightSection={<IconLogout color={colors.textSecondary} size={16} />}
                variant="outline"
              >
                {tSettingsPage("DataManagement.SignOutButton")}
              </Button>

              <Button
                align="spread"
                color="danger"
                disabled={pendingAction !== null}
                onPress={() => setDeleteConfirmOpen(true)}
                rightSection={<IconTrash color={colors.dangerAccent} size={16} />}
                variant="outline"
              >
                {tSettingsPage("DataManagement.DeleteButton")}
              </Button>

              {actionError ? (
                <Text c="danger" className="mt-1.5" size="xs">
                  {actionError}
                </Text>
              ) : null}
            </Stack>
          ) : null}
        </Stack>
      </ScrollView>

      <Sheet
        actions={[
          {
            disabled: pendingAction === "delete",
            label: tSettingsPage("DataManagement.DeleteCancelButton"),
            onPress: () => setDeleteConfirmOpen(false),
            tone: "neutral",
            variant: "outline",
          },
          {
            disabled: pendingAction === "delete",
            icon: <IconTrash color={colors.textOnPrimary} size={16} />,
            label: tSettingsPage("DataManagement.DeleteConfirmButton"),
            loading: pendingAction === "delete",
            loadingText: t("feedback.deleting"),
            onPress: confirmDeleteAccount,
            tone: "danger",
            variant: "filled",
          },
        ]}
        isBusy={pendingAction === "delete"}
        onClose={() => setDeleteConfirmOpen(false)}
        opened={isDeleteConfirmOpen}
        title={tSettingsPage("DataManagement.DeleteConfirmTitle")}
      >
        <Text c="secondary" size="sm">
          {plainTextFromHtml(tSettingsPage("DataManagement.DeleteConfirmMessage"))}
        </Text>
      </Sheet>
    </>
  );
}
