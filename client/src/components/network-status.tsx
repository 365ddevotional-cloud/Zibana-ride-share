import { useState, useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { createNetworkStatusListener } from "@/lib/network-utils";

export function NetworkStatusIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const cleanup = createNetworkStatusListener(
      () => {
        setIsOnline(true);
        setShowReconnected(true);
        setTimeout(() => setShowReconnected(false), 3000);
      },
      () => {
        setIsOnline(false);
        setShowReconnected(false);
      }
    );

    return cleanup;
  }, []);

  if (isOnline && !showReconnected) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium transition-all duration-300 ${
        isOnline
          ? "bg-green-500 text-white"
          : "bg-destructive text-destructive-foreground"
      }`}
      role="status"
      aria-live="polite"
      data-testid="status-network"
    >
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4" />
          <span>Back online</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          <span>You're offline</span>
        </>
      )}
    </div>
  );
}
