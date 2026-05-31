import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SpoilerMode } from "../api";

const OPTIONS: { value: SpoilerMode; label: string; description: string }[] = [
  { value: "safe", label: "🛡 Safe", description: "Filter by your current episode" },
  { value: "custom", label: "🎯 Custom", description: "Choose which arcs you've watched" },
  { value: "full", label: "⚠️ Full Series", description: "No filter — all content available" },
];

interface Props {
  value: SpoilerMode;
  onChange: (mode: SpoilerMode) => void;
}

export default function SpoilerToggle({ value, onChange }: Props) {
  return (
    <View style={styles.container}>
      {OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[styles.option, value === opt.value && styles.optionActive]}
          onPress={() => onChange(opt.value)}
        >
          <Text style={[styles.label, value === opt.value && styles.labelActive]}>
            {opt.label}
          </Text>
          <Text style={styles.description}>{opt.description}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  option: {
    backgroundColor: "#161B22",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#21262D",
  },
  optionActive: {
    borderColor: "#E8671A",
    backgroundColor: "#1E1610",
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#8B9BB4",
    marginBottom: 2,
  },
  labelActive: { color: "#E8671A" },
  description: { fontSize: 13, color: "#5A6A7A" },
});
