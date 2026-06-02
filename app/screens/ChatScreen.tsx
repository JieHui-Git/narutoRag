import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, Keyboard,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../App";
import ChatBubble from "../components/ChatBubble";
import { askQuestion, QueryError } from "../api";
import { useSettings } from "../context/SettingsContext";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Chat">;
  route: RouteProp<RootStackParamList, "Chat">;
};

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  sources?: string[];
  isSpoiler?: boolean;
  isError?: boolean;
  originalQuestion?: string;
}

export default function ChatScreen({ navigation, route }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const listRef = useRef<FlatList>(null);
  const { spoilerMode, maxEpisode } = useSettings();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    if (route.params?.initialQuestion) {
      sendMessage(route.params.initialQuestion);
    }
  }, []);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    setMessages((prev) => [...prev, {
      id: Date.now().toString(),
      text: text.trim(),
      isUser: true,
    }]);
    setInput("");
    setLoading(true);

    try {
      const res = await askQuestion({
        question: text.trim(),
        spoiler_mode: spoilerMode,
        max_episode: maxEpisode,
      });

      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        text: res.answer,
        isUser: false,
        sources: res.sources,
        isSpoiler: res.spoiler_boundary_hit,
      }]);
    } catch (err) {
      const errorText = err instanceof QueryError && err.type === "rate_limit"
        ? "Too many requests — try again in a moment."
        : err instanceof QueryError && err.type === "network"
        ? "Can't reach the server. Check your WiFi or make sure the backend is running."
        : "Something went wrong. Please try again.";

      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        text: errorText,
        isUser: false,
        isError: true,
        originalQuestion: text.trim(),
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  const bottomPad = keyboardHeight > 0 ? keyboardHeight : insets.bottom;

  return (
    <SafeAreaView style={[styles.container, { paddingBottom: bottomPad }]} edges={["bottom"]}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => (
          <ChatBubble
            text={item.text}
            isUser={item.isUser}
            sources={item.sources}
            isSpoiler={item.isSpoiler}
            isError={item.isError}
            onRetry={item.originalQuestion
              ? () => {
                  setMessages((prev) => prev.filter((m) => m.id !== item.id));
                  sendMessage(item.originalQuestion!);
                }
              : undefined}
          />
        )}
        contentContainerStyle={styles.list}
        onContentSizeChange={() =>
          listRef.current?.scrollToEnd({ animated: false })
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Ask anything about Naruto</Text>
          </View>
        }
      />

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#E8671A" />
          <Text style={styles.loadingText}>Searching the scrolls...</Text>
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ask a question..."
          placeholderTextColor="#5A6A7A"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => sendMessage(input)}
          returnKeyType="send"
          editable={!loading}
        />
        <TouchableOpacity
          style={[styles.sendBtn, loading && styles.sendBtnDisabled]}
          onPress={() => sendMessage(input)}
          disabled={loading}
        >
          <Text style={styles.sendBtnText}>↑</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D1117" },
  list: { paddingVertical: 12 },
  empty: {
    flex: 1,
    alignItems: "center",
    marginTop: 80,
  },
  emptyText: { color: "#3A4A5A", fontSize: 15 },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  loadingText: { color: "#6B7A99", fontSize: 13 },
  inputRow: {
    flexDirection: "row",
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#21262D",
  },
  input: {
    flex: 1,
    backgroundColor: "#161B22",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: "#E8EAF0",
    borderWidth: 1,
    borderColor: "#21262D",
  },
  sendBtn: {
    backgroundColor: "#E8671A",
    borderRadius: 22,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: "#fff", fontSize: 20, fontWeight: "700" },
});
