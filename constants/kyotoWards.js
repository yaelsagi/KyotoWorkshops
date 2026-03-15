// Special option used in filters to allow the user to see workshops from all wards
export const ALL_OPTION = "All";

// List of Kyoto wards used in the application.
// These names are used for workshop data, map filtering, and search.
export const KYOTO_WARDS = [
  "Fushimi",
  "Higashiyama",
  "Kamigyo",
  "Kita",
  "Minami",
  "Nakagyo",
  "Nishikyo",
  "Sakyo",
  "Shimogyo",
  "Ukyo",
  "Yamashina",
];

// List of filter options shown in the UI.
// Adds the "All" option at the beginning so users can view workshops from every ward.
export const KYOTO_WARD_OPTIONS = [ALL_OPTION, ...KYOTO_WARDS];