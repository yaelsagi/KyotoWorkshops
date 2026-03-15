import { normalizeWardName } from './normalizeWardName';

export const WORKSHOP_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export const CATEGORY_SUGGESTION_STATUS = {
  NONE: 'none',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export function normalizeCategoryLabel(value) {
  if (typeof value !== 'string') {
    return '';
  }

  const sanitized = value
    .replace(/[^A-Za-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!sanitized) {
    return '';
  }

  return sanitized
    .split(' ')
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(' ');
}

export function normalizeCategoryComparisonKey(value) {
  const label = normalizeCategoryLabel(value);
  if (!label) {
    return '';
  }

  return label
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export function normalizeWorkshopLocation(workshop) {
  if (!workshop || typeof workshop !== 'object') {
    return workshop;
  }

  return {
    ...workshop,
    ward: normalizeWardName(workshop.ward),
  };
}

export function toWorkshopCategory(workshop) {
  if (workshop?.category) {
    return workshop.category;
  }

  if (Array.isArray(workshop?.categories) && workshop.categories.length > 0) {
    return workshop.categories[0];
  }

  return null;
}

export function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getNextDateForWeekday(targetWeekday, weekOffset = 0) {
  const today = new Date();
  const currentWeekday = today.getDay();
  let dayOffset = (targetWeekday - currentWeekday + 7) % 7;
  if (dayOffset === 0) {
    dayOffset = 7;
  }

  dayOffset += weekOffset * 7;

  const date = new Date(today);
  date.setHours(12, 0, 0, 0);
  date.setDate(today.getDate() + dayOffset);
  return formatLocalDate(date);
}

export function generateSessions(workshop) {
  if (!workshop || typeof workshop !== 'object') {
    return [];
  }

  const rawSessions = Array.isArray(workshop.sessions) ? workshop.sessions.filter(Boolean) : [];
  if (rawSessions.length > 0) {
    return rawSessions;
  }

  const availableSlots = Number(workshop.availableSlots);
  if (!Number.isFinite(availableSlots) || availableSlots <= 0) {
    return [];
  }

  const sessionTemplates = workshop.id === 'workshop_tea_ceremony'
    ? [
        { weekday: 3, time: '10:30' },
        { weekday: 6, time: '14:00' },
        { weekday: 0, time: '11:00' },
        { weekday: 2, time: '15:30' },
      ]
    : [
        { weekday: 6, time: '10:00' },
        { weekday: 0, time: '13:00' },
        { weekday: 3, time: '11:00' },
      ];

  const count = Math.min(sessionTemplates.length, Math.max(1, availableSlots));
  return sessionTemplates.slice(0, count).map((template, index) => ({
    id: `${workshop.id}_session_${index + 1}`,
    date: getNextDateForWeekday(template.weekday, Math.floor(index / 2)),
    time: template.time,
  }));
}

export function normalizeWorkshop(workshop) {
  const normalized = normalizeWorkshopLocation(workshop);
  if (!normalized || typeof normalized !== 'object') {
    return normalized;
  }

  const normalizedCustomCategorySuggestion = normalizeCategoryLabel(normalized.customCategorySuggestion);

  const categories = Array.isArray(normalized.categories)
    ? normalized.categories.filter(Boolean)
    : (normalized.category ? [normalized.category] : []);

  return {
    ...normalized,
    categories,
    sessions: Array.isArray(normalized.sessions) && normalized.sessions.length > 0
      ? normalized.sessions
      : generateSessions(normalized),
    category: toWorkshopCategory({ ...normalized, categories }),
    status: normalized.status || WORKSHOP_STATUS.APPROVED,
    customCategorySuggestion: normalizedCustomCategorySuggestion || null,
    customCategorySuggestionStatus:
      normalized.customCategorySuggestionStatus ||
      (normalizedCustomCategorySuggestion ? CATEGORY_SUGGESTION_STATUS.PENDING : CATEGORY_SUGGESTION_STATUS.NONE),
  };
}
