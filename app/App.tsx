import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { SettingsProvider } from "./context/SettingsContext";
import HomeScreen from "./screens/HomeScreen";
import ChatScreen from "./screens/ChatScreen";
import SettingsScreen from "./screens/SettingsScreen";

export type RootStackParamList = {
  Home: undefined;
  Chat: { initialQuestion?: string };
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SettingsProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: { backgroundColor: "#0D1117" },
            headerTintColor: "#E8EAF0",
            headerTitleStyle: { fontWeight: "700" },
            contentStyle: { backgroundColor: "#0D1117" },
          }}
        >
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={{ title: "NarutoQ" }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: "Spoiler Settings" }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SettingsProvider>
  );
}
