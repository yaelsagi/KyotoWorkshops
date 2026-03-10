import React from "react";
import { View, Text, StyleSheet, Pressable, Alert } from "react-native";
import { PencilIcon } from "react-native-heroicons/outline";
import { useUser } from "../context/UserContext";
import { submitHostApplication } from "../services/userService";

export default function HostSetupScreen({ navigation }) {
  const { currentUser, updateUser } = useUser();
  const isPending = currentUser?.hostApplicationStatus === "pending";
  const isApproved = currentUser?.hostApplicationStatus === "approved";

  const handleEnableHost = async () => {
    if (!currentUser?.uid) {
      Alert.alert("Sign in required", "Please sign in to apply as a host.");
      return;
    }

    await submitHostApplication(currentUser.uid);
    updateUser({ hostApplicationStatus: "pending" });

    Alert.alert("Application submitted", "Your host application is now pending admin review.", [
      {
        text: "Continue",
        onPress: () => navigation.goBack(),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <PencilIcon size={48} color="#1F1F1F" />
      <Text style={styles.title}>Create a workshop</Text>
      <Text style={styles.description}>
        {isApproved
          ? "Your host access is approved. You can now create and manage workshops."
          : isPending
            ? "Your host application is currently pending admin review."
            : "Submit your host application. Once approved by admin, you'll be able to create and manage workshops."}
      </Text>

      {isApproved ? (
        <Pressable style={styles.primaryButton} onPress={() => navigation.replace("CreateWorkshop")}>
          <Text style={styles.primaryButtonText}>Create Workshop</Text>
        </Pressable>
      ) : (
        <Pressable
          style={[styles.primaryButton, isPending && styles.primaryButtonDisabled]}
          onPress={handleEnableHost}
          disabled={isPending}
        >
          <Text style={styles.primaryButtonText}>{isPending ? "Application Pending" : "Submit Host Application"}</Text>
        </Pressable>
      )}
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
  primaryButtonDisabled: {
    backgroundColor: "#9A9A9A",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
