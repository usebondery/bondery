import { Tabs } from "expo-router";
import { IconSettings, IconUser } from "@tabler/icons-react-native";
import { View } from "react-native";
import { CreateContactSheetProvider } from "../../../src/features/contacts/createContactSheetContext";
import { FabSpeedDialShell } from "../../../src/features/navigation/FabSpeedDialShell";
import { FloatingTabsChrome } from "../../../src/features/navigation/FloatingTabsChrome";
import { FloatingChromeProvider } from "../../../src/features/navigation/floatingChromeContext";
import {
  TabBarPropsProvider,
  TabBarPropsSync,
} from "../../../src/features/navigation/tabBarPropsContext";

function TabsLayoutContent() {
  return (
    <TabBarPropsProvider>
      <View style={{ flex: 1 }}>
        <Tabs
          initialRouteName="contacts"
          tabBar={(props) => <TabBarPropsSync {...props} />}
          screenOptions={{
            headerShown: false,
            tabBarShowLabel: false,
            tabBarStyle: {
              display: "none",
            },
          }}
        >
          <Tabs.Screen
            name="contacts"
            options={{
              tabBarIcon: ({ color, size }) => (
                <IconUser stroke={color} size={size} />
              ),
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              tabBarIcon: ({ color, size }) => (
                <IconSettings stroke={color} size={size} />
              ),
            }}
          />
        </Tabs>
        <FloatingTabsChrome />
      </View>
    </TabBarPropsProvider>
  );
}

export default function TabsLayout() {
  return (
    <CreateContactSheetProvider>
      <FloatingChromeProvider>
        <FabSpeedDialShell>
          <TabsLayoutContent />
        </FabSpeedDialShell>
      </FloatingChromeProvider>
    </CreateContactSheetProvider>
  );
}
