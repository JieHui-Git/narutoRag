import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../App";
import ChatBubble from "../components/ChatBubble";
import { askQuestion } from "../api";
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
}

export default function ChatScreen({ navigation, route }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);
  const { spoilerMode, maxEpisode } = useSettings();

  // Scroll to bottom whenever keyboard opens so messages stay visible
  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidShow", () => {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (route.params?.initialQuestion) {
      sendMessage(route.params.initialQuestion);
    }
  }, []);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      isUser: true,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await askQuestion({
        question: text.trim(),
        spoiler_mode: spoilerMode,
        max_episode: maxEpisode,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: res.answer,
          isUser: false,
          sources: res.sources,
          isSpoiler: res.spoiler_boundary_hit,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: "Couldn't reach the server. Make sure the backend is running.",
          isUser: false,
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  return (
    // edges={["bottom"]} — nav header already handles top, we only need bottom safe area
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 44 : 0}
      >
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D1117" },
  flex: { flex: 1 },
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
