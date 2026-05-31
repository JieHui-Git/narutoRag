import React from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";

const ARCS = [
  // Part 1
  { id: "land_of_waves", name: "Land of Waves", part: "Part 1", episode_end: 19 },
  { id: "chunin_exams", name: "Chunin Exams", part: "Part 1", episode_end: 67 },
  { id: "konoha_crush", name: "Konoha Crush", part: "Part 1", episode_end: 80 },
  { id: "search_for_tsunade", name: "Search for Tsunade", part: "Part 1", episode_end: 100 },
  { id: "sasuke_retrieval", name: "Sasuke Retrieval", part: "Part 1", episode_end: 135 },
  // Shippuden
  { id: "kazekage_rescue", name: "Kazekage Rescue", part: "Shippuden", episode_end: 32 },
  { id: "sai_and_sasuke", name: "Sai and Sasuke", part: "Shippuden", episode_end: 53 },
  { id: "hidan_kakuzu", name: "Hidan and Kakuzu", part: "Shippuden", episode_end: 88 },
  { id: "jiraiya_arc", name: "Tale of Jiraiya the Gallant", part: "Shippuden", episode_end: 152 },
  { id: "pain_assault", name: "Pain's Assault", part: "Shippuden", episode_end: 175 },
  { id: "five_kage_summit", name: "Five Kage Summit", part: "Shippuden", episode_end: 214 },
  { id: "fourth_shinobi_war_confrontation", name: "4th Shinobi War: Confrontation", part: "Shippuden", episode_end: 321 },
  { id: "fourth_shinobi_war_climax", name: "4th Shinobi War: Climax", part: "Shippuden", episode_end: 375 },
  { id: "kaguya_otsutsuki_strikes", name: "Kaguya Otsutsuki Strikes", part: "Shippuden", episode_end: 479 },
];

const PARTS = ["Part 1", "Shippuden"];

interface Props {
  selected: string[];
  onChange: (ids: string[]) => void;
}

export default function ArcPicker({ selected, onChange }: Props) {
  function toggle(id: string, episode_end: number) {
    if (selected.includes(id)) {
      onChange(selected.filter((a) => a !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  function markAllInPart(part: string) {
    const partIds = ARCS.filter((a) => a.part === part).map((a) => a.id);
    const allSelected = partIds.every((id) => selected.includes(id));
    if (allSelected) {
      onChange(selected.filter((id) => !partIds.includes(id)));
    } else {
      onChange([...new Set([...selected, ...partIds])]);
    }
  }

  return (
    <View style={styles.container}>
      {PARTS.map((part) => {
        const arcs = ARCS.filter((a) => a.part === part);
        const allSelected = arcs.every((a) => selected.includes(a.id));
        return (
          <View key={part} style={styles.group}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupTitle}>{part}</Text>
              <TouchableOpacity onPress={() => markAllInPart(part)}>
                <Text style={styles.markAll}>
                  {allSelected ? "Deselect all" : "Select all"}
                </Text>
              </TouchableOpacity>
            </View>
            {arcs.map((arc) => {
              const isSelected = selected.includes(arc.id);
              return (
                <TouchableOpacity
                  key={arc.id}
                  style={[styles.arc, isSelected && styles.arcSelected]}
                  onPress={() => toggle(arc.id, arc.episode_end)}
                >
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={[styles.arcName, isSelected && styles.arcNameSelected]}>
                    {arc.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 20 },
  group: { gap: 6 },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#5A6A7A",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  markAll: { fontSize: 12, color: "#E8671A" },
  arc: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#161B22",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#21262D",
  },
  arcSelected: { borderColor: "#E8671A", backgroundColor: "#1E1610" },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#3A4A5A",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: { backgroundColor: "#E8671A", borderColor: "#E8671A" },
  checkmark: { color: "#fff", fontSize: 12, fontWeight: "700" },
  arcName: { fontSize: 14, color: "#8B9BB4" },
  arcNameSelected: { color: "#E8EAF0" },
});
