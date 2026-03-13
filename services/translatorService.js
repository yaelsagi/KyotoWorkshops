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
    .filter((user) => user?.translatorProfile?.enabled === true)
    .map((user) => ({
      id: user.id,
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

  // Filter by matching language and ward
  return (translators || [])
    .filter((translator) => {
      const targetLanguages = translator?.translatorApplication?.targetLanguages || [];
      const wardsAvailable = translator?.translatorApplication?.wardsAvailable || [];
      return targetLanguages.includes(language) && wardsAvailable.includes(normalizedWard);
    })
    // Sort: highest rating → most jobs → lowest rate
    .sort((a, b) => {
      const ratingDelta = Number(b?.translatorProfile?.ratingAverage || 0) - Number(a?.translatorProfile?.ratingAverage || 0);
      if (ratingDelta !== 0) return ratingDelta;

      const jobsDelta = Number(b?.translatorProfile?.completedJobs || 0) - Number(a?.translatorProfile?.completedJobs || 0);
      if (jobsDelta !== 0) return jobsDelta;

      return Number(a?.translatorProfile?.hourlyRateYen || Number.MAX_SAFE_INTEGER)
        - Number(b?.translatorProfile?.hourlyRateYen || Number.MAX_SAFE_INTEGER);
    });
}
