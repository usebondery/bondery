import { IconSettings, IconUser } from "@tabler/icons-react-native";
import { Tabs } from "expo-router";
import { View } from "react-native";
import { CreateContactSheetProvider } from "../../../src/features/contacts/createContactSheetContext";
import { FloatingTabsChrome } from "../../../src/features/navigation/FloatingTabsChrome";
import { FloatingChromeProvider } from "../../../src/features/navigation/floatingChromeContext";
import { FloatingChromeInsetsProvider } from "../../../src/features/navigation/floatingChromeInsetsContext";
import {
  TabBarPropsProvider,
  TabBarPropsSync,
} from "../../../src/features/navigation/tabBarPropsContext";
import { TabSearchFocusProvider } from "../../../src/features/navigation/tabSearchFocusContext";

function TabsLayoutContent() {
  return (
    <FloatingChromeInsetsProvider>
      <TabSearchFocusProvider>
        <TabBarPropsProvider>
          <View style={{ flex: 1 }}>
            <Tabs
              screenOptions={{
                headerShown: false,
                tabBarShowLabel: false,
                tabBarStyle: {
                  display: "none",
                },
              }}
              tabBar={(props) => <TabBarPropsSync {...props} />}
            >
              <Tabs.Screen
                name="contacts"
                options={{
                  tabBarIcon: ({ color, size }) => <IconUser size={size} stroke={color} />,
                }}
              />
              <Tabs.Screen
                name="settings"
                options={{
                  tabBarIcon: ({ color, size }) => <IconSettings size={size} stroke={color} />,
                }}
              />
            </Tabs>
            <FloatingTabsChrome />
          </View>
        </TabBarPropsProvider>
      </TabSearchFocusProvider>
    </FloatingChromeInsetsProvider>
  );
}

export default function TabsLayout() {
  return (
    <CreateContactSheetProvider>
      <FloatingChromeProvider>
        <TabsLayoutContent />
      </FloatingChromeProvider>
    </CreateContactSheetProvider>
  );
}
