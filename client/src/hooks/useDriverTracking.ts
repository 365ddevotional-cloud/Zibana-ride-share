import { useState, useCallback, useEffect, useRef } from "react";
import {
  startTracking,
  stopTracking,
  onTrackingStateChange,
  type TrackingState,
} from "@/lib/trackingEngine";

export function useDriverTracking() {
  const [state, setState] = useState<TrackingState>({
    status: "idle",
    lastCoords: null,
    lastSentAt: null,
    error: null,
  });

  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    onTrackingStateChange((partial) => {
      if (mounted.current) {
        setState((prev) => ({ ...prev, ...partial }));
      }
    });
    return () => {
      mounted.current = false;
    };
  }, []);

  const start = useCallback(async () => {
    await startTracking();
  }, []);

  const stop = useCallback(async () => {
    await stopTracking();
  }, []);

  return {
    trackingState: state.status,
    lastCoords: state.lastCoords,
    lastSentAt: state.lastSentAt,
    error: state.error,
    start,
    stop,
  };
}
