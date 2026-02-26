import { useState, useCallback, useEffect, useRef } from "react";
import {
  startTracking,
  stopTracking,
  onTrackingStateChange,
  setTripContext,
  isTracking as checkIsTracking,
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

  const start = useCallback(async (tripId?: string) => {
    if (tripId) setTripContext(tripId);
    await startTracking();
  }, []);

  const stop = useCallback(async () => {
    setTripContext(null);
    await stopTracking();
  }, []);

  const setTrip = useCallback((tripId: string | null) => {
    setTripContext(tripId);
  }, []);

  return {
    trackingState: state.status,
    lastCoords: state.lastCoords,
    lastSentAt: state.lastSentAt,
    error: state.error,
    isTracking: checkIsTracking(),
    start,
    stop,
    setTrip,
  };
}
