import React from "react";
import { View, Text, StyleSheet, Pressable, Alert } from "react-native";
import { QuestionMarkCircleIcon } from "react-native-heroicons/outline";
import { useUserCapabilities } from "../context/UserCapabilitiesContext";

export default function TranslatorSetupScreen({ navigation }) {
  const { setCapabilityEnabled } = useUserCapabilities();

  const handleEnableTranslator = async () => {
    await setCapabilityEnabled("translator", true);
    Alert.alert("Translator access enabled", "You can now access translator tools.", [
      {
        text: "Continue",
        onPress: () => navigation.goBack(),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <QuestionMarkCircleIcon size={48} color="#1F1F1F" />
      <Text style={styles.title}>Become a translator</Text>
      <Text style={styles.description}>
        Enable translator capability to access translator profile and translation request tools.
      </Text>

      <Pressable style={styles.primaryButton} onPress={handleEnableTranslator}>
        <Text style={styles.primaryButtonText}>Enable Translator Capability</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    marginTop: 16,
    fontSize: 24,
    fontWeight: "800",
    color: "#1F1F1F",
  },
  description: {
    marginTop: 10,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: "#1F1F1F",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
