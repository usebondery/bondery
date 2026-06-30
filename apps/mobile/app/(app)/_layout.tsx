import { useEffect } from "react";
import { Stack } from "expo-router";
import { SyncErrorToasts } from "../../src/components/SyncErrorToasts";
import { fetchSettings } from "../../src/lib/api/online-only";
import type { MobilePreferencesState } from "../../src/lib/preferences/useMobilePreferences";
import { useMobilePreferences } from "../../src/lib/preferences/useMobilePreferences";

function PreferencesHydration() {
  const hydrateFromServer = useMobilePreferences(
    (state: MobilePreferencesState) => state.hydrateFromServer,
  );

  useEffect(() => {
    let isSubscribed = true;

    const hydrate = async () => {
      try {
        const response = await fetchSettings();
        if (!isSubscribed) {
          return;
        }
        hydrateFromServer({
          leftSwipeAction: response.data.leftSwipeAction,
          rightSwipeAction: response.data.rightSwipeAction,
          groupSortOrder: response.data.groupSortOrder,
          tagSortOrder: response.data.tagSortOrder,
        });
      } catch {
        // Ignore hydration errors; local persisted preferences remain in use.
      }
    };

    void hydrate();

    return () => {
      isSubscribed = false;
    };
  }, [hydrateFromServer]);

  return null;
}

export default function AppLayout() {
  return (
    <>
      <SyncErrorToasts />
      <PreferencesHydration />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
