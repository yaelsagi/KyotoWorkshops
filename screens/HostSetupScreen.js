import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { PencilIcon } from "react-native-heroicons/outline";
import { useUser } from "../context/UserContext";
import { COLORS } from "../styles/colors";

export default function HostSetupScreen({ navigation }) {
  const { currentUser } = useUser();
  const isHost = Boolean(currentUser?.roles?.host);

  return (
    <View style={styles.container}>
      <PencilIcon size={48} color={COLORS.primaryText} />
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
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    marginTop: 16,
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.primaryText,
  },
  description: {
    marginTop: 10,
    fontSize: 14,
    color: COLORS.secondaryText,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: COLORS.primaryText,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "700",
  },
});
