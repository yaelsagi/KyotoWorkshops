export const ALL_OPTION = "All";

export const KYOTO_WARD_DEFINITIONS = [
  { key: "kita", en: "Kita", ja: "北区" },
  { key: "kamigyo", en: "Kamigyo", ja: "上京区" },
  { key: "sakyo", en: "Sakyo", ja: "左京区" },
  { key: "nakagyo", en: "Nakagyo", ja: "中京区" },
  { key: "shimogyo", en: "Shimogyo", ja: "下京区" },
  { key: "minami", en: "Minami", ja: "南区" },
  { key: "ukyo", en: "Ukyo", ja: "右京区" },
  { key: "nishikyo", en: "Nishikyo", ja: "西京区" },
  { key: "fushimi", en: "Fushimi", ja: "伏見区" },
  { key: "yamashina", en: "Yamashina", ja: "山科区" },
  { key: "higashiyama", en: "Higashiyama", ja: "東山区" },
];

export const KYOTO_WARDS = KYOTO_WARD_DEFINITIONS.map((ward) => ward.en);

export const KYOTO_WARD_OPTIONS = [ALL_OPTION, ...KYOTO_WARDS];

export const JAPANESE_WARD_TO_ENGLISH = Object.fromEntries(
  KYOTO_WARD_DEFINITIONS.map((ward) => [ward.ja, ward.en])
);
