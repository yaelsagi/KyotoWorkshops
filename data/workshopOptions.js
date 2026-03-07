// Compatibility barrel file.
// New code should import from:
// - constants/kyotoWards
// - constants/workshopCategories
// - utils/normalizeWardName

export {
  ALL_OPTION,
  JAPANESE_WARD_TO_ENGLISH,
  KYOTO_WARD_DEFINITIONS,
  KYOTO_WARD_OPTIONS,
  KYOTO_WARDS,
} from "../constants/kyotoWards";

export { WORKSHOP_CATEGORIES } from "../constants/workshopCategories";

export { normalizeWardName } from "../utils/normalizeWardName";
