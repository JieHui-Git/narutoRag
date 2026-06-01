import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../App";
import { useSettings } from "../context/SettingsContext";
import { SpoilerMode } from "../api";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Onboarding">;
};

const QUICK_PICKS = [
  { label: "Just started", episode: 1 },
  { label: "Finished Part 1", episode: 135 },
  { label: "Mid-Shippuden", episode: 200 },
  { label: "Finished Shippuden", episode: 500 },
  { label: "Watched everything", episode: 9999 },
];

export default function OnboardingScreen({ navigation }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const { setSpoilerMode, setMaxEpisode } = useSettings();

  async function handleContinue() {
    if (selected === null) return;

    const isFullSeries = selected === 9999;
    const mode: SpoilerMode = isFullSeries ? "full" : "safe";

    setSpoilerMode(mode);
    setMaxEpisode(selected);

    // Mark onboarding as done so it never shows again
    await AsyncStorage.setItem("onboarded", "true");
    navigation.replace("Home");
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>NarutoQ</Text>
          <Text style={styles.subtitle}>Before we start —</Text>
          <Text style={styles.question}>How far are you in the series?</Text>
          <Text style={styles.hint}>
            This sets your spoiler boundary. You can change it anytime in Settings.
          </Text>
        </View>

        <View style={styles.options}>
          {QUICK_PICKS.map((pick) => (
            <TouchableOpacity
              key={pick.episode}
              style={[styles.option, selected === pick.episode && styles.optionSelected]}
              onPress={() => setSelected(pick.episode)}
            >
              <View style={[styles.radio, selected === pick.episode && styles.radioSelected]}>
                {selected === pick.episode && <View style={styles.radioDot} />}
              </View>
              <Text style={[styles.optionLabel, selected === pick.episode && styles.optionLabelSelected]}>
                {pick.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.continueBtn, selected === null && styles.continueBtnDisabled]}
          onPress={handleContinue}
          disabled={selected === null}
        >
          <Text style={styles.continueBtnText}>Let's go →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D1117" },
  scroll: { padding: 24, flexGrow: 1 },
  header: { marginBottom: 32, marginTop: 20 },
  title: {
    fontSize: 36,
    fontWeight: "800",
    color: "#E8671A",
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7A99",
    marginBottom: 4,
  },
  question: {
    fontSize: 26,
    fontWeight: "700",
    color: "#E8EAF0",
    marginBottom: 10,
  },
  hint: {
    fontSize: 13,
    color: "#5A6A7A",
    lineHeight: 18,
  },
  options: { gap: 10, marginBottom: 32 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#161B22",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#21262D",
  },
  optionSelected: {
    borderColor: "#E8671A",
    backgroundColor: "#1E1610",
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#3A4A5A",
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: { borderColor: "#E8671A" },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E8671A",
  },
  optionLabel: { fontSize: 16, color: "#8B9BB4" },
  optionLabelSelected: { color: "#E8EAF0", fontWeight: "600" },
  continueBtn: {
    backgroundColor: "#E8671A",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  continueBtnDisabled: { opacity: 0.35 },
  continueBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
