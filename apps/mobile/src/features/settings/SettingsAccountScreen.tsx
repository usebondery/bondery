import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { IconLogout, IconTrash } from "@tabler/icons-react-native";
import type { Contact } from "@bondery/schemas";
import { ActionSheetPopup } from "../../components/ActionSheetPopup";
import { StackNavBar } from "../../components/chrome";
import { deleteMyAccount, fetchMyselfContact, fetchSettings } from "../../lib/api/client";
import { useMobileTranslations } from "../../lib/i18n/useMobileTranslations";
import { clearAllEntityStores } from "../../lib/store";
import { supabase } from "../../lib/supabase/client";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../../theme/tokens";
import { SettingsAccountProfileCard } from "./components/SettingsAccountProfileCard";
import { SettingsActionButton } from "./components/SettingsActionButton";
import { SettingsAsyncState } from "./components/SettingsAsyncState";

export function SettingsAccountScreen() {
  const router = useRouter();
  const t = useMobileTranslations();
  const colors = useMobileThemeColors();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [fallbackName, setFallbackName] = useState<string | null>(null);
  const [fallbackAvatarUrl, setFallbackAvatarUrl] = useState<string | null>(null);
  const [myselfContact, setMyselfContact] = useState<Contact | null>(null);
  const [pendingAction, setPendingAction] = useState<
    "logout" | "delete" | null
  >(null);
  const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadAccount = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const settingsResponse = await fetchSettings();
      setEmail(settingsResponse.data?.email ?? null);
      setFallbackName(settingsResponse.data?.name ?? null);
      setFallbackAvatarUrl(settingsResponse.data?.avatarUrl ?? null);

      try {
        const myselfResponse = await fetchMyselfContact();
        setMyselfContact(myselfResponse.contact);
      } catch {
        setMyselfContact(null);
      }
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : t("MobileApp.Settings.AccountLoadErrorDescription"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  const signOut = async () => {
    if (!supabase) {
      throw new Error(t("MobileApp.Auth.MissingConfig"));
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(
        error.message || t("SettingsPage.DataManagement.SignOutError"),
      );
    }
  };

  const handleLogout = async () => {
    if (pendingAction) {
      return;
    }

    setActionError(null);
    setPendingAction("logout");

    try {
      await signOut();
      clearAllEntityStores();
    } catch (logoutError) {
      setActionError(
        logoutError instanceof Error
          ? logoutError.message
          : t("SettingsPage.DataManagement.SignOutError"),
      );
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

      if (supabase) {
        await supabase.auth.signOut({ scope: "local" });
      }
      clearAllEntityStores();

      setDeleteConfirmOpen(false);
      Alert.alert(
        t("SettingsPage.DataManagement.DeleteSuccess"),
        t("SettingsPage.DataManagement.AccountDeleted"),
      );
    } catch (deleteError) {
      setActionError(
        deleteError instanceof Error
          ? deleteError.message
          : t("SettingsPage.DataManagement.DeleteError"),
      );
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
        variant="elevated"
        title={t("MobileApp.Settings.Account")}
        onBack={() => router.back()}
      />

      <ScrollView
        style={[styles.screen, { backgroundColor: colors.appBackground }]}
        contentContainerStyle={styles.content}
      >
        <SettingsAsyncState
          isLoading={isLoading}
          errorTitle={t("MobileApp.Settings.AccountLoadErrorTitle")}
          errorDescription={loadError}
          loadingMinHeight={120}
          onRetry={() => {
            void loadAccount();
          }}
        >
          <SettingsAccountProfileCard
            contact={myselfContact}
            email={email}
            fallbackName={fallbackName}
            fallbackAvatarUrl={fallbackAvatarUrl}
          />
        </SettingsAsyncState>

        {!isLoading && !loadError ? (
          <View style={styles.actionsWrap}>
            <SettingsActionButton
              label={t("SettingsPage.DataManagement.SignOutButton")}
              tone="neutral"
              variant="outline"
              icon={<IconLogout size={16} color={colors.textSecondary} />}
              loading={pendingAction === "logout"}
              disabled={pendingAction !== null}
              onPress={() => {
                void handleLogout();
              }}
            />

            <SettingsActionButton
              label={t("SettingsPage.DataManagement.DeleteButton")}
              tone="danger"
              variant="outline"
              icon={<IconTrash size={16} color={colors.dangerAccent} />}
              loading={pendingAction === "delete"}
              disabled={pendingAction !== null}
              onPress={() => setDeleteConfirmOpen(true)}
            />

            {actionError ? (
              <Text style={[styles.errorText, { color: colors.dangerText }]}>
                {actionError}
              </Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <ActionSheetPopup
        open={isDeleteConfirmOpen}
        title={t("SettingsPage.DataManagement.DeleteConfirmTitle")}
        isBusy={pendingAction === "delete"}
        onOpenChange={setDeleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        actions={[
          {
            label: t("SettingsPage.DataManagement.DeleteCancelButton"),
            onPress: () => setDeleteConfirmOpen(false),
            disabled: pendingAction === "delete",
            tone: "neutral",
            variant: "outline",
          },
          {
            label: t("SettingsPage.DataManagement.DeleteConfirmButton"),
            icon: <IconTrash size={16} color={colors.textOnPrimary} />,
            onPress: confirmDeleteAccount,
            loading: pendingAction === "delete",
            disabled: pendingAction === "delete",
            tone: "danger",
            variant: "filled",
          },
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingTop: MOBILE_LAYOUT.spacing.contentTop,
    paddingHorizontal: MOBILE_LAYOUT.spacing.horizontal,
    paddingBottom: MOBILE_LAYOUT.spacing.contentBottom,
    gap: 16,
  },
  actionsWrap: {
    gap: 10,
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
    textAlign: "left",
  },
});
