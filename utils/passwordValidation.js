// Progress: this utility module is implemented and currently used by app features.
export const MIN_PASSWORD_LENGTH = 8;
export const PASSWORD_REQUIREMENTS_TEXT = "Use at least 8 characters including letters and numbers.";

export function getPasswordRuleChecks(password) {
  const value = String(password || "");

  return {
    hasMinimumLength: value.length >= MIN_PASSWORD_LENGTH,
    hasLetter: /[A-Za-z]/.test(value),
    hasNumber: /\d/.test(value),
  };
}

export function isPasswordValid(password) {
  const checks = getPasswordRuleChecks(password);

  return checks.hasMinimumLength && checks.hasLetter && checks.hasNumber;
}

export function getPasswordValidationError(password) {
  if (!String(password || "").trim()) {
    return "Password is required";
  }

  if (!isPasswordValid(password)) {
    return PASSWORD_REQUIREMENTS_TEXT;
  }

  return null;
}
