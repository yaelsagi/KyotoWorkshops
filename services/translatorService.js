import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import {
  DEFAULT_TRANSLATOR_APPLICATION,
  DEFAULT_TRANSLATOR_PROFILE,
} from "../constants/translatorOptions";

const LANGUAGE_LEVEL_RANK = {
  basic: 1,
  conversational: 2,
  fluent: 3,
  professional: 4,
  native: 5,
};

function normalizeLanguageLevel(level) {
  if (typeof level === "number" && level >= 1 && level <= 5) {
    return level;
  }

  const normalized = String(level || "").trim().toLowerCase();
  if (!normalized) {
    return 0;
  }

  return LANGUAGE_LEVEL_RANK[normalized] || 0;
}

function isTranslatorApprovedForBooking(translator) {
  return (
    translator?.roles?.translator === true &&
    translator?.translatorProfile?.isApproved === true
  );
}

function getTranslatorLanguages(translator) {
  const profileLanguages = (translator?.translatorProfile?.languages || [])
    .map((item) => (typeof item === "string" ? item : item?.language))
    .filter(Boolean);

  const appLanguages = (translator?.translatorApplication?.targetLanguages || []).filter(Boolean);
  return [...new Set([...profileLanguages, ...appLanguages])];
}

function getTranslatorLanguageLevel(translator, requestedLanguage) {
  const language = String(requestedLanguage || "").trim().toLowerCase();
  if (!language) {
    return 0;
  }

  const profileEntry = (translator?.translatorProfile?.languages || []).find(
    (item) =>
      String(typeof item === "string" ? item : item?.language || "")
        .trim()
        .toLowerCase() === language
  );

  const profileLevel = normalizeLanguageLevel(
    typeof profileEntry === "string" ? null : profileEntry?.level
  );
  if (profileLevel > 0) {
    return profileLevel;
  }

  const appLevelEntry = (translator?.translatorApplication?.otherLanguageLevels || []).find(
    (item) => String(item?.language || "").trim().toLowerCase() === language
  );

  return normalizeLanguageLevel(appLevelEntry?.level);
}

function getTranslatorWards(translator) {
  const profileWards = (translator?.translatorProfile?.wardsAvailable || []).filter(Boolean);
  const appWards = (translator?.translatorApplication?.wardsAvailable || []).filter(Boolean);
  return [...new Set([...profileWards, ...appWards])];
}

function getTranslatorHourlyRate(translator) {
  const hourlyRateYen = Number(translator?.translatorProfile?.hourlyRateYen);
  if (Number.isFinite(hourlyRateYen) && hourlyRateYen > 0) {
    return hourlyRateYen;
  }

  const hourlyRate = Number(translator?.translatorProfile?.hourlyRate);
  if (Number.isFinite(hourlyRate) && hourlyRate > 0) {
    return hourlyRate;
  }

  return Number.MAX_SAFE_INTEGER;
}

// Submit translator application
export async function submitTranslatorApplication(userId, payload) {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const userRef = doc(db, "users", userId);
  const now = new Date().toISOString();

  const translatorApplication = {
    ...DEFAULT_TRANSLATOR_APPLICATION,
    ...payload,
    status: payload?.interviewAt ? "interview_scheduled" : "pending",
    submittedAt: now,
  };

  await updateDoc(userRef, {
    translatorApplication,
    updatedAt: now,
  });

  return translatorApplication;
}

// Update translator profile after approval
export async function updateTranslatorProfile(userId, patch) {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const userRef = doc(db, "users", userId);
  const snapshot = await getDoc(userRef);
  if (!snapshot.exists()) {
    throw new Error("User not found");
  }

  const current = snapshot.data();
  const nextProfile = {
    ...DEFAULT_TRANSLATOR_PROFILE,
    ...(current.translatorProfile || {}),
    ...patch,
  };

  await updateDoc(userRef, {
    translatorProfile: nextProfile,
    updatedAt: new Date().toISOString(),
  });

  return nextProfile;
}

// Get pending translator applications for admin
export async function fetchPendingTranslatorApplications() {
  const usersRef = collection(db, "users");
  // Fetch pending translator applications
  const q = query(
    usersRef,
    where("translatorApplication.status", "in", ["pending", "interview_scheduled"])
  );

  const snapshot = await getDocs(q);
  // Sort newest first in app code
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => {
      const aTime = Date.parse(a?.translatorApplication?.submittedAt || a?.createdAt || 0) || 0;
      const bTime = Date.parse(b?.translatorApplication?.submittedAt || b?.createdAt || 0) || 0;
      return bTime - aTime;
    });
}

// Review translator application
export async function reviewTranslatorApplication(userId, approved) {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const userRef = doc(db, "users", userId);
  const snapshot = await getDoc(userRef);
  if (!snapshot.exists()) {
    throw new Error("User not found");
  }

  const current = snapshot.data();
  const now = new Date().toISOString();
  const previousApplication = current.translatorApplication || DEFAULT_TRANSLATOR_APPLICATION;
  const previousProfile = current.translatorProfile || DEFAULT_TRANSLATOR_PROFILE;

  // Approve or reject the application
  const nextStatus = approved ? "approved" : "rejected";

  await updateDoc(userRef, {
    roles: {
      ...(current.roles || {}),
      translator: Boolean(approved),
    },
    translatorApplication: {
      ...previousApplication,
      status: nextStatus,
    },
    translatorProfile: {
      ...DEFAULT_TRANSLATOR_PROFILE,
      ...previousProfile,
      isApproved: Boolean(approved),
      enabled: Boolean(approved),
    },
    updatedAt: now,
  });

  return nextStatus;
}

// Fetch approved translators for matching
export async function fetchApprovedTranslators() {
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("roles.translator", "==", true));
  const snapshot = await getDocs(q);

  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .filter((user) => isTranslatorApprovedForBooking(user))
    .map((user) => ({
      id: user.id,
      roles: user.roles || {},
      displayName: user.displayName,
      photoURL: user.photoURL || null,
      translatorApplication: user.translatorApplication || DEFAULT_TRANSLATOR_APPLICATION,
      translatorProfile: user.translatorProfile || DEFAULT_TRANSLATOR_PROFILE,
    }));
}

// Fetch translator reviews
export async function fetchTranslatorReviews(translatorId) {
  if (!translatorId) {
    return [];
  }

  const reviewsRef = collection(db, "translatorReviews");
  const q = query(reviewsRef, where("translatorId", "==", translatorId), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

// Match translators by language, ward, and rating
export function matchTranslators({ translators, requestedLanguage, ward }) {
  const language = String(requestedLanguage || "").trim();
  const normalizedWard = String(ward || "").trim();

  // Stage 1 — filter translators that cannot work this booking
  return (translators || [])
    .filter((translator) => {
      if (!isTranslatorApprovedForBooking(translator)) {
        return false;
      }

      const supportedLanguages = getTranslatorLanguages(translator);
      if (!supportedLanguages.includes(language)) {
        return false;
      }

      const wardsAvailable = getTranslatorWards(translator);
      if (!wardsAvailable.includes(normalizedWard)) {
        return false;
      }

      return true;
    })
    // Stage 2 — rank by language level, then rating, then lower fee
    .sort((a, b) => {
      const levelDelta =
        getTranslatorLanguageLevel(b, language) - getTranslatorLanguageLevel(a, language);
      if (levelDelta !== 0) return levelDelta;

      const ratingDelta =
        Number(b?.translatorProfile?.ratingAverage || 0) - Number(a?.translatorProfile?.ratingAverage || 0);
      if (ratingDelta !== 0) return ratingDelta;

      return getTranslatorHourlyRate(a) - getTranslatorHourlyRate(b);
    });
}

// Convert "HH:MM" time string to total minutes since midnight for comparison
function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return -1;
  const [h, m] = timeStr.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return -1;
  return h * 60 + m;
}

// Match translators accounting for session weekday and time range availability.
// Uses translatorProfile.availability: [{ day, from, to }] (new spec format).
// Falls back to matchTranslators (language + ward only) when no availability data exists.
export function matchTranslatorsForSession({ translators, requestedLanguage, ward, sessionDate, sessionTime }) {
  const language = String(requestedLanguage || "").trim();
  const normalizedWard = String(ward || "").trim();

  // Derive weekday name from sessionDate (e.g. "2026-04-12" → "Sunday")
  let sessionDay = null;
  let sessionMinutes = -1;
  if (sessionDate) {
    try {
      const d = new Date(sessionDate);
      if (!Number.isNaN(d.getTime())) {
        sessionDay = d.toLocaleDateString("en-US", { weekday: "long" }); // "Monday", "Tuesday" …
      }
    } catch {
      // Ignore parse error; availability check will be skipped
    }
  }
  if (sessionTime) {
    sessionMinutes = timeToMinutes(sessionTime);
  }

  return (translators || [])
    .filter((translator) => {
      // Stage 1 — filter translators that cannot work this booking
      if (!isTranslatorApprovedForBooking(translator)) {
        return false;
      }

      const supportedLanguages = getTranslatorLanguages(translator);
      if (!supportedLanguages.includes(language)) {
        return false;
      }

      const wardsAvailable = getTranslatorWards(translator);
      if (!wardsAvailable.includes(normalizedWard)) {
        return false;
      }

      // Availability check (weekday + time range)
      const availability = translator?.translatorProfile?.availability || translator?.translatorProfile?.availabilitySlots || [];
      if (sessionDay) {
        const dayMatch = availability.find(
          (slot) => String(slot?.day || "").toLowerCase() === sessionDay.toLowerCase()
        );
        if (!dayMatch) return false;

        // Check session time falls within the translator's time window
        if (sessionMinutes >= 0) {
          const fromMin = timeToMinutes(dayMatch.from);
          const toMin = timeToMinutes(dayMatch.to);
          if (fromMin >= 0 && toMin >= 0 && (sessionMinutes < fromMin || sessionMinutes > toMin)) {
            return false;
          }
        }
      }

      return true;
    })
    // Stage 2 — rank by language level, then rating, then lower fee
    .sort((a, b) => {
      const levelDelta =
        getTranslatorLanguageLevel(b, language) - getTranslatorLanguageLevel(a, language);
      if (levelDelta !== 0) return levelDelta;

      const ratingDelta =
        Number(b?.translatorProfile?.ratingAverage || 0) -
        Number(a?.translatorProfile?.ratingAverage || 0);
      if (ratingDelta !== 0) return ratingDelta;

      return getTranslatorHourlyRate(a) - getTranslatorHourlyRate(b);
    });
}
