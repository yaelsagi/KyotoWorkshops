import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { SUPPORTED_LANGUAGES } from "../constants/supportedLanguages";
import { KYOTO_WARDS } from "../constants/kyotoWards";
import {
  INTERVIEW_SLOT_OPTIONS,
  JAPANESE_LEVEL_OPTIONS,
  LANGUAGE_LEVEL_OPTIONS,
} from "../constants/translatorOptions";
import { submitTranslatorApplication } from "../services/translatorService";
import { uploadTranslatorProofDocument } from "../services/storageService";
import { useUser } from "../context/UserContext";

const DAY_OPTIONS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function toMinutes(timeValue) {
  const text = String(timeValue || "").trim();
  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(text)) {
    return -1;
  }

  const [hours, minutes] = text.split(":").map(Number);
  return (hours * 60) + minutes;
}

function hasOverlap(existingSlots, candidateSlot) {
  const candidateFrom = toMinutes(candidateSlot.from);
  const candidateTo = toMinutes(candidateSlot.to);
  if (candidateFrom < 0 || candidateTo < 0) {
    return false;
  }

  return (existingSlots || []).some((slot) => {
    if (String(slot?.day || "") !== String(candidateSlot.day || "")) {
      return false;
    }

    const from = toMinutes(slot?.from);
    const to = toMinutes(slot?.to);
    if (from < 0 || to < 0) {
      return false;
    }

    return candidateFrom < to && from < candidateTo;
  });
}

export default function TranslatorSetupScreen({ navigation }) {
  const { currentUser, updateUser } = useUser();

  // Application form state
  const [bio, setBio] = useState("");
  const [japaneseLevel, setJapaneseLevel] = useState("");
  const [japaneseLevelOther, setJapaneseLevelOther] = useState("");
  const [targetLanguages, setTargetLanguages] = useState([]);
  const [languageLevels, setLanguageLevels] = useState({});
  const [wardsAvailable, setWardsAvailable] = useState([]);
  const [hourlyRateYen, setHourlyRateYen] = useState("");
  const [availabilitySlots, setAvailabilitySlots] = useState([]);
  const [selectedDay, setSelectedDay] = useState("Saturday");
  const [fromTime, setFromTime] = useState("10:00");
  const [toTime, setToTime] = useState("16:00");
  const [interviewAt, setInterviewAt] = useState("");
  const [jlptDocumentURL, setJlptDocumentURL] = useState(null);
  const [otherProofDocumentURLs, setOtherProofDocumentURLs] = useState([]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Toggle target language
  const toggleLanguage = (language) => {
    setTargetLanguages((prev) => {
      if (prev.includes(language)) {
        const next = prev.filter((item) => item !== language);
        setLanguageLevels((levels) => {
          const updated = { ...levels };
          delete updated[language];
          return updated;
        });
        return next;
      }
      return [...prev, language];
    });
  };

  // Toggle ward coverage
  const toggleWard = (ward) => {
    setWardsAvailable((prev) => (
      prev.includes(ward)
        ? prev.filter((item) => item !== ward)
        : [...prev, ward]
    ));
  };

  // Save language level
  const setLanguageLevel = (language, level) => {
    setLanguageLevels((prev) => ({ ...prev, [language]: level }));
  };

  const addAvailabilityBlock = () => {
    if (!selectedDay || !fromTime || !toTime) {
      Alert.alert("Missing Information", "Please set day, start time, and end time.");
      return;
    }

    const fromMinutes = toMinutes(fromTime);
    const toMinutesValue = toMinutes(toTime);
    if (fromMinutes < 0 || toMinutesValue < 0) {
      Alert.alert("Invalid Time", "Please use 24-hour HH:MM format (example: 09:30).");
      return;
    }

    if (toMinutesValue <= fromMinutes) {
      Alert.alert("Invalid Time Range", "End time must be after start time.");
      return;
    }

    const block = {
      day: selectedDay,
      from: fromTime.trim(),
      to: toTime.trim(),
    };

    const duplicate = availabilitySlots.some(
      (slot) => slot.day === block.day && slot.from === block.from && slot.to === block.to
    );
    if (duplicate) {
      Alert.alert("Duplicate Slot", "This availability block is already added.");
      return;
    }

    if (hasOverlap(availabilitySlots, block)) {
      Alert.alert("Overlapping Slot", "This time overlaps an existing slot for the same day.");
      return;
    }

    setAvailabilitySlots((prev) => [...prev, block]);
  };

  const removeAvailabilityBlock = (index) => {
    setAvailabilitySlots((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Upload proof from library
  const uploadProofFromLibrary = async (forJlpt) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Photo library access is needed to upload proof documents.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]) {
      const url = await uploadTranslatorProofDocument(currentUser.uid, result.assets[0], forJlpt ? "jlpt" : "proof");
      if (forJlpt) {
        setJlptDocumentURL(url);
      } else {
        setOtherProofDocumentURLs((prev) => [...prev, url]);
      }
    }
  };

  // Upload proof from camera
  const uploadProofFromCamera = async (forJlpt) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Camera access is needed to capture documents.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]) {
      const url = await uploadTranslatorProofDocument(currentUser.uid, result.assets[0], forJlpt ? "jlpt" : "proof");
      if (forJlpt) {
        setJlptDocumentURL(url);
      } else {
        setOtherProofDocumentURLs((prev) => [...prev, url]);
      }
    }
  };

  // Build language levels array
  const otherLanguageLevels = useMemo(() => (
    targetLanguages.map((language) => ({
      language,
      level: languageLevels[language] || "",
    }))
  ), [targetLanguages, languageLevels]);

  // Submit translator application
  const handleSubmit = async () => {
    if (!currentUser?.uid) {
      Alert.alert("Error", "You must be signed in to apply.");
      return;
    }

    if (!bio.trim()) {
      Alert.alert("Missing Information", "Please add a short self-introduction.");
      return;
    }

    if (!japaneseLevel) {
      Alert.alert("Missing Information", "Please choose your Japanese level.");
      return;
    }

    if (japaneseLevel === "Other" && !japaneseLevelOther.trim()) {
      Alert.alert("Missing Information", "Please specify your Japanese level.");
      return;
    }

    if (targetLanguages.length === 0) {
      Alert.alert("Missing Information", "Please choose at least one translation language.");
      return;
    }

    const incompleteLevel = otherLanguageLevels.find((item) => !item.level);
    if (incompleteLevel) {
      Alert.alert("Missing Information", `Please set a level for ${incompleteLevel.language}.`);
      return;
    }

    if (wardsAvailable.length === 0) {
      Alert.alert("Missing Information", "Please choose one or more wards you can cover.");
      return;
    }

    if (availabilitySlots.length === 0) {
      Alert.alert("Missing Information", "Please add at least one availability slot.");
      return;
    }

    const invalidSlot = availabilitySlots.find((slot) => {
      const fromMinutes = toMinutes(slot?.from);
      const toMinutesValue = toMinutes(slot?.to);
      return fromMinutes < 0 || toMinutesValue < 0 || toMinutesValue <= fromMinutes;
    });
    if (invalidSlot) {
      Alert.alert("Invalid Slot", `Please fix invalid slot: ${invalidSlot.day} ${invalidSlot.from}-${invalidSlot.to}`);
      return;
    }

    const parsedRate = Number(hourlyRateYen);
    if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
      Alert.alert("Missing Information", "Please enter your hourly rate in yen.");
      return;
    }

    if (!interviewAt) {
      Alert.alert("Missing Information", "Please choose an interview slot.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        bio: bio.trim(),
        japaneseLevel,
        japaneseLevelOther: japaneseLevel === "Other" ? japaneseLevelOther.trim() : null,
        targetLanguages,
        otherLanguageLevels,
        jlptDocumentURL,
        otherProofDocumentURLs,
        wardsAvailable,
        availability: availabilitySlots,
        availabilitySlots,
        hourlyRateYen: parsedRate,
        hourlyRate: parsedRate,
        interviewAt,
        notes: notes.trim() || null,
      };

      const translatorApplication = await submitTranslatorApplication(currentUser.uid, payload);

      updateUser({ translatorApplication });

      Alert.alert(
        "Application Submitted",
        "Your translator application has been submitted and interview slot booked.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert("Submission Failed", error.message || "Could not submit translator application.");
    } finally {
      setSubmitting(false);
    }
  };

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
        <Text style={styles.title}>Become a Translator</Text>
        <Text style={styles.subtitle}>Submit your translator application for admin review</Text>

        <Text style={styles.label}>Full name</Text>
        <TextInput
          style={styles.input}
          value={currentUser?.displayName || ""}
          editable={false}
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Short self-introduction</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={bio}
          onChangeText={setBio}
          placeholder="Describe your interpreting experience"
          placeholderTextColor="#999"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <Text style={styles.label}>Japanese level</Text>
        <View style={styles.chipsWrap}>
          {JAPANESE_LEVEL_OPTIONS.map((level) => {
            const selected = japaneseLevel === level;
            return (
              <Pressable
                key={level}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => setJapaneseLevel(level)}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{level}</Text>
              </Pressable>
            );
          })}
        </View>

        {japaneseLevel === "Other" ? (
          <TextInput
            style={styles.input}
            value={japaneseLevelOther}
            onChangeText={setJapaneseLevelOther}
            placeholder="Enter your Japanese level"
            placeholderTextColor="#999"
          />
        ) : null}

        <Text style={styles.label}>Translation languages</Text>
        <View style={styles.chipsWrap}>
          {SUPPORTED_LANGUAGES.filter((language) => language !== "Japanese").map((language) => {
            const selected = targetLanguages.includes(language);
            return (
              <Pressable
                key={language}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => toggleLanguage(language)}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{language}</Text>
              </Pressable>
            );
          })}
        </View>

        {targetLanguages.map((language) => (
          <View key={language} style={styles.levelRow}>
            <Text style={styles.levelLabel}>{language} level</Text>
            <View style={styles.chipsWrap}>
              {LANGUAGE_LEVEL_OPTIONS.map((level) => {
                const selected = languageLevels[language] === level;
                return (
                  <Pressable
                    key={`${language}-${level}`}
                    style={[styles.smallChip, selected && styles.chipSelected]}
                    onPress={() => setLanguageLevel(language, level)}
                  >
                    <Text style={[styles.smallChipText, selected && styles.chipTextSelected]}>{level}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}

        <Text style={styles.label}>JLPT or Japanese proof</Text>
        <View style={styles.rowButtons}>
          <Pressable style={styles.secondaryButton} onPress={() => uploadProofFromLibrary(true)}>
            <Text style={styles.secondaryButtonText}>Upload document</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => uploadProofFromCamera(true)}>
            <Text style={styles.secondaryButtonText}>Use camera</Text>
          </Pressable>
        </View>
        <Text style={styles.helperText}>{jlptDocumentURL ? "JLPT proof uploaded" : "No JLPT proof uploaded yet"}</Text>

        <Text style={styles.label}>Other language proof (optional)</Text>
        <View style={styles.rowButtons}>
          <Pressable style={styles.secondaryButton} onPress={() => uploadProofFromLibrary(false)}>
            <Text style={styles.secondaryButtonText}>Upload document</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => uploadProofFromCamera(false)}>
            <Text style={styles.secondaryButtonText}>Use camera</Text>
          </Pressable>
        </View>
        <Text style={styles.helperText}>{otherProofDocumentURLs.length} extra proof file(s) added</Text>

        <Text style={styles.label}>Wards available</Text>
        <Text style={styles.helperText}>Select one or more wards</Text>
        <View style={styles.chipsWrap}>
          {KYOTO_WARDS.map((ward) => {
            const selected = wardsAvailable.includes(ward);
            return (
              <Pressable
                key={ward}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => toggleWard(ward)}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{ward}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Availability slots</Text>
        <Text style={styles.helperText}>Choose the days and time windows you can work</Text>

        <Text style={styles.levelLabel}>Day</Text>
        <View style={styles.chipsWrap}>
          {DAY_OPTIONS.map((day) => {
            const selected = selectedDay === day;
            return (
              <Pressable
                key={day}
                style={[styles.smallChip, selected && styles.chipSelected]}
                onPress={() => setSelectedDay(day)}
              >
                <Text style={[styles.smallChipText, selected && styles.chipTextSelected]}>{day}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.rowButtons}>
          <View style={styles.halfField}>
            <Text style={styles.levelLabel}>From</Text>
            <TextInput
              style={styles.input}
              value={fromTime}
              onChangeText={setFromTime}
              placeholder="10:00"
              placeholderTextColor="#999"
            />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.levelLabel}>To</Text>
            <TextInput
              style={styles.input}
              value={toTime}
              onChangeText={setToTime}
              placeholder="16:00"
              placeholderTextColor="#999"
            />
          </View>
        </View>

        <Pressable style={styles.secondaryButton} onPress={addAvailabilityBlock}>
          <Text style={styles.secondaryButtonText}>Add availability block</Text>
        </Pressable>

        {availabilitySlots.length === 0 ? (
          <Text style={styles.helperText}>No availability slots added yet</Text>
        ) : (
          availabilitySlots.map((slot, index) => (
            <View key={`${slot.day}-${slot.from}-${slot.to}-${index}`} style={styles.slotRow}>
              <Text style={styles.slotText}>{slot.day} {slot.from} - {slot.to}</Text>
              <Pressable onPress={() => removeAvailabilityBlock(index)}>
                <Text style={styles.removeText}>Remove</Text>
              </Pressable>
            </View>
          ))
        )}

        <Text style={styles.label}>Hourly rate (JPY)</Text>
        <TextInput
          style={styles.input}
          value={hourlyRateYen}
          onChangeText={(text) => setHourlyRateYen(text.replace(/[^0-9]/g, ""))}
          placeholder="e.g. 4500"
          placeholderTextColor="#999"
          keyboardType="numeric"
        />

        <Text style={styles.label}>Interview slot</Text>
        <View style={styles.chipsWrap}>
          {INTERVIEW_SLOT_OPTIONS.map((slot) => {
            const selected = interviewAt === slot;
            return (
              <Pressable
                key={slot}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => setInterviewAt(slot)}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{slot}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Anything else the admin should know"
          placeholderTextColor="#999"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        <Pressable style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Submit Application</Text>}
        </Pressable>
      </ScrollView>
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
    paddingBottom: 30,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1F1F1F",
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 16,
    fontSize: 14,
    color: "#666",
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F1F1F",
    marginTop: 14,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E6E2DA",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FBFAF7",
    color: "#1F1F1F",
  },
  textArea: {
    minHeight: 90,
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
  },
  smallChip: {
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
    fontWeight: "600",
    color: "#1F1F1F",
  },
  smallChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1F1F1F",
  },
  chipTextSelected: {
    color: "#FFFFFF",
  },
  levelRow: {
    marginTop: 10,
  },
  levelLabel: {
    fontSize: 13,
    color: "#444",
    marginBottom: 6,
    fontWeight: "600",
  },
  rowButtons: {
    flexDirection: "row",
    gap: 8,
  },
  halfField: {
    flex: 1,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#1F1F1F",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#1F1F1F",
    fontSize: 13,
    fontWeight: "700",
  },
  helperText: {
    marginTop: 6,
    fontSize: 12,
    color: "#666",
  },
  slotRow: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E6E2DA",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FBFAF7",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  slotText: {
    fontSize: 13,
    color: "#1F1F1F",
    fontWeight: "600",
  },
  removeText: {
    color: "#B42318",
    fontSize: 12,
    fontWeight: "700",
  },
  primaryButton: {
    marginTop: 20,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#1F1F1F",
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
