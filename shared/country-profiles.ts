export type ToneStyle = "formal" | "friendly" | "neutral";
export type LegalRegion = "NG" | "GH" | "SA" | "KE" | "FRANCOPHONE" | "ARABIC" | "US" | "UK" | "EU" | "GLOBAL";

export interface CountryProfile {
  countryCode: string;
  name: string;
  defaultLanguage: string;
  secondaryLanguages: string[];
  currency: string;
  toneStyle: ToneStyle;
  legalRegion: LegalRegion;
}

export const COUNTRY_PROFILES: Record<string, CountryProfile> = {
  NG: {
    countryCode: "NG",
    name: "Nigeria",
    defaultLanguage: "en",
    secondaryLanguages: ["ha", "ig", "yo"],
    currency: "NGN",
    toneStyle: "friendly",
    legalRegion: "NG",
  },
  GH: {
    countryCode: "GH",
    name: "Ghana",
    defaultLanguage: "en",
    secondaryLanguages: [],
    currency: "GHS",
    toneStyle: "friendly",
    legalRegion: "GH",
  },
  ZA: {
    countryCode: "ZA",
    name: "South Africa",
    defaultLanguage: "en",
    secondaryLanguages: ["zu", "xh", "af"],
    currency: "ZAR",
    toneStyle: "neutral",
    legalRegion: "SA",
  },
  KE: {
    countryCode: "KE",
    name: "Kenya",
    defaultLanguage: "en",
    secondaryLanguages: ["sw"],
    currency: "KES",
    toneStyle: "neutral",
    legalRegion: "KE",
  },
  TZ: {
    countryCode: "TZ",
    name: "Tanzania",
    defaultLanguage: "en",
    secondaryLanguages: ["sw"],
    currency: "TZS",
    toneStyle: "neutral",
    legalRegion: "KE",
  },
  SN: {
    countryCode: "SN",
    name: "Senegal",
    defaultLanguage: "fr",
    secondaryLanguages: [],
    currency: "XOF",
    toneStyle: "formal",
    legalRegion: "FRANCOPHONE",
  },
  CI: {
    countryCode: "CI",
    name: "Cote d'Ivoire",
    defaultLanguage: "fr",
    secondaryLanguages: [],
    currency: "XOF",
    toneStyle: "formal",
    legalRegion: "FRANCOPHONE",
  },
  CM: {
    countryCode: "CM",
    name: "Cameroon",
    defaultLanguage: "fr",
    secondaryLanguages: ["en"],
    currency: "XAF",
    toneStyle: "formal",
    legalRegion: "FRANCOPHONE",
  },
  EG: {
    countryCode: "EG",
    name: "Egypt",
    defaultLanguage: "ar",
    secondaryLanguages: ["en"],
    currency: "EGP",
    toneStyle: "formal",
    legalRegion: "ARABIC",
  },
  MA: {
    countryCode: "MA",
    name: "Morocco",
    defaultLanguage: "ar",
    secondaryLanguages: ["fr"],
    currency: "MAD",
    toneStyle: "formal",
    legalRegion: "ARABIC",
  },
  SA: {
    countryCode: "SA",
    name: "Saudi Arabia",
    defaultLanguage: "ar",
    secondaryLanguages: ["en"],
    currency: "SAR",
    toneStyle: "formal",
    legalRegion: "ARABIC",
  },
  US: {
    countryCode: "US",
    name: "United States",
    defaultLanguage: "en",
    secondaryLanguages: ["es"],
    currency: "USD",
    toneStyle: "formal",
    legalRegion: "US",
  },
  GB: {
    countryCode: "GB",
    name: "United Kingdom",
    defaultLanguage: "en",
    secondaryLanguages: [],
    currency: "GBP",
    toneStyle: "formal",
    legalRegion: "UK",
  },
  CA: {
    countryCode: "CA",
    name: "Canada",
    defaultLanguage: "en",
    secondaryLanguages: ["fr"],
    currency: "CAD",
    toneStyle: "formal",
    legalRegion: "US",
  },
};

export const DEFAULT_PROFILE: CountryProfile = {
  countryCode: "GLOBAL",
  name: "Global",
  defaultLanguage: "en",
  secondaryLanguages: [],
  currency: "USD",
  toneStyle: "neutral",
  legalRegion: "GLOBAL",
};

export function getCountryProfile(countryCode?: string): CountryProfile {
  if (!countryCode) return DEFAULT_PROFILE;
  return COUNTRY_PROFILES[countryCode.toUpperCase()] || DEFAULT_PROFILE;
}

export function getCountryByName(name: string): CountryProfile | undefined {
  const lower = name.toLowerCase();
  return Object.values(COUNTRY_PROFILES).find(
    (p) => p.name.toLowerCase() === lower || p.countryCode.toLowerCase() === lower
  );
}
