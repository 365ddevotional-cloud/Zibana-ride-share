import { useState, useCallback, useEffect } from "react";

const INTENT_MAP: Record<string, string> = {
  "verified-drivers": "safety-first",
  "quick-pickup": "speed-aware",
  "easy-booking": "convenience",
  "live-tracking": "safety-aware",
  "flexible-payments": "cost-aware",
  "rate-trip": "quality-aware",
  "safety-first": "safety-first",
};

const CTA_MAP: Record<string, string> = {
  "safety-first": "Ride with verified drivers",
  "safety-aware": "Track rides safely with ZIBA",
  "cost-aware": "Pay flexibly with ZIBA",
  "speed-aware": "Get picked up fast with ZIBA",
  "convenience": "Book your ride with ZIBA",
  "quality-aware": "Ride with top-rated drivers",
};

function getSessionId(): string {
  let id = sessionStorage.getItem("ziba-anon-session");
  if (!id) {
    id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem("ziba-anon-session", id);
  }
  return id;
}

function getInteractionCount(): number {
  return parseInt(sessionStorage.getItem("ziba-interaction-count") || "0", 10);
}

function incrementInteractionCount(): number {
  const count = getInteractionCount() + 1;
  sessionStorage.setItem("ziba-interaction-count", String(count));
  return count;
}

function getStoredIntent(): string | null {
  return sessionStorage.getItem("ziba-user-intent");
}

function setStoredIntent(intent: string) {
  sessionStorage.setItem("ziba-user-intent", intent);
}

async function trackEvent(eventType: string, eventTarget?: string, intent?: string) {
  try {
    await fetch("/api/welcome/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: getSessionId(),
        eventType,
        eventTarget: eventTarget || undefined,
        intent: intent || getStoredIntent() || undefined,
      }),
    });
  } catch {
    // Silently fail - analytics should never break the app
  }
}

export function useDiscovery() {
  const [intent, setIntent] = useState<string | null>(getStoredIntent());
  const [interactionCount, setInteractionCount] = useState(getInteractionCount());
  const [showZibra, setShowZibra] = useState(false);

  useEffect(() => {
    trackEvent("page_view", "welcome");
  }, []);

  useEffect(() => {
    if (interactionCount >= 2 && !sessionStorage.getItem("ziba-zibra-dismissed")) {
      const timer = setTimeout(() => setShowZibra(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [interactionCount]);

  const trackCardClick = useCallback((cardId: string) => {
    const newIntent = INTENT_MAP[cardId] || "general";
    setStoredIntent(newIntent);
    setIntent(newIntent);
    const count = incrementInteractionCount();
    setInteractionCount(count);
    trackEvent("card_click", cardId, newIntent);
  }, []);

  const trackCtaClick = useCallback(() => {
    trackEvent("cta_click", undefined, intent || undefined);
  }, [intent]);

  const trackSignupStart = useCallback(() => {
    trackEvent("signup_start", undefined, intent || undefined);
  }, [intent]);

  const trackZibraOpen = useCallback(() => {
    trackEvent("zibra_open");
  }, []);

  const dismissZibra = useCallback(() => {
    setShowZibra(false);
    sessionStorage.setItem("ziba-zibra-dismissed", "true");
  }, []);

  const getAdaptiveCta = useCallback(() => {
    if (!intent) return "Get Started";
    return CTA_MAP[intent] || "Get Started";
  }, [intent]);

  const getSignupUrl = useCallback(() => {
    const base = "/api/login?role=rider";
    if (intent) {
      return `${base}&intent=${encodeURIComponent(intent)}`;
    }
    return base;
  }, [intent]);

  return {
    intent,
    interactionCount,
    showZibra,
    trackCardClick,
    trackCtaClick,
    trackSignupStart,
    trackZibraOpen,
    dismissZibra,
    getAdaptiveCta,
    getSignupUrl,
  };
}
