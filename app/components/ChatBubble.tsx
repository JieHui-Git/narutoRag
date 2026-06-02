import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

interface Props {
  text: string;
  isUser: boolean;
  sources?: string[];
  isSpoiler?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

export default function ChatBubble({ text, isUser, sources, isSpoiler, isError, onRetry }: Props) {
  if (isError) {
    return (
      <View style={styles.errorRow}>
        <View style={styles.errorBubble}>
          <Text style={styles.errorIcon}>⚠</Text>
          <Text style={styles.errorText}>{text}</Text>
          {onRetry && (
            <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  if (isSpoiler) {
    return (
      <View style={styles.spoilerRow}>
        <View style={styles.spoilerBubble}>
          <Text style={styles.spoilerIcon}>🍃</Text>
          <Text style={styles.spoilerTitle}>Spoiler ahead</Text>
          <Text style={styles.spoilerBody}>
            That happens after where you are in the series. Head to{" "}
            <Text style={styles.spoilerLink}>Spoiler Settings</Text> to unlock
            it when you're ready.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.row, isUser ? styles.userRow : styles.botRow]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
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
  text: { fontSize: 15, lineHeight: 21 },
  userText: { color: "#fff" },
  botText: { color: "#E8EAF0" },
  source: {
    marginTop: 6,
    fontSize: 11,
    color: "#6B7A99",
    fontStyle: "italic",
  },

  // Error styles
  errorRow: {
    marginVertical: 4,
    paddingHorizontal: 12,
    alignItems: "flex-start",
  },
  errorBubble: {
    maxWidth: "82%",
    backgroundColor: "#1A1010",
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#6B2020",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  errorIcon: { fontSize: 16 },
  errorText: { fontSize: 14, color: "#C47A7A", lineHeight: 20 },
  retryBtn: {
    marginTop: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#2A1515",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#6B2020",
  },
  retryText: { color: "#E88080", fontSize: 13, fontWeight: "600" },

  // Spoiler boundary styles
  spoilerRow: {
    marginVertical: 4,
    paddingHorizontal: 12,
    alignItems: "flex-start",
  },
  spoilerBubble: {
    maxWidth: "82%",
    backgroundColor: "#12101A",
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#3D2A6B",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  spoilerIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  spoilerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#9B72E8",
  },
  spoilerBody: {
    fontSize: 14,
    lineHeight: 20,
    color: "#7A7A9A",
  },
  spoilerLink: {
    color: "#9B72E8",
    fontWeight: "600",
  },
});
