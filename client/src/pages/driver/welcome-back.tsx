import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Power } from "lucide-react";

export default function DriverWelcomeBack() {
  const [, setLocation] = useLocation();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const shown = localStorage.getItem("ziba-driver-welcome-shown");
    if (shown === "true") {
      setLocation("/driver/dashboard");
    }
  }, [setLocation]);

  const handleContinue = () => {
    localStorage.setItem("ziba-driver-welcome-shown", "true");
    setVisible(false);
    setLocation("/driver/dashboard");
  };

  if (!visible) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-emerald-600 to-emerald-800 px-6">
      <div className="max-w-sm w-full text-center space-y-8">
        <div className="flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
            <Power className="w-8 h-8 text-white" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-white" data-testid="text-welcome-title">
            Welcome back
          </h1>
          <p className="text-emerald-100 text-lg" data-testid="text-welcome-body">
            Ready to earn today? Riders are nearby.
          </p>
        </div>

        <div className="space-y-3 pt-4">
          <Button
            size="lg"
            className="w-full h-14 text-lg font-semibold rounded-full bg-white text-emerald-700"
            onClick={handleContinue}
            data-testid="button-go-online"
          >
            GO ONLINE
          </Button>
          <p className="text-sm text-emerald-200">
            Start earning now
          </p>
        </div>
      </div>
    </div>
  );
}
