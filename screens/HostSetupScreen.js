import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { PencilIcon } from "react-native-heroicons/outline";
import { useUser } from "../context/UserContext";

export default function HostSetupScreen({ navigation }) {
  const { currentUser } = useUser();
  const isHost = Boolean(currentUser?.roles?.host);

  return (
    <View style={styles.container}>
      <PencilIcon size={48} color="#1F1F1F" />
      <Text style={styles.title}>Create a workshop</Text>
      <Text style={styles.description}>
        {isHost
          ? "You can manage your workshop submissions from your host dashboard."
          : "Submit your first workshop to open your host dashboard permanently."}
      </Text>

      <Pressable
        style={styles.primaryButton}
        onPress={() => navigation.replace(isHost ? "MyWorkshops" : "CreateWorkshop")}
      >
        <Text style={styles.primaryButtonText}>
          {isHost ? "Open Host Dashboard" : "Submit First Workshop"}
        </Text>
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
