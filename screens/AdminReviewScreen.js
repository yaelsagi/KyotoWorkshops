import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  fetchPendingWorkshopsForReview,
  reviewWorkshop,
  reviewWorkshopCategorySuggestion,
} from "../services/workshopService";
import {
  fetchPendingHostApplications,
  reviewHostApplication,
} from "../services/userService";

export default function AdminReviewScreen() {
  const [loading, setLoading] = useState(true);
  const [pendingWorkshops, setPendingWorkshops] = useState([]);
  const [pendingHosts, setPendingHosts] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [workshops, hosts] = await Promise.all([
        fetchPendingWorkshopsForReview(),
        fetchPendingHostApplications(),
      ]);
      setPendingWorkshops(workshops);
      setPendingHosts(hosts);
    } catch (error) {
      Alert.alert("Error", error.message || "Could not load review queues");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleReviewWorkshop = async (workshopId, approved) => {
    try {
      await reviewWorkshop(workshopId, approved ? "approved" : "rejected");
      setPendingWorkshops((prev) => prev.filter((workshop) => workshop.id !== workshopId));
    } catch (error) {
      Alert.alert("Error", error.message || "Could not review workshop");
    }
  };

  const handleReviewCategorySuggestion = async (workshopId, approved) => {
    try {
      await reviewWorkshopCategorySuggestion(workshopId, approved ? "approved" : "rejected");
      setPendingWorkshops((prev) =>
        prev.map((workshop) =>
          workshop.id === workshopId
            ? {
                ...workshop,
                customCategorySuggestionStatus: approved ? "approved" : "rejected",
              }
            : workshop
        )
      );
    } catch (error) {
      Alert.alert("Error", error.message || "Could not review category suggestion");
    }
  };

  const handleReviewHostApplication = async (uid, approved) => {
    try {
      await reviewHostApplication(uid, approved);
      setPendingHosts((prev) => prev.filter((host) => host.uid !== uid));
    } catch (error) {
      Alert.alert("Error", error.message || "Could not review host application");
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1F1F1F" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Admin Review (Lightweight)</Text>
      <Text style={styles.subtitle}>
        Review pending workshops, category suggestions, and host applications.
      </Text>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pending Workshops</Text>
          <Text style={styles.sectionCount}>{pendingWorkshops.length}</Text>
        </View>

        {pendingWorkshops.length === 0 ? (
          <Text style={styles.emptyText}>No pending workshops.</Text>
        ) : (
          pendingWorkshops.map((workshop) => (
            <View key={workshop.id} style={styles.card}>
              <Text style={styles.cardTitle}>{workshop.title}</Text>
              <Text style={styles.cardMeta}>Owner: {workshop.ownerId}</Text>
              <Text style={styles.cardMeta}>Category: {workshop.category}</Text>
              <Text style={styles.cardMeta}>Ward: {workshop.ward}</Text>

              <View style={styles.buttonRow}>
                <Pressable
                  style={[styles.button, styles.approveButton]}
                  onPress={() => handleReviewWorkshop(workshop.id, true)}
                >
                  <Text style={styles.buttonText}>Approve</Text>
                </Pressable>
                <Pressable
                  style={[styles.button, styles.rejectButton]}
                  onPress={() => handleReviewWorkshop(workshop.id, false)}
                >
                  <Text style={styles.buttonText}>Reject</Text>
                </Pressable>
              </View>

              {workshop.customCategorySuggestion &&
              workshop.customCategorySuggestionStatus === "pending" ? (
                <>
                  <Text style={styles.suggestionTitle}>Custom category suggestion</Text>
                  <Text style={styles.suggestionText}>{workshop.customCategorySuggestion}</Text>
                  <View style={styles.buttonRow}>
                    <Pressable
                      style={[styles.button, styles.approveButton]}
                      onPress={() => handleReviewCategorySuggestion(workshop.id, true)}
                    >
                      <Text style={styles.buttonText}>Approve Suggestion</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.button, styles.rejectButton]}
                      onPress={() => handleReviewCategorySuggestion(workshop.id, false)}
                    >
                      <Text style={styles.buttonText}>Reject Suggestion</Text>
                    </Pressable>
                  </View>
                </>
              ) : null}
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pending Host Applications</Text>
          <Text style={styles.sectionCount}>{pendingHosts.length}</Text>
        </View>

        {pendingHosts.length === 0 ? (
          <Text style={styles.emptyText}>No pending host applications.</Text>
        ) : (
          pendingHosts.map((host) => (
            <View key={host.uid} style={styles.card}>
              <Text style={styles.cardTitle}>{host.displayName || "Unnamed User"}</Text>
              <Text style={styles.cardMeta}>{host.email}</Text>
              <View style={styles.buttonRow}>
                <Pressable
                  style={[styles.button, styles.approveButton]}
                  onPress={() => handleReviewHostApplication(host.uid, true)}
                >
                  <Text style={styles.buttonText}>Approve</Text>
                </Pressable>
                <Pressable
                  style={[styles.button, styles.rejectButton]}
                  onPress={() => handleReviewHostApplication(host.uid, false)}
                >
                  <Text style={styles.buttonText}>Reject</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pending Translator Applications</Text>
        <Text style={styles.emptyText}>No pending translator applications yet.</Text>
      </View>

      <Pressable style={styles.refreshButton} onPress={loadData}>
        <Text style={styles.refreshText}>Refresh Queues</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 30,
    paddingTop: Platform.OS === "ios" ? 16 : 12,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1F1F1F",
  },
  subtitle: {
    marginTop: 8,
    color: "#666",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },
  section: {
    marginTop: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1F1F1F",
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: "700",
    color: "#666",
    backgroundColor: "#F3F3F3",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  card: {
    borderWidth: 1,
    borderColor: "#E6E2DA",
    borderRadius: 12,
    backgroundColor: "#FBFAF7",
    padding: 14,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F1F1F",
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 13,
    color: "#666",
    marginBottom: 2,
  },
  suggestionTitle: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "700",
    color: "#1F1F1F",
  },
  suggestionText: {
    marginTop: 4,
    fontSize: 13,
    color: "#444",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  button: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  approveButton: {
    backgroundColor: "#1F1F1F",
  },
  rejectButton: {
    backgroundColor: "#8A8A8A",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
  },
  refreshButton: {
    marginTop: 22,
    borderWidth: 1,
    borderColor: "#1F1F1F",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  refreshText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F1F1F",
  },
});
