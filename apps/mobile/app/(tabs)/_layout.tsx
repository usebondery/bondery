import { Redirect, Tabs } from "expo-router";
import { IconAddressBook, IconSettings } from "@tabler/icons-react-native";
import { ActivityIndicator, View } from "react-native";
import { useAuthSession } from "../../src/lib/auth/useAuthSession";

export default function TabsLayout() {
  const { session, isLoadingSession } = useAuthSession();

  if (isLoadingSession) {
    return (
      <View
        style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}
      >
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      initialRouteName="contacts"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#111827",
        tabBarInactiveTintColor: "#6b7280",
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="contacts"
        options={{
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <IconAddressBook stroke={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <IconSettings stroke={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
