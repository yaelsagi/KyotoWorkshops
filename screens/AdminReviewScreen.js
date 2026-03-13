import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { useAuth } from "../context/AuthContext";
import { useUser } from "../context/UserContext";
import {
  fetchPendingWorkshopsForReview,
  reviewWorkshop,
  reviewWorkshopCategorySuggestion,
} from "../services/workshopService";
import {
  fetchPendingTranslatorApplications,
  reviewTranslatorApplication,
} from "../services/translatorService";

export default function AdminReviewScreen({ navigation }) {
  const { user: authUser } = useAuth();
  const { currentUser, loading: userLoading } = useUser();
  const guardPromptedRef = useRef(false);
  const isAdmin = currentUser?.roles?.admin === true;
  // Track review queue state
  const [loading, setLoading] = useState(true);
  const [pendingWorkshops, setPendingWorkshops] = useState([]);
  const [pendingTranslatorApplications, setPendingTranslatorApplications] = useState([]);
  const [reviewingByKey, setReviewingByKey] = useState({});

  // Gate admin review access
  useEffect(() => {
    if (authUser && userLoading) {
      return;
    }

    if (authUser && isAdmin) {
      guardPromptedRef.current = false;
      return;
    }

    if (guardPromptedRef.current) {
      return;
    }

    guardPromptedRef.current = true;

    if (!authUser) {
      Alert.alert(
        "Admin Access",
        "Please sign in for admin access.",
        [
          {
            text: "Sign In",
            onPress: () => navigation.replace("Login", { redirectTo: "AdminReview" }),
          },
          {
            text: "Create Account",
            onPress: () => navigation.replace("SignUp", { redirectTo: "AdminReview" }),
          },
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.replace("Tabs");
              }
            },
          },
        ]
      );
      return;
    }

    Alert.alert(
      "Admin Access",
      "Admin access is restricted to admin accounts.",
      [
        {
          text: "OK",
          onPress: () => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.replace("Tabs");
            }
          },
        },
      ]
    );
  }, [authUser, isAdmin, navigation, userLoading]);

  // Load admin queues
  const loadData = useCallback(async () => {
    if (!authUser || userLoading || !isAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [workshops, applications] = await Promise.all([
        fetchPendingWorkshopsForReview(),
        fetchPendingTranslatorApplications(),
      ]);
      setPendingWorkshops(workshops);
      setPendingTranslatorApplications(applications);
    } catch (error) {
      Alert.alert("Error", error.message || "Could not load review queues");
    } finally {
      setLoading(false);
    }
  }, [authUser, isAdmin, userLoading]);

  // Track in-flight review actions
  const setReviewing = useCallback((key, isReviewing) => {
    setReviewingByKey((prev) => {
      if (isReviewing) {
        return { ...prev, [key]: true };
      }

      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Submit workshop review
  const handleReviewWorkshop = async (workshopId, approved) => {
    const reviewKey = `workshop:${workshopId}`;
    if (reviewingByKey[reviewKey]) {
      return;
    }

    setReviewing(reviewKey, true);
    try {
      await reviewWorkshop(workshopId, approved ? "approved" : "rejected");
      setPendingWorkshops((prev) => prev.filter((workshop) => workshop.id !== workshopId));
    } catch (error) {
      Alert.alert("Error", error.message || "Could not review workshop");
    } finally {
      setReviewing(reviewKey, false);
    }
  };

  // Submit category suggestion review
  const handleReviewCategorySuggestion = async (workshopId, approved) => {
    const reviewKey = `category:${workshopId}`;
    if (reviewingByKey[reviewKey]) {
      return;
    }

    setReviewing(reviewKey, true);
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
    } finally {
      setReviewing(reviewKey, false);
    }
  };

  // Submit translator application review
  const handleReviewTranslatorApplication = async (userId, approved) => {
    const reviewKey = `translator:${userId}`;
    if (reviewingByKey[reviewKey]) {
      return;
    }

    setReviewing(reviewKey, true);
    try {
      await reviewTranslatorApplication(userId, approved);
      setPendingTranslatorApplications((prev) => prev.filter((item) => item.id !== userId));
    } catch (error) {
      Alert.alert("Error", error.message || "Could not review translator application");
    } finally {
      setReviewing(reviewKey, false);
    }
  };

  if (userLoading || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1F1F1F" />
      </View>
    );
  }

  if (!authUser || !isAdmin) {
    return <View style={styles.loadingContainer} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Admin Review (Lightweight)</Text>
      <Text style={styles.subtitle}>
        Review pending workshops and category suggestions.
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
                {(() => {
                  const workshopReviewKey = `workshop:${workshop.id}`;
                  return (
                    <>
                <Pressable
                  style={[styles.button, styles.approveButton, reviewingByKey[workshopReviewKey] && styles.buttonDisabled]}
                  onPress={() => handleReviewWorkshop(workshop.id, true)}
                  disabled={Boolean(reviewingByKey[workshopReviewKey])}
                >
                  <Text style={styles.buttonText}>Approve</Text>
                </Pressable>
                <Pressable
                  style={[styles.button, styles.rejectButton, reviewingByKey[workshopReviewKey] && styles.buttonDisabled]}
                  onPress={() => handleReviewWorkshop(workshop.id, false)}
                  disabled={Boolean(reviewingByKey[workshopReviewKey])}
                >
                  <Text style={styles.buttonText}>Reject</Text>
                </Pressable>
                    </>
                  );
                })()}
              </View>

              {workshop.customCategorySuggestion &&
              workshop.customCategorySuggestionStatus === "pending" ? (
                <>
                  <Text style={styles.suggestionTitle}>Custom category suggestion</Text>
                  <Text style={styles.suggestionText}>{workshop.customCategorySuggestion}</Text>
                  <View style={styles.buttonRow}>
                    {(() => {
                      const categoryReviewKey = `category:${workshop.id}`;
                      return (
                        <>
                    <Pressable
                      style={[styles.button, styles.approveButton, reviewingByKey[categoryReviewKey] && styles.buttonDisabled]}
                      onPress={() => handleReviewCategorySuggestion(workshop.id, true)}
                      disabled={Boolean(reviewingByKey[categoryReviewKey])}
                    >
                      <Text style={styles.buttonText}>Approve Suggestion</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.button, styles.rejectButton, reviewingByKey[categoryReviewKey] && styles.buttonDisabled]}
                      onPress={() => handleReviewCategorySuggestion(workshop.id, false)}
                      disabled={Boolean(reviewingByKey[categoryReviewKey])}
                    >
                      <Text style={styles.buttonText}>Reject Suggestion</Text>
                    </Pressable>
                        </>
                      );
                    })()}
                  </View>
                </>
              ) : null}
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pending Translator Applications</Text>
          <Text style={styles.sectionCount}>{pendingTranslatorApplications.length}</Text>
        </View>

        {pendingTranslatorApplications.length === 0 ? (
          <Text style={styles.emptyText}>No pending translator applications.</Text>
        ) : (
          pendingTranslatorApplications.map((user) => {
            const application = user.translatorApplication || {};
            return (
              <View key={user.id} style={styles.card}>
                <Text style={styles.cardTitle}>{user.displayName || "Unknown user"}</Text>
                <Text style={styles.cardMeta}>Email: {user.email}</Text>
                <Text style={styles.cardMeta}>Status: {application.status}</Text>
                <Text style={styles.cardMeta}>Japanese: {application.japaneseLevel || "Not set"}</Text>
                <Text style={styles.cardMeta}>
                  Languages: {(application.targetLanguages || []).join(", ") || "None"}
                </Text>
                <Text style={styles.cardMeta}>
                  Wards: {(application.wardsAvailable || []).join(", ") || "None"}
                </Text>
                <Text style={styles.cardMeta}>Interview: {application.interviewAt || "Not selected"}</Text>

                <View style={styles.buttonRow}>
                  {(() => {
                    const translatorReviewKey = `translator:${user.id}`;
                    return (
                      <>
                  <Pressable
                    style={[styles.button, styles.approveButton, reviewingByKey[translatorReviewKey] && styles.buttonDisabled]}
                    onPress={() => handleReviewTranslatorApplication(user.id, true)}
                    disabled={Boolean(reviewingByKey[translatorReviewKey])}
                  >
                    <Text style={styles.buttonText}>Approve</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.button, styles.rejectButton, reviewingByKey[translatorReviewKey] && styles.buttonDisabled]}
                    onPress={() => handleReviewTranslatorApplication(user.id, false)}
                    disabled={Boolean(reviewingByKey[translatorReviewKey])}
                  >
                    <Text style={styles.buttonText}>Reject</Text>
                  </Pressable>
                      </>
                    );
                  })()}
                </View>
              </View>
            );
          })
        )}
      </View>

      <Pressable style={styles.refreshButton} onPress={loadData} disabled={Object.keys(reviewingByKey).length > 0}>
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
  buttonDisabled: {
    opacity: 0.6,
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
