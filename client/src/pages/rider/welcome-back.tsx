import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { MapPin } from "lucide-react";

export default function RiderWelcomeBack() {
  const [, setLocation] = useLocation();
  const [phase, setPhase] = useState<"enter" | "visible" | "exit">("enter");
  const navigated = useRef(false);

  useEffect(() => {
    const shown = localStorage.getItem("ziba-rider-welcome-shown");
    if (shown === "true") {
      setLocation("/rider/home");
      return;
    }

    const enterTimer = setTimeout(() => setPhase("visible"), 50);
    return () => clearTimeout(enterTimer);
  }, [setLocation]);

  useEffect(() => {
    if (phase !== "visible") return;

    localStorage.setItem("ziba-rider-welcome-shown", "true");

    const exitTimer = setTimeout(() => setPhase("exit"), 2200);
    return () => clearTimeout(exitTimer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "exit" || navigated.current) return;
    const navTimer = setTimeout(() => {
      navigated.current = true;
      setLocation("/rider/home");
    }, 500);
    return () => clearTimeout(navTimer);
  }, [phase, setLocation]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-background px-6 transition-opacity duration-500"
      style={{ opacity: phase === "enter" ? 0 : phase === "exit" ? 0 : 1 }}
      data-testid="screen-rider-welcome"
    >
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <MapPin className="w-10 h-10 text-primary" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-welcome-title">
            Welcome back
          </h1>
          <p className="text-muted-foreground text-base" data-testid="text-welcome-body">
            Ready to get moving?
          </p>
        </div>

        <div className="pt-2">
          <div className="flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse" />
            <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" style={{ animationDelay: "0.2s" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-primary/20 animate-pulse" style={{ animationDelay: "0.4s" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
