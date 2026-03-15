import { matchTranslatorsForSession } from '../services/translatorService';

describe('Translator session matching', () => {
  test('matches when any same-day slot fits session time', () => {
    const translators = [
      {
        id: 'translator_a',
        roles: { translator: true },
        translatorApplication: {
          targetLanguages: ['English'],
          wardsAvailable: ['Nakagyo'],
          otherLanguageLevels: [{ language: 'English', level: 'Fluent' }],
        },
        translatorProfile: {
          isApproved: true,
          languages: [{ language: 'English', level: 'Fluent' }],
          wardsAvailable: ['Nakagyo'],
          availability: [
            { day: 'Saturday', from: '08:00', to: '09:00' },
            { day: 'Saturday', from: '14:00', to: '18:00' },
          ],
          ratingAverage: 4.5,
          hourlyRateYen: 4000,
        },
      },
    ];

    const result = matchTranslatorsForSession({
      translators,
      requestedLanguage: 'English',
      ward: 'Nakagyo',
      sessionDate: '2026-03-21',
      sessionTime: '15:00',
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('translator_a');
  });

  test('filters out translator when session time is outside all same-day slots', () => {
    const translators = [
      {
        id: 'translator_b',
        roles: { translator: true },
        translatorApplication: {
          targetLanguages: ['English'],
          wardsAvailable: ['Nakagyo'],
          otherLanguageLevels: [{ language: 'English', level: 'Fluent' }],
        },
        translatorProfile: {
          isApproved: true,
          languages: [{ language: 'English', level: 'Fluent' }],
          wardsAvailable: ['Nakagyo'],
          availability: [
            { day: 'Saturday', from: '08:00', to: '09:00' },
            { day: 'Saturday', from: '10:00', to: '12:00' },
          ],
          ratingAverage: 4.5,
          hourlyRateYen: 4000,
        },
      },
    ];

    const result = matchTranslatorsForSession({
      translators,
      requestedLanguage: 'English',
      ward: 'Nakagyo',
      sessionDate: '2026-03-21',
      sessionTime: '15:00',
    });

    expect(result).toHaveLength(0);
  });

  test('ranks by language level, then rating, then lower fee', () => {
    const translators = [
      {
        id: 'translator_low_level',
        roles: { translator: true },
        translatorApplication: {
          targetLanguages: ['English'],
          wardsAvailable: ['Nakagyo'],
          otherLanguageLevels: [{ language: 'English', level: 'Conversational' }],
        },
        translatorProfile: {
          isApproved: true,
          languages: [{ language: 'English', level: 'Conversational' }],
          wardsAvailable: ['Nakagyo'],
          availability: [{ day: 'Saturday', from: '09:00', to: '18:00' }],
          ratingAverage: 5,
          hourlyRateYen: 2500,
        },
      },
      {
        id: 'translator_high_level',
        roles: { translator: true },
        translatorApplication: {
          targetLanguages: ['English'],
          wardsAvailable: ['Nakagyo'],
          otherLanguageLevels: [{ language: 'English', level: 'Native' }],
        },
        translatorProfile: {
          isApproved: true,
          languages: [{ language: 'English', level: 'Native' }],
          wardsAvailable: ['Nakagyo'],
          availability: [{ day: 'Saturday', from: '09:00', to: '18:00' }],
          ratingAverage: 4,
          hourlyRateYen: 7000,
        },
      },
    ];

    const result = matchTranslatorsForSession({
      translators,
      requestedLanguage: 'English',
      ward: 'Nakagyo',
      sessionDate: '2026-03-21',
      sessionTime: '11:00',
    });

    expect(result[0].id).toBe('translator_high_level');
  });
});
