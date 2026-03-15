// components/BookingSheet.js
// Session-first booking sheet:
// 1) session, 2) participants, 3) translator options, 4) confirm booking.

import React, { useState, useEffect, useMemo } from "react";
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
import { XMarkIcon } from "react-native-heroicons/outline";

import { COLORS } from "../styles/colors";
import { SUPPORTED_LANGUAGES } from "../constants/supportedLanguages";
import { createBooking } from "../services/bookingService";
import { fetchApprovedTranslators, getMatchingTranslators } from "../services/translatorService";

// Helpers

function formatSessionDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "short",
    });
  } catch {
    return dateStr;
  }
}

function formatSessionRowLabel(session) {
  if (!session) {
    return "";
  }
  const dateLabel = formatSessionDate(session.date);
  return `${dateLabel} - ${session.time || ""}`;
}

function formatLanguageCountMessage(count, language, stageLabel) {
  if (!language) {
    return `${count} translators available ${stageLabel}`;
  }

  if (count <= 0) {
    return `No ${language}-speaking translators available ${stageLabel}`;
  }

  return `${count} ${language}-speaking translators available ${stageLabel}`;
}

function toMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== "string") {
    return -1;
  }

  const [hours, minutes] = timeStr.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return -1;
  }

  return hours * 60 + minutes;
}

function sessionMatchesAvailability(session, availability = []) {
  if (!session?.date || !session?.time || !Array.isArray(availability) || availability.length === 0) {
    return false;
  }

  const weekday = new Date(session.date).toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  const sessionMinutes = toMinutes(session.time);
  if (sessionMinutes < 0) {
    return false;
  }

  return availability.some((slot) => {
    const slotDay = String(slot?.day || "").trim().toLowerCase();
    if (slotDay !== weekday) {
      return false;
    }

    const fromMinutes = toMinutes(slot?.from);
    const toMinutesValue = toMinutes(slot?.to);
    if (fromMinutes < 0 || toMinutesValue < 0 || toMinutesValue <= fromMinutes) {
      return false;
    }

    return sessionMinutes >= fromMinutes && sessionMinutes <= toMinutesValue;
  });
}

// detect session states that must be locked in the UI
function isSessionUnavailable(session) {
  if (!session || typeof session !== "object") {
    return false;
  }

  if (session.isBooked === true || session.unavailable === true || session.isUnavailable === true) {
    return true;
  }

  const status = String(session.status || session.availabilityStatus || "").trim().toLowerCase();
  return status === "booked" || status === "unavailable";
}

// detect sessions explicitly marked as booked
function isSessionBooked(session) {
  if (!session || typeof session !== "object") {
    return false;
  }

  if (session.isBooked === true) {
    return true;
  }

  const status = String(session.status || session.availabilityStatus || "").trim().toLowerCase();
  return status === "booked";
}

// Component

export default function BookingSheet({ visible, onClose, onBooked, workshop, currentUser }) {
  // Session and participant selections come first in this flow.
  const [selectedSession, setSelectedSession] = useState(null);
  const [participants, setParticipants] = useState(1);

  // Translator choices are made after session and participants.
  const [needsTranslator, setNeedsTranslator] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [selectedTranslator, setSelectedTranslator] = useState(null);

  // Translator matching state
  const [translators, setTranslators] = useState([]);
  const [loadingTranslators, setLoadingTranslators] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);

  // Derived workshop values with safe fallbacks
  const sessions = workshop?.sessions || [];
  const maxParticipants = workshop?.maxParticipants || 8;
  const pricePerPerson =
    typeof workshop?.priceYen === "number"
      ? workshop.priceYen
      : (typeof workshop?.price === "number" ? workshop.price : 0);
  const durationHours = typeof workshop?.durationHours === "number" ? workshop.durationHours : 2;
  // show booked label only to host and admin roles
  const canSeeBookedBadge = Boolean(currentUser?.roles?.admin || currentUser?.roles?.host);

  // Reset all state whenever the sheet opens
  useEffect(() => {
    if (visible) {
      setSelectedSession(null);
      setParticipants(1);
      setNeedsTranslator(false);
      setSelectedLanguage(null);
      setSelectedTranslator(null);
      setTranslators([]);
    }
  }, [visible]);

  // Load translator pool once the sheet opens so stats can be shown early.
  useEffect(() => {
    if (!visible) {
      return;
    }

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
  }, [visible]);

  // Clear language-dependent selection when user changes translator requirement.
  useEffect(() => {
    if (!needsTranslator) {
      setSelectedLanguage(null);
      setSelectedTranslator(null);
    }
  }, [needsTranslator]);

  // If language or session changes, previously selected translator may no longer match.
  useEffect(() => {
    setSelectedTranslator(null);
  }, [selectedLanguage, selectedSession]);

  const areaTranslators = useMemo(() => {
    if (!selectedLanguage) {
      return [];
    }
    return getMatchingTranslators(translators, selectedLanguage, workshop?.ward, null, 3);
  }, [translators, selectedLanguage, workshop?.ward]);

  const sessionTranslators = useMemo(() => {
    if (!selectedLanguage || !selectedSession) {
      return [];
    }
    return getMatchingTranslators(
      translators,
      selectedLanguage,
      workshop?.ward,
      selectedSession,
      3,
    );
  }, [translators, selectedLanguage, selectedSession, workshop?.ward]);

  const sessionTranslatorCountMap = useMemo(() => {
    const counts = new Map();
    if (!selectedLanguage || !Array.isArray(sessions) || sessions.length === 0) {
      return counts;
    }

    sessions.forEach((session) => {
      const matches = getMatchingTranslators(
        translators,
        selectedLanguage,
        workshop?.ward,
        session,
        3,
      );
      counts.set(session.id, matches.length);
    });

    return counts;
  }, [sessions, translators, selectedLanguage, workshop?.ward]);

  const translatorsInAreaCount = useMemo(() => {
    const normalizedWard = String(workshop?.ward || "").trim().toLowerCase();
    if (!normalizedWard) {
      return 0;
    }

    return translators.filter((translator) => {
      const wards = (translator?.translatorProfile?.wardsAvailable || []).map((entry) =>
        String(entry).trim().toLowerCase()
      );
      return wards.includes(normalizedWard);
    }).length;
  }, [translators, workshop?.ward]);

  const translatorsForSelectedSessionCount = useMemo(() => {
    if (!selectedSession) {
      return 0;
    }

    const normalizedWard = String(workshop?.ward || "").trim().toLowerCase();
    if (!normalizedWard) {
      return 0;
    }

    return translators.filter((translator) => {
      const wards = (translator?.translatorProfile?.wardsAvailable || []).map((entry) =>
        String(entry).trim().toLowerCase()
      );

      if (!wards.includes(normalizedWard)) {
        return false;
      }

      const availability = translator?.translatorProfile?.availability || [];
      return sessionMatchesAvailability(selectedSession, availability);
    }).length;
  }, [selectedSession, translators, workshop?.ward]);

  // Cost calculation
  const totalWorkshopCost = pricePerPerson * participants;
  const translatorHourlyRate =
    needsTranslator && selectedTranslator
      ? Number(selectedTranslator.translatorProfile?.hourlyRateYen || selectedTranslator.translatorProfile?.hourlyRate || 0)
      : 0;
  const translatorCost = translatorHourlyRate * durationHours;
  const totalCost = totalWorkshopCost + translatorCost;

  const selectedSessionIsUnavailable = useMemo(() => {
    if (!selectedSession?.id) {
      return false;
    }

    const latestSession = sessions.find((session) => session?.id === selectedSession.id);
    return isSessionUnavailable(latestSession || selectedSession);
  }, [sessions, selectedSession]);

  const participantsValid = participants >= 1 && participants <= maxParticipants;
  const translatorSelectionValid =
    !needsTranslator || (selectedLanguage && selectedTranslator);
  const canConfirm =
    selectedSession &&
    !selectedSessionIsUnavailable &&
    participantsValid &&
    translatorSelectionValid &&
    !submitting;

  // Booking submission
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
        translatorId: selectedTranslator?.id || null,
        // Cost breakdown
        priceYen: totalWorkshopCost,
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
      Alert.alert(
        "Booking confirmed",
        `Thank you for booking ${workshop.title}!\n${workshop.hostName || "Your host"} is looking forward to seeing you!`
      );
    } catch (err) {
      Alert.alert("Booking failed", err.message || "Could not complete your booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Render

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* Dark overlay - tapping closes the sheet */}
      <Pressable style={styles.overlay} onPress={onClose} />

      {/* Bottom sheet */}
      <View style={styles.sheet}>
        {/* Drag handle pill */}
        <View style={styles.handle} />

        {/* Header row */}
        <View style={styles.sheetHeader}>
          <View style={styles.headerSide} />

          <Text style={styles.sheetTitle}>Book Workshop</Text>

          <View style={styles.headerSide}>
            <Pressable
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close booking sheet"
            >
              <XMarkIcon size={22} color={COLORS.primaryText} />
            </Pressable>
          </View>
        </View>

        {/* Scrollable content */}
        <ScrollView
          style={styles.sheetBody}
          contentContainerStyle={styles.sheetBodyContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View>
            <Text style={styles.stepTitle}>Select a Session</Text>
            {sessions.length === 0 ? (
              <Text style={styles.noSessions}>
                No sessions are currently available for this workshop.
              </Text>
            ) : (
              <View style={styles.sessionList}>
                {sessions.map((session) => {
                  // keep unavailable sessions visible but unselectable
                  const isUnavailable = isSessionUnavailable(session);
                  const isSelected = selectedSession?.id === session.id && !isUnavailable;
                  // role-based label wording for locked sessions
                  const unavailableLabel =
                    canSeeBookedBadge && isSessionBooked(session) ? "Booked" : "Unavailable";
                  const languageMatchCount = sessionTranslatorCountMap.get(session.id) || 0;

                  return (
                    <Pressable
                      key={session.id}
                      style={[
                        styles.sessionCard,
                        isSelected && styles.sessionCardSelected,
                        isUnavailable && styles.sessionCardUnavailable,
                      ]}
                      onPress={() => {
                        if (!isUnavailable) {
                          setSelectedSession(session);
                        }
                      }}
                      disabled={isUnavailable}
                      accessibilityRole="button"
                      accessibilityLabel={`Session ${formatSessionRowLabel(session)}`}
                      accessibilityState={{ selected: isSelected, disabled: isUnavailable }}
                    >
                      <View style={styles.sessionMainInfo}>
                        <Text
                          style={[
                            styles.sessionDate,
                            isSelected && styles.sessionDateSelected,
                            isUnavailable && styles.sessionDateUnavailable,
                          ]}
                        >
                          {formatSessionRowLabel(session)}
                        </Text>
                        {isUnavailable && (
                          <Text
                            style={[
                              styles.sessionUnavailableLabel,
                              unavailableLabel === "Booked" && styles.sessionBookedLabel,
                            ]}
                          >
                            {unavailableLabel}
                          </Text>
                        )}
                        {needsTranslator && selectedLanguage && (
                          <Text
                            style={[
                              styles.sessionMeta,
                              isSelected && styles.sessionMetaSelected,
                              isUnavailable && styles.sessionMetaUnavailable,
                            ]}
                          >
                            {formatLanguageCountMessage(languageMatchCount, selectedLanguage, "for this session")}
                          </Text>
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <Text style={[styles.stepTitle, { marginTop: 24 }]}>Participants</Text>
            {!selectedSession && (
              <Text style={styles.participantHint}>Choose a session first.</Text>
            )}
            <View style={styles.participantsRow}>
              <Pressable
                style={[
                  styles.counterBtn,
                  (participants <= 1 || !selectedSession) && styles.counterBtnDisabled,
                ]}
                onPress={() => participants > 1 && selectedSession && setParticipants((p) => p - 1)}
                disabled={participants <= 1 || !selectedSession}
                accessibilityRole="button"
                accessibilityLabel="Decrease participants"
              >
                <Text style={styles.counterBtnText}>-</Text>
              </Pressable>

              <Text style={styles.participantCount}>{participants}</Text>

              <Pressable
                style={[
                  styles.counterBtn,
                  (participants >= maxParticipants || !selectedSession) && styles.counterBtnDisabled,
                ]}
                onPress={() =>
                  participants < maxParticipants && selectedSession && setParticipants((p) => p + 1)
                }
                disabled={participants >= maxParticipants || !selectedSession}
                accessibilityRole="button"
                accessibilityLabel="Increase participants"
              >
                <Text style={styles.counterBtnText}>+</Text>
              </Pressable>
            </View>
            {participants >= maxParticipants && (
              <Text style={styles.maxWarning}>You reached the maximum number of participants.</Text>
            )}

            <Text style={[styles.stepTitle, { marginTop: 24 }]}>Book a translator?</Text>
            <Text style={styles.stepSubtitle}>
              Choose one of our curated translators for a smooth experience.
            </Text>

            <View style={styles.optionRow}>
              <Pressable
                style={[styles.optionBtn, !needsTranslator && styles.optionBtnSelected]}
                onPress={() => setNeedsTranslator(false)}
                accessibilityRole="button"
                accessibilityLabel="No translator needed"
              >
                <Text style={[styles.optionBtnText, !needsTranslator && styles.optionBtnTextSelected]}>No</Text>
              </Pressable>

              <Pressable
                style={[styles.optionBtn, needsTranslator && styles.optionBtnSelected]}
                onPress={() => setNeedsTranslator(true)}
                accessibilityRole="button"
                accessibilityLabel="Yes, book a translator"
              >
                <Text style={[styles.optionBtnText, needsTranslator && styles.optionBtnTextSelected]}>Yes</Text>
              </Pressable>
            </View>

            {loadingTranslators && (
              <Text style={styles.statsText}>Checking translator availability...</Text>
            )}

            {!selectedSession ? (
              <Text style={styles.statsText}>
                {selectedLanguage
                  ? formatLanguageCountMessage(areaTranslators.length, selectedLanguage, "in this area")
                  : `${translatorsInAreaCount} translators available in this area`}
              </Text>
            ) : (
              <Text style={styles.statsText}>
                {selectedLanguage
                  ? formatLanguageCountMessage(sessionTranslators.length, selectedLanguage, "for this session")
                  : `${translatorsForSelectedSessionCount} translators available for this session`}
              </Text>
            )}

            {needsTranslator && (
              <View style={styles.languageSection}>
                <Text style={styles.subsectionLabel}>Choose translation language</Text>
                <View style={styles.languageGrid}>
                  {SUPPORTED_LANGUAGES.filter((language) => language !== "Japanese").map((language) => (
                    <Pressable
                      key={language}
                      style={[styles.languageChip, selectedLanguage === language && styles.languageChipSelected]}
                      onPress={() => setSelectedLanguage(language)}
                      accessibilityRole="button"
                      accessibilityLabel={`Choose ${language}`}
                    >
                      <Text style={[styles.languageChipText, selectedLanguage === language && styles.languageChipTextSelected]}>
                        {language}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {!!selectedLanguage && !!selectedSession && (
                  <View style={styles.translatorList}>
                    {sessionTranslators.length === 0 ? (
                      <Text style={styles.noSessions}>
                        No matching translators available for this session.
                      </Text>
                    ) : (
                      sessionTranslators.map((translator) => {
                        const isSelected = selectedTranslator?.id === translator.id;
                        const translatorRate = Number(
                          translator?.translatorProfile?.hourlyRateYen || translator?.translatorProfile?.hourlyRate || 0
                        );

                        return (
                          <Pressable
                            key={translator.id}
                            style={[styles.translatorCard, isSelected && styles.translatorCardSelected]}
                            onPress={() => setSelectedTranslator(translator)}
                            accessibilityRole="button"
                            accessibilityState={{ selected: isSelected }}
                            accessibilityLabel={`Select translator ${translator.displayName || "Translator"}`}
                          >
                            <Text style={styles.translatorName}>{translator.displayName || "Translator"}</Text>
                            <Text style={styles.translatorMeta}>
                              Rating {Number(translator?.translatorProfile?.ratingAverage || 0).toFixed(1)} ({Number(translator?.translatorProfile?.ratingCount || 0)})
                            </Text>
                            <Text style={styles.translatorMeta}>¥{translatorRate.toLocaleString()} per hour</Text>
                          </Pressable>
                        );
                      })
                    )}
                  </View>
                )}
              </View>
            )}

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

              <View style={styles.costRow}>
                <Text style={styles.costLabel}>Translator fee</Text>
                <Text style={styles.costValue}>
                  {translatorCost > 0 ? `¥${translatorCost.toLocaleString()}` : "¥0"}
                </Text>
              </View>

              <View style={[styles.costRow, styles.costRowTotal]}>
                <Text style={styles.costTotalLabel}>Total</Text>
                <Text style={styles.costTotalValue}>¥{totalCost.toLocaleString()}</Text>
              </View>
            </View>

            <View style={{ height: 16 }} />
          </View>
        </ScrollView>

        {/* Fixed Confirm Booking bar */}
        <View style={styles.confirmBar}>
          <Pressable
            style={[styles.confirmBtn, !canConfirm && styles.confirmBtnDisabled]}
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
      </View>
    </Modal>
  );
}

// Styles

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

  // Header
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerSide: {
    width: 84,
    justifyContent: "center",
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
    alignSelf: "flex-end",
  },

  // Body
  sheetBody: {
    flex: 1,
  },
  sheetBodyContent: {
    padding: 20,
    paddingBottom: 8,
  },

  // Step headings
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

  // Translator Yes/No buttons
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

  // Language grid
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
  translatorList: {
    marginTop: 14,
    gap: 10,
  },
  translatorCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: COLORS.white,
  },
  translatorCardSelected: {
    borderColor: COLORS.approved,
    backgroundColor: COLORS.cardBackground,
  },
  translatorName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primaryText,
  },
  translatorMeta: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.secondaryText,
  },

  // Session cards
  sessionList: {
    gap: 10,
    marginBottom: 4,
  },
  sessionCard: {
    flexDirection: "row",
    justifyContent: "flex-start",
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
  sessionCardUnavailable: {
    borderColor: "#D2D2D2",
    backgroundColor: "#F1F1F1",
  },
  sessionDate: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primaryText,
  },
  sessionDateSelected: {
    color: COLORS.white,
  },
  sessionDateUnavailable: {
    color: "#8A8A8A",
  },
  sessionMainInfo: {
    flex: 1,
  },
  sessionUnavailableLabel: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "700",
    color: "#777777",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  sessionBookedLabel: {
    color: COLORS.approved,
  },
  sessionMeta: {
    marginTop: 6,
    fontSize: 12,
    color: COLORS.secondaryText,
  },
  sessionMetaSelected: {
    color: "rgba(255,255,255,0.9)",
  },
  sessionMetaUnavailable: {
    color: "#9A9A9A",
  },
  noSessions: {
    fontSize: 14,
    color: COLORS.tertiaryText,
    fontStyle: "italic",
    marginBottom: 16,
  },
  participantHint: {
    fontSize: 13,
    color: COLORS.secondaryText,
    marginBottom: 8,
  },
  statsText: {
    fontSize: 13,
    color: COLORS.secondaryText,
    marginTop: -2,
    marginBottom: 14,
  },

  // Participants counter
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

  // Cost breakdown
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

  // Fixed confirm bar
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

