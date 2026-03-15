export const TRANSLATOR_APPLICATION_STATUSES = [
  "none",
  "pending",
  "interview_scheduled",
  "approved",
  "rejected",
];

export const JAPANESE_LEVEL_OPTIONS = [
  "Native",
  "JLPT N1",
  "JLPT N2",
  "JLPT N3",
  "Other",
];

export const LANGUAGE_LEVEL_OPTIONS = [
  "Native",
  "Fluent",
  "Professional",
  "Conversational",
];

export const INTERVIEW_SLOT_OPTIONS = [
  "2026-03-18 10:00",
  "2026-03-18 14:00",
  "2026-03-19 11:00",
];

export const TRANSLATOR_STATUS_LABELS = {
  none: "Become a Translator",
  pending: "Translator Application Pending",
  interview_scheduled: "Interview Scheduled",
  approved: "Translator Dashboard",
  rejected: "Reapply for Translator",
};

export const DEFAULT_TRANSLATOR_APPLICATION = {
  status: "none",
  submittedAt: null,
  interviewAt: null,
  bio: null,
  targetLanguages: [],
  japaneseLevel: "",
  japaneseLevelOther: null,
  otherLanguageLevels: [],
  jlptDocumentURL: null,
  otherProofDocumentURLs: [],
  wardsAvailable: [],
  availability: [],
  availabilitySlots: [],
  hourlyRateYen: null,
  hourlyRate: null,
  notes: null,
};

export const DEFAULT_TRANSLATOR_PROFILE = {
  isApproved: false,
  enabled: false,
  japaneseLevel: "",
  languages: [],
  wardsAvailable: [],
  availability: [],
  hourlyRate: null,
  hourlyRateYen: null,
  availabilitySlots: [],
  ratingAverage: 0,
  ratingCount: 0,
  completedJobs: 0,
};
