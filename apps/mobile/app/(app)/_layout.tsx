import { Stack } from "expo-router";
import { useEffect } from "react";
import { SyncErrorToasts } from "../../src/components/SyncErrorToasts";
import { fetchSettings } from "../../src/lib/api/online-only";
import { NavigationProvider } from "../../src/lib/navigation/NavigationProvider";
import type {
  GroupSortOrder,
  MobilePreferencesState,
  SwipeAction,
  TagSortOrder,
} from "../../src/lib/preferences/useMobilePreferences";
import { useMobilePreferences } from "../../src/lib/preferences/useMobilePreferences";
import { SqliteQueryProvider } from "../../src/lib/sync/SqliteQueryProvider";
import { SyncProvider } from "../../src/lib/sync/SyncProvider";

export const unstable_settings = {
  anchor: "(tabs)",
};

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
          groupSortOrder: response.data.groupSortOrder as GroupSortOrder,
          leftSwipeAction: response.data.leftSwipeAction as SwipeAction,
          rightSwipeAction: response.data.rightSwipeAction as SwipeAction,
          tagSortOrder: response.data.tagSortOrder as TagSortOrder,
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
    <SqliteQueryProvider>
      <SyncProvider>
        <NavigationProvider>
          <SyncErrorToasts />
          <PreferencesHydration />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen
              dangerouslySingular={(_name, params) => String(params?.id ?? "")}
              name="contact/[id]/index"
            />
          </Stack>
        </NavigationProvider>
      </SyncProvider>
    </SqliteQueryProvider>
  );
}
