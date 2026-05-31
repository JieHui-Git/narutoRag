import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface Props {
  text: string;
  isUser: boolean;
  sources?: string[];
  isSpoiler?: boolean;
}

export default function ChatBubble({ text, isUser, sources, isSpoiler }: Props) {
  return (
    <View style={[styles.row, isUser ? styles.userRow : styles.botRow]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : isSpoiler ? styles.spoilerBubble : styles.botBubble]}>
        <Text style={[styles.text, isUser ? styles.userText : styles.botText]}>
          {text}
        </Text>
        {sources && sources.length > 0 && (
          <Text style={styles.source}>From: {sources.join(", ")}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginVertical: 4,
    paddingHorizontal: 12,
  },
  userRow: { alignItems: "flex-end" },
  botRow: { alignItems: "flex-start" },
  bubble: {
    maxWidth: "82%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: "#E8671A",
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: "#1E2A3A",
    borderBottomLeftRadius: 4,
  },
  spoilerBubble: {
    backgroundColor: "#2A1E3A",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#7B4FBF",
  },
  text: { fontSize: 15, lineHeight: 21 },
  userText: { color: "#fff" },
  botText: { color: "#E8EAF0" },
  source: {
    marginTop: 6,
    fontSize: 11,
    color: "#6B7A99",
    fontStyle: "italic",
  },
});
