import { type ToneStyle } from "./country-profiles";

export interface ToneConfig {
  greetingPrefix: string;
  errorPrefix: string;
  guidancePrefix: string;
  escalationMessage: string;
  closingMessage: string;
  useEmoji: boolean;
}

const TONE_CONFIGS: Record<ToneStyle, ToneConfig> = {
  friendly: {
    greetingPrefix: "Hey there! ",
    errorPrefix: "Oops! Something went wrong. ",
    guidancePrefix: "Here's what you can do: ",
    escalationMessage: "No worries! Let me connect you with our support team who can help you better.",
    closingMessage: "Glad I could help! Is there anything else you need?",
    useEmoji: false,
  },
  formal: {
    greetingPrefix: "Good day. ",
    errorPrefix: "We apologize for the inconvenience. ",
    guidancePrefix: "Please follow these steps: ",
    escalationMessage: "I will escalate your request to our support team for further assistance.",
    closingMessage: "Thank you for contacting ZIBA Support. Please do not hesitate to reach out again.",
    useEmoji: false,
  },
  neutral: {
    greetingPrefix: "Hello! ",
    errorPrefix: "Something went wrong. ",
    guidancePrefix: "Here is what to do: ",
    escalationMessage: "Let me connect you with our support team for further help.",
    closingMessage: "Is there anything else I can help with?",
    useEmoji: false,
  },
};

export function getToneConfig(toneStyle: ToneStyle): ToneConfig {
  return TONE_CONFIGS[toneStyle] || TONE_CONFIGS.neutral;
}

export function applyTone(response: string, toneStyle: ToneStyle): string {
  const config = getToneConfig(toneStyle);
  
  if (toneStyle === "formal") {
    return response
      .replace(/Hey there!/gi, "Good day.")
      .replace(/No worries!/gi, "We understand.")
      .replace(/Oops!/gi, "We apologize for the inconvenience.")
      .replace(/don't worry/gi, "please be assured")
      .replace(/you're all set/gi, "your request has been processed");
  }
  
  if (toneStyle === "friendly") {
    return response
      .replace(/Good day\./gi, "Hey there!")
      .replace(/We apologize for the inconvenience\./gi, "Oops! Sorry about that.")
      .replace(/please be assured/gi, "don't worry")
      .replace(/your request has been processed/gi, "you're all set");
  }
  
  return response;
}

export function getZibraGreeting(toneStyle: ToneStyle, role: string, name?: string): string {
  const config = getToneConfig(toneStyle);
  const nameGreet = name ? `, ${name}` : "";
  
  switch (toneStyle) {
    case "friendly":
      if (role === "rider") return `Hey there${nameGreet}! How can I help you today?`;
      if (role === "driver") return `Hey${nameGreet}! Need any help on the road?`;
      if (role === "director") return `Hi${nameGreet}! How can I assist you with your cell today?`;
      return `Hey there${nameGreet}! How can I help?`;
    case "formal":
      if (role === "rider") return `Good day${nameGreet}. How may I assist you?`;
      if (role === "driver") return `Good day${nameGreet}. How may I assist you with your driver operations?`;
      if (role === "director") return `Good day${nameGreet}. How may I assist you with your directorship today?`;
      return `Good day${nameGreet}. How may I assist you?`;
    default:
      if (role === "rider") return `Hello${nameGreet}! How can I help you today?`;
      if (role === "driver") return `Hello${nameGreet}! How can I help you today?`;
      if (role === "director") return `Hello${nameGreet}. How can I assist you today?`;
      return `Hello${nameGreet}! How can I help?`;
  }
}
