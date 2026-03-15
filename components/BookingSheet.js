// components/BookingSheet.js
// Multi-step bottom sheet for booking a workshop.
//
// Step 0 — Translator preference
//   • Do you need a translator? Yes / No
//   • If Yes: language selector (all supported languages except Japanese)
//   • "Next" button enabled once a choice is made
//
// Step 1 — Session, participants, cost, and confirmation
//   • Session picker: tappable session cards (date + time)
//   • Participant counter with [-] [count] [+] (1 → workshop.maxParticipants)
//   • Live cost breakdown: per-person + optional translator fee + total
//   • "Confirm Booking" button (green) — disabled until session is selected
//
// After successful booking:
//   • Saves to bookings collection via createBooking
//   • Triggers Haptics.NotificationFeedbackType.Success
//   • Calls onBooked(savedBooking) then closes the sheet

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import * as Haptics from "expo-haptics";
import { XMarkIcon, ChevronRightIcon, ChevronLeftIcon } from "react-native-heroicons/outline";

import { COLORS } from "../styles/colors";
import { SUPPORTED_LANGUAGES } from "../constants/supportedLanguages";
import { createBooking } from "../services/bookingService";
import { fetchApprovedTranslators, matchTranslatorsForSession } from "../services/translatorService";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatSessionDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function BookingSheet({ visible, onClose, onBooked, workshop, currentUser }) {
  // ── Wizard step (0 = translator, 1 = session + cost + confirm) ──────────
  const [step, setStep] = useState(0);

  // ── Step 0 state ────────────────────────────────────────────────────────
  const [needsTranslator, setNeedsTranslator] = useState(null); // null | true | false
  const [selectedLanguage, setSelectedLanguage] = useState(null);

  // ── Step 1 state ────────────────────────────────────────────────────────
  const [selectedSession, setSelectedSession] = useState(null);
  const [participants, setParticipants] = useState(1);

  // ── Translator matching state ────────────────────────────────────────────
  const [translators, setTranslators] = useState([]);
  const [loadingTranslators, setLoadingTranslators] = useState(false);
  const [matchedTranslator, setMatchedTranslator] = useState(null);

  // ── Submission state ─────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);

  // ── Derived workshop values with safe fallbacks ──────────────────────────
  const sessions = workshop?.sessions || [];
  const maxParticipants = workshop?.maxParticipants || 8;
  const pricePerPerson = typeof workshop?.priceYen === "number" ? workshop.priceYen : 0;
  const durationHours = typeof workshop?.durationHours === "number" ? workshop.durationHours : 2;

  // ── Reset all state whenever the sheet opens ─────────────────────────────
  useEffect(() => {
    if (visible) {
      setStep(0);
      setNeedsTranslator(null);
      setSelectedLanguage(null);
      setSelectedSession(null);
      setParticipants(1);
      setTranslators([]);
      setMatchedTranslator(null);
    }
  }, [visible]);

  // ── Load approved translators once the user confirms they need one ───────
  useEffect(() => {
    if (!needsTranslator || !selectedLanguage) return;

    let cancelled = false;
    const load = async () => {
      setLoadingTranslators(true);
      try {
        const all = await fetchApprovedTranslators();
        if (!cancelled) setTranslators(all);
      } catch {
        if (!cancelled) setTranslators([]);
      } finally {
        if (!cancelled) setLoadingTranslators(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [needsTranslator, selectedLanguage]);

  // ── Re-match best translator whenever session or translator list changes ─
  useEffect(() => {
    if (!needsTranslator || !selectedLanguage || !selectedSession || translators.length === 0) {
      setMatchedTranslator(null);
      return;
    }

    const matches = matchTranslatorsForSession({
      translators,
      requestedLanguage: selectedLanguage,
      ward: workshop?.ward,
      sessionDate: selectedSession?.date,
      sessionTime: selectedSession?.time,
    });

    setMatchedTranslator(matches[0] || null);
  }, [translators, selectedLanguage, selectedSession, needsTranslator, workshop?.ward]);

  // ── Cost calculation ─────────────────────────────────────────────────────
  const workshopCost = pricePerPerson * participants;
  const translatorHourlyRate =
    needsTranslator && matchedTranslator
      ? Number(matchedTranslator.translatorProfile?.hourlyRateYen || 0)
      : 0;
  const translatorCost = translatorHourlyRate * durationHours;
  const totalCost = workshopCost + translatorCost;

  // ── Guard conditions ─────────────────────────────────────────────────────
  // Step 0 → Next is enabled once the user has selected Yes or No
  // (and chosen a language when Yes is selected)
  const canProceedStep0 =
    needsTranslator === false || (needsTranslator === true && selectedLanguage !== null);

  // Confirm is enabled once a session is chosen and participants is valid
  const canConfirm = selectedSession !== null && participants >= 1 && !submitting;

  // ── Booking submission ───────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!canConfirm) return;

    setSubmitting(true);
    try {
      const bookingData = {
        workshopId: workshop.id,
        userId: currentUser.uid,
        // Session details
        sessionId: selectedSession.id,
        sessionDate: selectedSession.date,
        sessionTime: selectedSession.time,
        participants,
        // Status and translator details
        status: "confirmed",
        translatorRequested: needsTranslator === true,
        requestedLanguage: needsTranslator ? selectedLanguage : null,
        translatorId: matchedTranslator?.id || null,
        // Cost breakdown
        priceYen: workshopCost,
        translatorCost: needsTranslator ? translatorCost : 0,
        totalCost,
        // Workshop snapshot fields (denormalised for BookingsScreen display)
        title: workshop.title,
        category: workshop.category,
        ward: workshop.ward,
        workshopImage:
          Array.isArray(workshop.images) && workshop.images.length > 0
            ? workshop.images[0]
            : null,
        lat: workshop.lat,
        lng: workshop.lng,
      };

      const saved = await createBooking(bookingData);

      // Strong haptic success feedback
      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      onBooked?.(saved);
      onClose();
    } catch (err) {
      Alert.alert("Booking failed", err.message || "Could not complete your booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* Dark overlay — tapping closes the sheet */}
      <Pressable style={styles.overlay} onPress={onClose} />

      {/* Bottom sheet */}
      <View style={styles.sheet}>
        {/* Drag handle pill */}
        <View style={styles.handle} />

        {/* Header row */}
        <View style={styles.sheetHeader}>
          {step === 1 ? (
            <Pressable
              onPress={() => setStep(0)}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <ChevronLeftIcon size={20} color={COLORS.primaryText} />
              <Text style={styles.backBtnText}>Back</Text>
            </Pressable>
          ) : (
            <View style={styles.backBtn} />
          )}

          <Text style={styles.sheetTitle}>Book Workshop</Text>

          <Pressable
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close booking sheet"
          >
            <XMarkIcon size={22} color={COLORS.primaryText} />
          </Pressable>
        </View>

        {/* Scrollable content */}
        <ScrollView
          style={styles.sheetBody}
          contentContainerStyle={styles.sheetBodyContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ─── STEP 0: Translator preference ─────────────────────────── */}
          {step === 0 && (
            <View>
              <Text style={styles.stepTitle}>Do you need a translator?</Text>
              <Text style={styles.stepSubtitle}>
                Add Japanese-to-your-language translation support for this session.
              </Text>

              {/* Yes / No buttons */}
              <View style={styles.optionRow}>
                <Pressable
                  style={[
                    styles.optionBtn,
                    needsTranslator === false && styles.optionBtnSelected,
                  ]}
                  onPress={() => {
                    setNeedsTranslator(false);
                    setSelectedLanguage(null);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="No translator needed"
                >
                  <Text
                    style={[
                      styles.optionBtnText,
                      needsTranslator === false && styles.optionBtnTextSelected,
                    ]}
                  >
                    No
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.optionBtn,
                    needsTranslator === true && styles.optionBtnSelected,
                  ]}
                  onPress={() => setNeedsTranslator(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Yes, I need a translator"
                >
                  <Text
                    style={[
                      styles.optionBtnText,
                      needsTranslator === true && styles.optionBtnTextSelected,
                    ]}
                  >
                    Yes
                  </Text>
                </Pressable>
              </View>

              {/* Language picker — shown when user selects Yes */}
              {needsTranslator === true && (
                <View style={styles.languageSection}>
                  <Text style={styles.subsectionLabel}>Select your language</Text>
                  <View style={styles.languageGrid}>
                    {SUPPORTED_LANGUAGES.filter((l) => l !== "Japanese").map((lang) => (
                      <Pressable
                        key={lang}
                        style={[
                          styles.languageChip,
                          selectedLanguage === lang && styles.languageChipSelected,
                        ]}
                        onPress={() => setSelectedLanguage(lang)}
                        accessibilityRole="button"
                        accessibilityLabel={`Select ${lang}`}
                      >
                        <Text
                          style={[
                            styles.languageChipText,
                            selectedLanguage === lang && styles.languageChipTextSelected,
                          ]}
                        >
                          {lang}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {loadingTranslators && (
                    <ActivityIndicator
                      size="small"
                      color={COLORS.approved}
                      style={{ marginTop: 12 }}
                    />
                  )}
                </View>
              )}

              {/* Next button */}
              <Pressable
                style={[styles.nextBtn, !canProceedStep0 && styles.nextBtnDisabled]}
                onPress={() => canProceedStep0 && setStep(1)}
                disabled={!canProceedStep0}
                accessibilityRole="button"
                accessibilityLabel="Next step"
              >
                <Text style={styles.nextBtnText}>Next</Text>
                <ChevronRightIcon size={18} color={COLORS.white} />
              </Pressable>
            </View>
          )}

          {/* ─── STEP 1: Session + Participants + Cost ──────────────────── */}
          {step === 1 && (
            <View>
              {/* Session selection */}
              <Text style={styles.stepTitle}>Select a Session</Text>
              {sessions.length === 0 ? (
                <Text style={styles.noSessions}>
                  No sessions are currently available for this workshop.
                </Text>
              ) : (
                <View style={styles.sessionList}>
                  {sessions.map((session) => {
                    const isSelected = selectedSession?.id === session.id;
                    return (
                      <Pressable
                        key={session.id}
                        style={[styles.sessionCard, isSelected && styles.sessionCardSelected]}
                        onPress={() => setSelectedSession(session)}
                        accessibilityRole="button"
                        accessibilityLabel={`Session on ${formatSessionDate(session.date)} at ${session.time}`}
                        accessibilityState={{ selected: isSelected }}
                      >
                        <Text
                          style={[styles.sessionDate, isSelected && styles.sessionDateSelected]}
                        >
                          {formatSessionDate(session.date)}
                        </Text>
                        <Text
                          style={[styles.sessionTime, isSelected && styles.sessionTimeSelected]}
                        >
                          {session.time}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {/* Participants counter */}
              <Text style={[styles.stepTitle, { marginTop: 28 }]}>Participants</Text>
              <View style={styles.participantsRow}>
                <Pressable
                  style={[
                    styles.counterBtn,
                    participants <= 1 && styles.counterBtnDisabled,
                  ]}
                  onPress={() => participants > 1 && setParticipants((p) => p - 1)}
                  disabled={participants <= 1}
                  accessibilityRole="button"
                  accessibilityLabel="Decrease participants"
                >
                  <Text style={styles.counterBtnText}>−</Text>
                </Pressable>

                <Text style={styles.participantCount}>{participants}</Text>

                <Pressable
                  style={[
                    styles.counterBtn,
                    participants >= maxParticipants && styles.counterBtnDisabled,
                  ]}
                  onPress={() =>
                    participants < maxParticipants && setParticipants((p) => p + 1)
                  }
                  disabled={participants >= maxParticipants}
                  accessibilityRole="button"
                  accessibilityLabel="Increase participants"
                >
                  <Text style={styles.counterBtnText}>+</Text>
                </Pressable>
              </View>
              {participants >= maxParticipants && (
                <Text style={styles.maxWarning}>
                  You reached the maximum number of participants for this workshop.
                </Text>
              )}

              {/* Cost summary — updates live as participants/translator changes */}
              <View style={styles.costSection}>
                <Text style={styles.stepTitle}>Cost Summary</Text>

                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Price per participant</Text>
                  <Text style={styles.costValue}>¥{pricePerPerson.toLocaleString()}</Text>
                </View>

                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Participants</Text>
                  <Text style={styles.costValue}>{participants}</Text>
                </View>

                {needsTranslator && (
                  <View style={styles.costRow}>
                    <Text style={styles.costLabel}>
                      {matchedTranslator
                        ? `Translator fee (${matchedTranslator.displayName})`
                        : "Translator fee (no match yet)"}
                    </Text>
                    <Text style={styles.costValue}>
                      {translatorCost > 0 ? `¥${translatorCost.toLocaleString()}` : "TBD"}
                    </Text>
                  </View>
                )}

                <View style={[styles.costRow, styles.costRowTotal]}>
                  <Text style={styles.costTotalLabel}>Total</Text>
                  <Text style={styles.costTotalValue}>¥{totalCost.toLocaleString()}</Text>
                </View>
              </View>

              {/* Spacer so content clears the fixed confirm bar */}
              <View style={{ height: 16 }} />
            </View>
          )}
        </ScrollView>

        {/* ── Fixed Confirm Booking bar (step 1 only) ────────────────────── */}
        {step === 1 && (
          <View style={styles.confirmBar}>
            <Pressable
              style={[
                styles.confirmBtn,
                (!canConfirm) && styles.confirmBtnDisabled,
              ]}
              onPress={handleConfirm}
              disabled={!canConfirm}
              accessibilityRole="button"
              accessibilityLabel="Confirm Booking"
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.confirmBtnText}>Confirm Booking</Text>
              )}
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Semi-transparent dark overlay behind the sheet
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },

  // The white bottom sheet panel
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "88%",
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === "ios" ? 28 : 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 16,
  },

  // Small drag-handle pill at top of sheet
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },

  // ── Header ───────────────────────────────────────────────────────────────
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primaryText,
    flex: 1,
    textAlign: "center",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F5F1E8",
    alignItems: "center",
    justifyContent: "center",
  },
  backBtn: {
    width: 70,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  backBtnText: {
    fontSize: 14,
    color: COLORS.primaryText,
    fontWeight: "600",
  },

  // ── Body ─────────────────────────────────────────────────────────────────
  sheetBody: {
    flex: 1,
  },
  sheetBodyContent: {
    padding: 20,
    paddingBottom: 8,
  },

  // ── Step headings ─────────────────────────────────────────────────────────
  stepTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primaryText,
    marginBottom: 6,
  },
  stepSubtitle: {
    fontSize: 14,
    color: COLORS.secondaryText,
    lineHeight: 20,
    marginBottom: 20,
  },

  // ── Translator Yes/No buttons ─────────────────────────────────────────────
  optionRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
  },
  optionBtnSelected: {
    borderColor: COLORS.primaryText,
    backgroundColor: COLORS.primaryText,
  },
  optionBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primaryText,
  },
  optionBtnTextSelected: {
    color: COLORS.white,
  },

  // ── Language grid ─────────────────────────────────────────────────────────
  languageSection: {
    marginBottom: 24,
  },
  subsectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.secondaryText,
    marginBottom: 12,
  },
  languageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  languageChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  languageChipSelected: {
    borderColor: COLORS.primaryText,
    backgroundColor: COLORS.primaryText,
  },
  languageChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primaryText,
  },
  languageChipTextSelected: {
    color: COLORS.white,
  },

  // ── Next button ───────────────────────────────────────────────────────────
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primaryText,
    gap: 6,
    marginTop: 4,
  },
  nextBtnDisabled: {
    backgroundColor: "#CCC",
  },
  nextBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.white,
  },

  // ── Session cards ─────────────────────────────────────────────────────────
  sessionList: {
    gap: 10,
    marginBottom: 4,
  },
  sessionCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  sessionCardSelected: {
    borderColor: COLORS.primaryText,
    backgroundColor: COLORS.primaryText,
  },
  sessionDate: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primaryText,
  },
  sessionDateSelected: {
    color: COLORS.white,
  },
  sessionTime: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.secondaryText,
  },
  sessionTimeSelected: {
    color: COLORS.white,
  },
  noSessions: {
    fontSize: 14,
    color: COLORS.tertiaryText,
    fontStyle: "italic",
    marginBottom: 16,
  },

  // ── Participants counter ───────────────────────────────────────────────────
  participantsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginBottom: 8,
  },
  counterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: COLORS.primaryText,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.cardBackground,
  },
  counterBtnDisabled: {
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardBackground,
  },
  counterBtnText: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.primaryText,
    lineHeight: 24,
  },
  participantCount: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.primaryText,
    minWidth: 32,
    textAlign: "center",
  },
  maxWarning: {
    fontSize: 13,
    color: COLORS.pending,
    marginBottom: 16,
    fontStyle: "italic",
  },

  // ── Cost breakdown ────────────────────────────────────────────────────────
  costSection: {
    marginTop: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardBackground,
    padding: 16,
    gap: 12,
  },
  costRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  costLabel: {
    fontSize: 14,
    color: COLORS.secondaryText,
    flex: 1,
    paddingRight: 8,
  },
  costValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primaryText,
  },
  costRowTotal: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
    marginTop: 4,
  },
  costTotalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primaryText,
  },
  costTotalValue: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.primaryText,
  },

  // ── Fixed confirm bar ─────────────────────────────────────────────────────
  confirmBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  confirmBtn: {
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: COLORS.approved,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnDisabled: {
    backgroundColor: "#B0B0B0",
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.white,
    letterSpacing: 0.2,
  },
});
