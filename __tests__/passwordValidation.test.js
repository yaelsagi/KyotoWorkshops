import {
  PASSWORD_REQUIREMENTS_TEXT,
  getPasswordRuleChecks,
  isPasswordValid,
  getPasswordValidationError,
} from '../utils/passwordValidation';

describe('passwordValidation', () => {
  test('accepts password with at least 8 characters including letters and numbers', () => {
    expect(isPasswordValid('abc12345')).toBe(true);
    expect(getPasswordValidationError('abc12345')).toBeNull();
  });

  test('rejects password shorter than 8', () => {
    expect(isPasswordValid('ab123')).toBe(false);
    expect(getPasswordValidationError('ab123')).toBe(PASSWORD_REQUIREMENTS_TEXT);
  });

  test('rejects password without number', () => {
    expect(isPasswordValid('abcdefgh')).toBe(false);
    expect(getPasswordValidationError('abcdefgh')).toBe(PASSWORD_REQUIREMENTS_TEXT);
  });

  test('rejects password without letter', () => {
    expect(isPasswordValid('12345678')).toBe(false);
    expect(getPasswordValidationError('12345678')).toBe(PASSWORD_REQUIREMENTS_TEXT);
  });

  test('returns required message for empty password', () => {
    expect(getPasswordValidationError('')).toBe('Password is required');
  });

  test('returns rule checks for password hints', () => {
    const checks = getPasswordRuleChecks('abc12345');
    expect(checks.hasMinimumLength).toBe(true);
    expect(checks.hasLetter).toBe(true);
    expect(checks.hasNumber).toBe(true);
  });
});

