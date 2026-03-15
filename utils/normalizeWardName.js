
const JAPANESE_WARD_TO_ENGLISH = {
  "北区": "Kita",
  "上京区": "Kamigyo",
  "左京区": "Sakyo",
  "中京区": "Nakagyo",
  "下京区": "Shimogyo",
  "南区": "Minami",
  "右京区": "Ukyo",
  "西京区": "Nishikyo",
  "伏見区": "Fushimi",
  "山科区": "Yamashina",
  "東山区": "Higashiyama",
};

export function normalizeWardName(rawWard) {
  if (!rawWard) return "";
  const trimmed = String(rawWard).trim();
  return JAPANESE_WARD_TO_ENGLISH[trimmed] || trimmed;
}

