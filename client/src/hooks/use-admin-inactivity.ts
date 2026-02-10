import { useEffect, useRef, useState, useCallback } from "react";

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
const WARNING_GRACE_MS = 2 * 60 * 1000;
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "mousemove",
  "mousedown",
  "touchstart",
  "touchmove",
  "keydown",
  "scroll",
  "wheel",
];

interface UseAdminInactivityOptions {
  enabled: boolean;
  onLogout: () => void;
}

export function useAdminInactivity({ enabled, onLogout }: UseAdminInactivityOptions) {
  const [showWarning, setShowWarning] = useState(false);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const graceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutRef = useRef(onLogout);
  logoutRef.current = onLogout;

  const clearTimers = useCallback(() => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
      inactivityTimer.current = null;
    }
    if (graceTimer.current) {
      clearTimeout(graceTimer.current);
      graceTimer.current = null;
    }
  }, []);

  const startGracePeriod = useCallback(() => {
    setShowWarning(true);
    graceTimer.current = setTimeout(() => {
      setShowWarning(false);
      logoutRef.current();
    }, WARNING_GRACE_MS);
  }, []);

  const resetTimer = useCallback(() => {
    clearTimers();
    setShowWarning(false);
    inactivityTimer.current = setTimeout(startGracePeriod, INACTIVITY_TIMEOUT_MS);
  }, [clearTimers, startGracePeriod]);

  const dismissWarning = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      setShowWarning(false);
      return;
    }

    resetTimer();

    const onActivity = () => {
      if (!showWarning) {
        resetTimer();
      }
    };

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }

    return () => {
      clearTimers();
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
    };
  }, [enabled, resetTimer, clearTimers, showWarning]);

  return { showWarning, dismissWarning };
}
