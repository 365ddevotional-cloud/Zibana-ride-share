import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Compass, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { readPreference, savePreference } from "@/lib/preferences";

type Audience = "rider" | "driver";
const steps = {
  rider: [
    { title: "Welcome to ZIBANA", text: "Set up your rider account, explore safety tools and learn the trip flow. Live bookings are currently closed while launch and payment checks are completed.", tip: "This tour never requests a ride or takes a payment." },
    { title: "Plan your pickup", text: "When booking opens, enter your pickup and destination on Home. Check the pickup pin and vehicle category before continuing.", tip: "Allow location only when you need it. If GPS is unavailable, enter your pickup manually." },
    { title: "Review before you pay", text: "Review the final fare and available payment methods before confirming. Only a verified payment should appear as available wallet funds.", tip: "Keke fares have been approved by the owner. Keke bookings need permitted routes and verified settlement before launch." },
    { title: "Stay informed and get help", text: "Use Trips for your trip history and Help & Safety for account or trip questions. Check your driver's details before entering a vehicle once service is available.", tip: "For immediate danger, contact local emergency services. An app support ticket is not an emergency call." },
  ],
  driver: [
    { title: "Start your driver profile", text: "Sign in, select the driver role and complete your details accurately. Registration does not guarantee approval or immediate trip access.", tip: "Use the Driver area for your vehicle and documents." },
    { title: "Choose your vehicle category", text: "Car and Keke eligibility are separate. Nigerian Keke drivers can declare a tricycle; this does not open Keke bookings or authorize restricted roads.", tip: "Changing vehicle details sends the profile back for review and takes the driver offline." },
    { title: "Prepare for review", text: "Provide clear, current documents and check your review status. Vehicle capacity, local permits and operating routes must be approved before launch.", tip: "Do not go online or use this tour while driving." },
    { title: "Payments and support", text: "Review earnings and payment status in your account. Cash-out availability depends on verified settlement and the payment provider; same-day payouts are not promised.", tip: "Use Help to report an issue or suggest a feature. Include the screen and steps, but never passwords, OTPs or bank credentials." },
  ],
};

export function QuickStartTour({ autoStart = false, audience = "rider" }: { autoStart?: boolean; audience?: Audience }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Audience>(audience);
  const [step, setStep] = useState(0);
  const key = `zibana-tour-v1-${audience}`;
  useEffect(() => {
    if (autoStart && readPreference(key) !== "seen") setOpen(true);
  }, [autoStart, key]);
  const close = () => { savePreference(key, "seen"); setOpen(false); };
  const current = steps[role][step];
  return (
    <Dialog open={open} onOpenChange={(value) => { if (value) { setStep(0); setRole(audience); setOpen(true); } else close(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="button-quick-tour"><Compass className="mr-2 h-4 w-4" />Quick tour</Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw_-_2rem)] max-w-lg max-h-[85dvh] overflow-y-auto" data-testid="quick-tour">
        <DialogHeader>
          <DialogTitle>Get to know ZIBANA</DialogTitle>
          <DialogDescription>A short guide you can skip or replay from Help & launch status.</DialogDescription>
        </DialogHeader>
        <div className="flex gap-2" aria-label="Choose your guide">
          {(["rider", "driver"] as const).map(value => <Button key={value} variant={role === value ? "default" : "outline"} aria-pressed={role === value} onClick={() => { setRole(value); setStep(0); }}>{value === "rider" ? "For riders" : "For drivers"}</Button>)}
        </div>
        <div aria-live="polite" aria-atomic="true" className="space-y-4">
          <p className="text-sm text-muted-foreground">Step {step + 1} of {steps[role].length}</p>
          <h2 className="text-xl font-semibold" data-testid="tour-step-title">{current.title}</h2>
          <p className="leading-relaxed">{current.text}</p>
          <p className="rounded-lg border bg-muted p-4 text-sm leading-relaxed">{current.tip}</p>
        </div>
        <div className="flex flex-wrap justify-between gap-2 pt-2">
          <Button variant="ghost" onClick={close}>Skip tour</Button>
          <div className="flex gap-2">
            <Button variant="outline" disabled={step === 0} onClick={() => setStep(s => s - 1)}><ArrowLeft className="mr-1 h-4 w-4" />Back</Button>
            <Button onClick={() => step === steps[role].length - 1 ? close() : setStep(s => s + 1)}>{step === steps[role].length - 1 ? "Finish" : "Next"}<ArrowRight className="ml-1 h-4 w-4" /></Button>
          </div>
        </div>
        <Link href="/guide" onClick={close} className="text-sm text-primary underline underline-offset-4">Open Help & launch status</Link>
      </DialogContent>
    </Dialog>
  );
}
