export type VoiceLanguage = "en" | "yo" | "ha" | "ig" | "fr" | "ar" | "zu";

export interface VoiceConfig {
  enabled: boolean;
  language: VoiceLanguage;
  autoSpeak: boolean;
  requireConsent: boolean;
  speed: number;
  pitch: number;
}

export const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  enabled: false,
  language: "en",
  autoSpeak: false,
  requireConsent: true,
  speed: 1.0,
  pitch: 1.0,
};

export const VOICE_LANGUAGE_SUPPORT: Record<VoiceLanguage, { name: string; available: boolean; fallback: VoiceLanguage | null }> = {
  en: { name: "English", available: true, fallback: null },
  yo: { name: "Yoruba", available: false, fallback: "en" },
  ha: { name: "Hausa", available: false, fallback: "en" },
  ig: { name: "Igbo", available: false, fallback: "en" },
  fr: { name: "French", available: true, fallback: "en" },
  ar: { name: "Arabic", available: true, fallback: "en" },
  zu: { name: "Zulu", available: false, fallback: "en" },
};

export function isVoiceAvailable(lang: string): boolean {
  const voiceLang = lang as VoiceLanguage;
  return VOICE_LANGUAGE_SUPPORT[voiceLang]?.available ?? false;
}

export function getVoiceFallback(lang: string): VoiceLanguage {
  const voiceLang = lang as VoiceLanguage;
  const support = VOICE_LANGUAGE_SUPPORT[voiceLang];
  if (!support || !support.available) {
    return support?.fallback ?? "en";
  }
  return voiceLang;
}

export interface SpeechToTextConfig {
  enabled: boolean;
  language: VoiceLanguage;
  continuous: boolean;
  interimResults: boolean;
}

export const DEFAULT_STT_CONFIG: SpeechToTextConfig = {
  enabled: false,
  language: "en",
  continuous: false,
  interimResults: false,
};

export function canUseVoice(config: VoiceConfig): boolean {
  return config.enabled && !config.autoSpeak;
}

export function getVoiceStatusMessage(lang: string, enabled: boolean): string {
  if (!enabled) return "Voice is currently disabled. Enable it in Settings.";
  if (!isVoiceAvailable(lang)) {
    const fallback = getVoiceFallback(lang);
    return `Voice is not yet available in ${VOICE_LANGUAGE_SUPPORT[lang as VoiceLanguage]?.name || lang}. Using ${VOICE_LANGUAGE_SUPPORT[fallback]?.name || "English"} instead.`;
  }
  return "Voice is ready.";
}
