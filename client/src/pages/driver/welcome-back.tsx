import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { Power } from "lucide-react";

export default function DriverWelcomeBack() {
  const [, setLocation] = useLocation();
  const [phase, setPhase] = useState<"enter" | "visible" | "exit">("enter");
  const navigated = useRef(false);

  useEffect(() => {
    const shown = localStorage.getItem("zibana-driver-welcome-shown");
    if (shown === "true") {
      setLocation("/driver/dashboard");
      return;
    }

    const enterTimer = setTimeout(() => setPhase("visible"), 50);
    return () => clearTimeout(enterTimer);
  }, [setLocation]);

  useEffect(() => {
    if (phase !== "visible") return;

    localStorage.setItem("zibana-driver-welcome-shown", "true");

    const exitTimer = setTimeout(() => setPhase("exit"), 2200);
    return () => clearTimeout(exitTimer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "exit" || navigated.current) return;
    const navTimer = setTimeout(() => {
      navigated.current = true;
      setLocation("/driver/dashboard");
    }, 500);
    return () => clearTimeout(navTimer);
  }, [phase, setLocation]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-emerald-600 to-emerald-800 px-6 transition-opacity duration-500"
      style={{ opacity: phase === "enter" ? 0 : phase === "exit" ? 0 : 1 }}
      data-testid="screen-driver-welcome"
    >
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-white/15 flex items-center justify-center">
            <Power className="w-10 h-10 text-white" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-white" data-testid="text-welcome-title">
            Welcome back
          </h1>
          <p className="text-emerald-100 text-base" data-testid="text-welcome-body">
            You're online and ready to earn today.
          </p>
        </div>

        <div className="pt-2">
          <div className="flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse" />
            <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse" style={{ animationDelay: "0.2s" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse" style={{ animationDelay: "0.4s" }} />
          </div>
          <p className="text-sm text-emerald-200/70 mt-3">
            Finding trips nearby...
          </p>
        </div>
      </div>
    </div>
  );
}
