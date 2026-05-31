import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../App";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Home">;
};

export default function HomeScreen({ navigation }: Props) {
  const [question, setQuestion] = useState("");

  function handleAsk() {
    if (!question.trim()) return;
    navigation.navigate("Chat", { initialQuestion: question.trim() });
    setQuestion("");
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.hero}>
          <Text style={styles.title}>NarutoQ</Text>
          <Text style={styles.subtitle}>Ask anything about the Naruto universe</Text>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.bottom}
        >
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="How did Jiraiya die?"
              placeholderTextColor="#5A6A7A"
              value={question}
              onChangeText={setQuestion}
              onSubmitEditing={handleAsk}
              returnKeyType="search"
            />
            <TouchableOpacity style={styles.askBtn} onPress={handleAsk}>
              <Text style={styles.askBtnText}>Ask</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.hints}>
            {[
              "What is the Sharingan?",
              "How strong is Might Guy?",
              "Who are the Akatsuki members?",
            ].map((hint) => (
              <TouchableOpacity
                key={hint}
                style={styles.hintChip}
                onPress={() => {
                  setQuestion(hint);
                  navigation.navigate("Chat", { initialQuestion: hint });
                }}
              >
                <Text style={styles.hintText}>{hint}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => navigation.navigate("Settings")}
          >
            <Text style={styles.settingsBtnText}>⚙ Spoiler Settings</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0D1117",
    paddingHorizontal: 20,
  },
  flex: {
    flex: 1,
  },
  bottom: {
    paddingBottom: 8,
  },
  hero: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 48,
    fontWeight: "800",
    color: "#E8671A",
    letterSpacing: -1,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    color: "#6B7A99",
    textAlign: "center",
  },
  inputRow: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#161B22",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#E8EAF0",
    borderWidth: 1,
    borderColor: "#21262D",
  },
  askBtn: {
    backgroundColor: "#E8671A",
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  askBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  hints: {
    gap: 8,
    marginBottom: 24,
  },
  hintChip: {
    backgroundColor: "#161B22",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#21262D",
  },
  hintText: {
    color: "#8B9BB4",
    fontSize: 14,
  },
  settingsBtn: {
    alignItems: "center",
    paddingVertical: 16,
  },
  settingsBtnText: {
    color: "#6B7A99",
    fontSize: 14,
  },
});
