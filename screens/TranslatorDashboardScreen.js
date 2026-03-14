import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StarIcon } from "react-native-heroicons/outline";
import { useUser } from "../context/UserContext";
import { updateTranslatorProfile, fetchTranslatorReviews } from "../services/translatorService";
import KeyboardDoneAccessory from "../components/KeyboardDoneAccessory";

const DAY_OPTIONS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const NUMERIC_INPUT_ACCESSORY_ID = "translatorDashboardNumericAccessory";

export default function TranslatorDashboardScreen() {
  const { currentUser, updateUser } = useUser();
  // Dashboard state
  const [hourlyRateYen, setHourlyRateYen] = useState(
    currentUser?.translatorProfile?.hourlyRateYen ? String(currentUser.translatorProfile.hourlyRateYen) : ""
  );
  const [availabilitySlots, setAvailabilitySlots] = useState(
    Array.isArray(currentUser?.translatorProfile?.availabilitySlots)
      ? currentUser.translatorProfile.availabilitySlots
      : []
  );
  const [selectedDay, setSelectedDay] = useState("Saturday");
  const [fromTime, setFromTime] = useState("10:00");
  const [toTime, setToTime] = useState("16:00");
  const [submitting, setSubmitting] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Load translator reviews
  useEffect(() => {
    const loadReviews = async () => {
      if (!currentUser?.uid) return;
      setLoadingReviews(true);
      try {
        const data = await fetchTranslatorReviews(currentUser.uid);
        setReviews(data);
      } catch {
        setReviews([]);
      } finally {
        setLoadingReviews(false);
      }
    };

    loadReviews();
  }, [currentUser?.uid]);

  // Add availability block
  const addAvailabilityBlock = () => {
    const block = {
      day: selectedDay,
      from: fromTime,
      to: toTime,
    };
    setAvailabilitySlots((prev) => [...prev, block]);
  };

  // Remove availability block
  const removeAvailabilityBlock = (index) => {
    setAvailabilitySlots((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Save dashboard profile
  const handleSave = async () => {
    if (!currentUser?.uid) {
      Alert.alert("Error", "You must be signed in to update dashboard settings.");
      return;
    }

    const parsedRate = hourlyRateYen ? Number(hourlyRateYen) : null;
    if (hourlyRateYen && (!Number.isFinite(parsedRate) || parsedRate <= 0)) {
      Alert.alert("Invalid Price", "Please enter a valid hourly rate.");
      return;
    }

    setSubmitting(true);
    try {
      const nextProfile = await updateTranslatorProfile(currentUser.uid, {
        enabled: true,
        hourlyRateYen: parsedRate,
        availabilitySlots,
      });

      updateUser({ translatorProfile: nextProfile });
      Alert.alert("Saved", "Translator dashboard updated.");
    } catch (error) {
      Alert.alert("Save Failed", error.message || "Could not update translator dashboard.");
    } finally {
      setSubmitting(false);
    }
  };

  const translatorApplication = currentUser?.translatorApplication || {};
  const translatorProfile = currentUser?.translatorProfile || {};

  // Map language name to proficiency level for display
  const languageLevelMap = useMemo(() => {
    const levels = translatorApplication.otherLanguageLevels || [];
    return Object.fromEntries(levels.map((item) => [item.language, item.level]));
  }, [translatorApplication.otherLanguageLevels]);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      >
        <Text style={styles.title}>Translator Dashboard</Text>
        <Text style={styles.subtitle}>Manage your translator profile and availability</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <Text style={styles.metaLabel}>Bio</Text>
          <Text style={styles.metaValue}>{translatorApplication.bio || "No bio provided"}</Text>
          <Text style={styles.metaLabel}>Japanese level</Text>
          <Text style={styles.metaValue}>
            {translatorApplication.japaneseLevel === "Other"
              ? translatorApplication.japaneseLevelOther || "Other"
              : translatorApplication.japaneseLevel || "Not set"}
          </Text>
          <Text style={styles.metaLabel}>Languages</Text>
          {(translatorApplication.targetLanguages || []).length > 0 ? (
            (translatorApplication.targetLanguages || []).map((language) => (
              <Text key={language} style={styles.metaValue}>
                • {language} — {languageLevelMap[language] || "Not set"}
              </Text>
            ))
          ) : (
            <Text style={styles.metaValue}>No languages set</Text>
          )}
          <Text style={styles.metaLabel}>Wards covered</Text>
          <Text style={styles.metaValue}>{(translatorApplication.wardsAvailable || []).join(", ") || "None"}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Availability</Text>

          <Text style={styles.fieldLabel}>Day</Text>
          <View style={styles.chipsWrap}>
            {DAY_OPTIONS.map((day) => {
              const selected = selectedDay === day;
              return (
                <Pressable
                  key={day}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setSelectedDay(day)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{day}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>From</Text>
              <TextInput style={styles.input} value={fromTime} onChangeText={setFromTime} placeholder="10:00" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>To</Text>
              <TextInput style={styles.input} value={toTime} onChangeText={setToTime} placeholder="16:00" />
            </View>
          </View>

          <Pressable style={styles.secondaryButton} onPress={addAvailabilityBlock}>
            <Text style={styles.secondaryButtonText}>Add availability block</Text>
          </Pressable>

          {(availabilitySlots || []).map((slot, index) => (
            <View key={`${slot.day}-${slot.from}-${slot.to}-${index}`} style={styles.slotRow}>
              <Text style={styles.slotText}>{slot.day} {slot.from} - {slot.to}</Text>
              <Pressable onPress={() => removeAvailabilityBlock(index)}>
                <Text style={styles.removeText}>Remove</Text>
              </Pressable>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price</Text>
          <Text style={styles.fieldLabel}>Hourly rate (JPY)</Text>
          <TextInput
            style={styles.input}
            value={hourlyRateYen}
            onChangeText={(text) => setHourlyRateYen(text.replace(/[^0-9]/g, ""))}
            placeholder="e.g. 4500"
            keyboardType="numeric"
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
            // Attach iOS keyboard accessory
            // Android uses KeyboardAvoidingView, tap dismiss, and drag dismiss from this screen
            inputAccessoryViewID={Platform.OS === "ios" ? NUMERIC_INPUT_ACCESSORY_ID : undefined}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ratings</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.metaValue}>Average: {(translatorProfile.ratingAverage || 0).toFixed(1)}</Text>
            <StarIcon size={14} color="#B08A2E" style={styles.ratingIcon} />
          </View>
          <Text style={styles.metaValue}>Reviews: {translatorProfile.ratingCount || 0}</Text>
          <Text style={styles.metaValue}>Completed jobs: {translatorProfile.completedJobs || 0}</Text>

          {loadingReviews ? (
            <ActivityIndicator style={{ marginTop: 8 }} />
          ) : reviews.length === 0 ? (
            <Text style={styles.helperText}>No translator reviews yet</Text>
          ) : (
            reviews.slice(0, 5).map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.ratingRow}>
                  <Text style={styles.reviewRating}>{review.rating}</Text>
                  <StarIcon size={14} color="#B08A2E" style={styles.ratingIcon} />
                </View>
                <Text style={styles.reviewText}>{review.comment || "No comment"}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Requests / Assignments</Text>
          <Text style={styles.helperText}>Pending and assigned translator requests will appear here.</Text>
        </View>

        <Pressable style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]} onPress={handleSave} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Save Dashboard</Text>}
        </Pressable>
      </ScrollView>
      <KeyboardDoneAccessory nativeID={NUMERIC_INPUT_ACCESSORY_ID} />
      </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1F1F1F",
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 14,
    fontSize: 14,
    color: "#666",
  },
  section: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#E6E2DA",
    borderRadius: 12,
    backgroundColor: "#FBFAF7",
    padding: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F1F1F",
    marginBottom: 8,
  },
  metaLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#444",
    marginTop: 6,
  },
  metaValue: {
    fontSize: 13,
    color: "#222",
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  ratingIcon: {
    marginLeft: 4,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#444",
    marginTop: 6,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E6E2DA",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#1F1F1F",
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: "#D8D2C5",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#FFFFFF",
  },
  chipSelected: {
    backgroundColor: "#1F1F1F",
    borderColor: "#1F1F1F",
  },
  chipText: {
    fontSize: 12,
    color: "#1F1F1F",
    fontWeight: "600",
  },
  chipTextSelected: {
    color: "#FFFFFF",
  },
  secondaryButton: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#1F1F1F",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1F1F1F",
  },
  slotRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E6E2DA",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  slotText: {
    fontSize: 12,
    color: "#1F1F1F",
    fontWeight: "600",
  },
  removeText: {
    fontSize: 12,
    color: "#C1121F",
    fontWeight: "700",
  },
  reviewCard: {
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E2DA",
    borderRadius: 10,
    padding: 10,
  },
  reviewRating: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1F1F1F",
  },
  reviewText: {
    marginTop: 4,
    fontSize: 12,
    color: "#444",
  },
  helperText: {
    marginTop: 6,
    fontSize: 12,
    color: "#666",
  },
  primaryButton: {
    marginTop: 18,
    backgroundColor: "#1F1F1F",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonDisabled: {
    backgroundColor: "#999",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
