import React from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView,
} from "react-native";
import { useSettings } from "../context/SettingsContext";
import { SpoilerMode } from "../api";
import ArcPicker from "../components/ArcPicker";
import SpoilerToggle from "../components/SpoilerToggle";

export default function SettingsScreen() {
  const { spoilerMode, maxEpisode, completedArcIds, setSpoilerMode, setMaxEpisode, setCompletedArcIds } = useSettings();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionTitle}>Spoiler Mode</Text>
        <SpoilerToggle value={spoilerMode} onChange={setSpoilerMode} />

        {spoilerMode === "safe" && (
          <View style={styles.episodeSection}>
            <Text style={styles.sectionTitle}>Current Episode</Text>
            <Text style={styles.episodeDisplay}>{maxEpisode}</Text>
            <View style={styles.episodeButtons}>
              {[-10, -1, +1, +10].map((delta) => (
                <TouchableOpacity
                  key={delta}
                  style={styles.epBtn}
                  onPress={() => setMaxEpisode(Math.max(1, maxEpisode + delta))}
                >
                  <Text style={styles.epBtnText}>
                    {delta > 0 ? `+${delta}` : delta}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.hint}>
              Only content up to episode {maxEpisode} will be used to answer questions.
            </Text>
          </View>
        )}

        {spoilerMode === "custom" && (
          <View style={styles.arcSection}>
            <Text style={styles.sectionTitle}>Arcs You've Watched</Text>
            <ArcPicker
              selected={completedArcIds}
              onChange={setCompletedArcIds}
            />
          </View>
        )}

        {spoilerMode === "full" && (
          <View style={styles.fullModeNote}>
            <Text style={styles.fullModeText}>
              ⚠️  Full series mode — all content is available. Spoilers are possible.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D1117" },
  scroll: { padding: 20 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7A99",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
    marginTop: 8,
  },
  episodeSection: { marginTop: 24 },
  episodeDisplay: {
    fontSize: 56,
    fontWeight: "800",
    color: "#E8671A",
    textAlign: "center",
    marginVertical: 8,
  },
  episodeButtons: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 12,
  },
  epBtn: {
    backgroundColor: "#161B22",
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#21262D",
    minWidth: 56,
    alignItems: "center",
  },
  epBtnText: { color: "#E8EAF0", fontSize: 15, fontWeight: "600" },
  hint: { color: "#5A6A7A", fontSize: 13, textAlign: "center", marginTop: 8 },
  arcSection: { marginTop: 24 },
  fullModeNote: {
    marginTop: 24,
    backgroundColor: "#1E1A0E",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#4A3800",
  },
  fullModeText: { color: "#C4A84A", fontSize: 14, lineHeight: 20 },
});
