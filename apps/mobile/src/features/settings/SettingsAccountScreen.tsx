import { getUserFacingError } from "@bondery/helpers/api";
import type { Contact } from "@bondery/schemas";
import { IconLogout, IconTrash } from "@tabler/icons-react-native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { ActionSheetPopup } from "../../components/ActionSheetPopup";
import { StackNavBar } from "../../components/chrome";
import { deleteMyAccount, fetchSettings } from "../../lib/api/client";
import {
  useCommonTranslations,
  useMobileAuthTranslations,
  useMobileSettingsTranslations,
  useSettingsPageTranslations,
} from "../../lib/i18n/generated/hooks";
import { supabase } from "../../lib/supabase/client";
import { useMyselfContact } from "../../lib/sync/hooks/useSyncQuery";
import { MOBILE_LAYOUT } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { SettingsAccountProfileCard } from "./components/SettingsAccountProfileCard";
import { SettingsActionButton } from "./components/SettingsActionButton";
import { SettingsAsyncState } from "./components/SettingsAsyncState";

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
  const [myselfContact, setMyselfContact] = useState<Contact | null>(null);
  const { data: syncedMyself } = useMyselfContact();
  const [pendingAction, setPendingAction] = useState<"logout" | "delete" | null>(null);
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
    } catch (err) {
      setLoadError(getUserFacingError(err, t));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    setMyselfContact(syncedMyself);
  }, [syncedMyself]);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  const signOut = async () => {
    if (!supabase) {
      throw new Error(tMobileAuth("MissingConfig"));
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(getUserFacingError(error, t));
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
    } catch (logoutError) {
      setActionError(getUserFacingError(logoutError, t));
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

      setDeleteConfirmOpen(false);
      Alert.alert(
        tSettingsPage("DataManagement.DeleteSuccess"),
        tSettingsPage("DataManagement.AccountDeleted"),
      );
    } catch (deleteError) {
      setActionError(getUserFacingError(deleteError, t));
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
        onBack={() => router.back()}
        title={tMobileSettings("Account")}
        variant="elevated"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        style={[styles.screen, { backgroundColor: colors.appBackground }]}
      >
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
          <View style={styles.actionsWrap}>
            <SettingsActionButton
              disabled={pendingAction !== null}
              icon={<IconLogout color={colors.textSecondary} size={16} />}
              label={tSettingsPage("DataManagement.SignOutButton")}
              onPress={() => {
                void handleLogout();
              }}
              tone="neutral"
              variant="outline"
            />

            <SettingsActionButton
              disabled={pendingAction !== null}
              icon={<IconTrash color={colors.dangerAccent} size={16} />}
              label={tSettingsPage("DataManagement.DeleteButton")}
              onPress={() => setDeleteConfirmOpen(true)}
              tone="danger"
              variant="outline"
            />

            {actionError ? (
              <Text style={[styles.errorText, { color: colors.dangerText }]}>{actionError}</Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <ActionSheetPopup
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
            onPress: confirmDeleteAccount,
            tone: "danger",
            variant: "filled",
          },
        ]}
        isBusy={pendingAction === "delete"}
        onClose={() => setDeleteConfirmOpen(false)}
        onOpenChange={setDeleteConfirmOpen}
        open={isDeleteConfirmOpen}
        title={tSettingsPage("DataManagement.DeleteConfirmTitle")}
      />
    </>
  );
}

const styles = StyleSheet.create({
  actionsWrap: {
    gap: 10,
  },
  content: {
    gap: 16,
    paddingBottom: MOBILE_LAYOUT.spacing.contentBottom,
    paddingHorizontal: MOBILE_LAYOUT.spacing.horizontal,
    paddingTop: MOBILE_LAYOUT.spacing.contentTop,
  },
  errorText: {
    fontSize: 12,
    marginTop: 6,
    textAlign: "left",
  },
  screen: {
    flex: 1,
  },
});
