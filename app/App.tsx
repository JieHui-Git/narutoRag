import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { SettingsProvider } from "./context/SettingsContext";
import OnboardingScreen from "./screens/OnboardingScreen";
import HomeScreen from "./screens/HomeScreen";
import ChatScreen from "./screens/ChatScreen";
import SettingsScreen from "./screens/SettingsScreen";

export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  Chat: { initialQuestion?: string };
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [initialRoute, setInitialRoute] = useState<"Onboarding" | "Home" | null>(null);

  useEffect(() => {
    AsyncStorage.getItem("onboarded").then((val) => {
      setInitialRoute(val === "true" ? "Home" : "Onboarding");
    });
  }, []);

  // Don't render until we know which screen to start on
  if (!initialRoute) return null;

  return (
    <SettingsProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{
            headerStyle: { backgroundColor: "#0D1117" },
            headerTintColor: "#E8EAF0",
            headerTitleStyle: { fontWeight: "700" },
            contentStyle: { backgroundColor: "#0D1117" },
          }}
        >
          <Stack.Screen
            name="Onboarding"
            component={OnboardingScreen}
            options={{ headerShown: false }}
          />
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
