import { JAPANESE_WARD_TO_ENGLISH } from "../constants/kyotoWards";

export function normalizeWardName(rawWard) {
  if (!rawWard) return "";
  const trimmed = String(rawWard).trim();
  return JAPANESE_WARD_TO_ENGLISH[trimmed] || trimmed;
}
