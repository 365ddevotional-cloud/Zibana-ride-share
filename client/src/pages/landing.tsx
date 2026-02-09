import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Shield, Clock, MapPin, Users, CheckCircle, Navigation, Wallet, Star, Play } from "lucide-react";
import { getAppName } from "@/config/appMode";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useDiscovery } from "@/hooks/use-discovery";
import { ZibraWelcomeBubble } from "@/components/zibra-welcome-bubble";
import { ZibaSupport } from "@/components/ziba-support";

export default function LandingPage() {
  const appName = getAppName();
  const { toast } = useToast();
  const [simDialogOpen, setSimDialogOpen] = useState(false);
  const [simCode, setSimCode] = useState("");
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState("");
  const [supportOpen, setSupportOpen] = useState(false);

  const {
    showZibra,
    trackCardClick,
    trackCtaClick,
    trackSignupStart,
    trackZibraOpen,
    dismissZibra,
    getAdaptiveCta,
    getSignupUrl,
  } = useDiscovery();

  const { data: simSystemStatus } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/simulation/system-status"],
  });

  const handleSimCodeSubmit = async () => {
    if (!simCode.trim()) return;
    setSimLoading(true);
    setSimError("");
    try {
      const res = await fetch("/api/simulation/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: simCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSimError(data.message || "Invalid code");
        return;
      }
      toast({
        title: "Valid simulation code",
        description: `Role: ${data.role}, Country: ${data.countryCode}. Sign in to begin.`,
      });
      sessionStorage.setItem("ziba-sim-code", simCode.trim());
      window.location.href = `/api/login`;
    } catch {
      setSimError("Failed to validate code");
    } finally {
      setSimLoading(false);
    }
  };

  const handleGetStarted = () => {
    trackSignupStart();
    trackCtaClick();
    window.location.href = getSignupUrl();
  };

  const handleOpenZibra = () => {
    trackZibraOpen();
    dismissZibra();
    setSupportOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Logo />
          <nav className="hidden md:flex items-center gap-4">
            <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="nav-about">About</Link>
            <Link href="/how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="nav-how-it-works">How It Works</Link>
            <Link href="/safety" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="nav-safety">Safety</Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild data-testid="button-login">
              <a href="/api/login">Sign In</a>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden pt-24 pb-20 md:pt-32 md:pb-28">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
          </div>
          
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Safe and reliable rides</span>
              </div>
              
              <h1 className="mb-6 font-serif text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl">
                Your ride,
                <br />
                <span className="text-primary">your way</span>
              </h1>
              
              <p className="mx-auto mb-8 max-w-xl text-lg text-muted-foreground md:text-xl">
                {appName} connects you with trusted drivers for safe, reliable transportation. 
                Request a ride in seconds and travel with confidence.
              </p>
              
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                <Button size="lg" className="text-base" onClick={handleGetStarted} data-testid="button-get-started">
                  {getAdaptiveCta()}
                </Button>
                <Button size="lg" variant="outline" asChild className="text-base" data-testid="button-learn-more">
                  <Link href="/about">Learn More</Link>
                </Button>
              </div>
              
              <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Free to sign up</span>
                </div>
                <Link href="/safety/verified-drivers" className="flex items-center gap-2 hover:text-foreground transition-colors" data-testid="link-verified-drivers-badge">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Verified drivers</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center mb-12">
              <h2 className="font-serif text-3xl font-bold mb-4 md:text-4xl">
                Why choose {appName}?
              </h2>
              <p className="text-muted-foreground">
                Built for your safety and convenience
              </p>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Link href="/safety/verified-drivers" onClick={() => trackCardClick("verified-drivers")} data-testid="card-verified-drivers">
                <Card className="hover-elevate border-0 bg-card cursor-pointer h-full transition-all duration-300">
                  <CardContent className="pt-6">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Shield className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold">Verified Drivers</h3>
                    <p className="text-muted-foreground text-sm">
                      All drivers are vetted and approved before they can accept rides.
                    </p>
                  </CardContent>
                </Card>
              </Link>
              
              <Link href="/how-it-works#pickup" onClick={() => trackCardClick("quick-pickup")} data-testid="card-quick-pickup">
                <Card className="hover-elevate border-0 bg-card cursor-pointer h-full transition-all duration-300">
                  <CardContent className="pt-6">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Clock className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold">Quick Pickup</h3>
                    <p className="text-muted-foreground text-sm">
                      Drivers receive your request instantly and arrive within minutes.
                    </p>
                  </CardContent>
                </Card>
              </Link>
              
              <Link href="/how-it-works#booking" onClick={() => trackCardClick("easy-booking")} data-testid="card-easy-booking">
                <Card className="hover-elevate border-0 bg-card cursor-pointer h-full transition-all duration-300">
                  <CardContent className="pt-6">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <MapPin className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold">Easy Booking</h3>
                    <p className="text-muted-foreground text-sm">
                      Simply enter your pickup and destination to request a ride.
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center mb-12">
              <h2 className="font-serif text-3xl font-bold mb-4 md:text-4xl">
                Everything you need
              </h2>
              <p className="text-muted-foreground">
                A complete ride experience at your fingertips
              </p>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
              <Link href="/features/live-tracking" onClick={() => trackCardClick("live-tracking")} data-testid="card-live-tracking">
                <Card className="text-center hover-elevate cursor-pointer h-full transition-all duration-300">
                  <CardContent className="pt-6">
                    <div className="mb-4 mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <Navigation className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="mb-2 font-semibold">Live Tracking</h3>
                    <p className="text-muted-foreground text-sm">
                      Track your ride in real-time
                    </p>
                  </CardContent>
                </Card>
              </Link>
              
              <Link href="/features/payments" onClick={() => trackCardClick("flexible-payments")} data-testid="card-flexible-payments">
                <Card className="text-center hover-elevate cursor-pointer h-full transition-all duration-300">
                  <CardContent className="pt-6">
                    <div className="mb-4 mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                      <Wallet className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="mb-2 font-semibold">Flexible Payments</h3>
                    <p className="text-muted-foreground text-sm">
                      Pay using cash or wallet balance. Wallets can be funded using cards or bank transfers.
                    </p>
                  </CardContent>
                </Card>
              </Link>
              
              <Link href="/features/ratings" onClick={() => trackCardClick("rate-trip")} data-testid="card-rate-trip">
                <Card className="text-center hover-elevate cursor-pointer h-full transition-all duration-300">
                  <CardContent className="pt-6">
                    <div className="mb-4 mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                      <Star className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <h3 className="mb-2 font-semibold">Rate Your Trip</h3>
                    <p className="text-muted-foreground text-sm">
                      Help us maintain quality
                    </p>
                  </CardContent>
                </Card>
              </Link>
              
              <Link href="/safety" onClick={() => trackCardClick("safety-first")} data-testid="card-safety-first">
                <Card className="text-center hover-elevate cursor-pointer h-full transition-all duration-300">
                  <CardContent className="pt-6">
                    <div className="mb-4 mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                      <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="mb-2 font-semibold">Safety First</h3>
                    <p className="text-muted-foreground text-sm">
                      SOS and support always available
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="font-serif text-3xl font-bold mb-4 md:text-4xl">
              Ready to ride?
            </h2>
            <p className="mb-8 text-primary-foreground/80 max-w-xl mx-auto">
              Join {appName} today and experience reliable transportation at your fingertips.
            </p>
            <Button 
              size="lg" 
              variant="secondary" 
              className="text-base"
              onClick={handleGetStarted}
              data-testid="button-join-now"
            >
              {getAdaptiveCta()}
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
              <Logo size="sm" />
              <div className="flex items-center gap-4 flex-wrap justify-center">
                <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-about">About</Link>
                <Link href="/how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-how-it-works">How It Works</Link>
                <Link href="/safety" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-safety">Safety</Link>
                <Link href="/legal" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="footer-legal">Legal</Link>
              </div>
              <div className="flex items-center gap-4">
                {simSystemStatus?.enabled && (
                  <button
                    onClick={() => setSimDialogOpen(true)}
                    className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                    data-testid="button-enter-simulation"
                  >
                    Enter Simulation Code
                  </button>
                )}
                <p className="text-sm text-muted-foreground">
                  &copy; {new Date().getFullYear()} {appName}. All rights reserved.
                </p>
              </div>
            </div>
            <div className="border-t pt-4">
              <p className="text-xs text-muted-foreground text-center max-w-3xl mx-auto" data-testid="text-disclaimer">
                Fees, availability, and features may vary by city and are subject to change. Payment options may vary by location. If a driver has already started the trip or is on the way, a cancellation fee may apply. Scheduled rides allow users to request trips ahead of time, subject to driver supply and location. Organizations may book rides for members using a shared wallet, subject to account limits and availability.
              </p>
            </div>
          </div>
        </div>
      </footer>

      <ZibraWelcomeBubble
        visible={showZibra && !supportOpen}
        onOpen={handleOpenZibra}
        onDismiss={dismissZibra}
      />

      {supportOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:p-6">
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setSupportOpen(false)} />
          <div className="relative w-full max-w-md max-h-[80vh] overflow-auto rounded-lg border bg-background shadow-lg">
            <ZibaSupport onClose={() => setSupportOpen(false)} forceRole="general" />
          </div>
        </div>
      )}

      <Dialog open={simDialogOpen} onOpenChange={setSimDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Enter Simulation Code
            </DialogTitle>
            <DialogDescription>
              Enter a simulation code provided by an administrator to experience the app in simulation mode.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              placeholder="Enter 6-9 digit code"
              value={simCode}
              onChange={(e) => { setSimCode(e.target.value); setSimError(""); }}
              data-testid="input-simulation-code"
              maxLength={12}
            />
            {simError && (
              <p className="text-sm text-destructive">{simError}</p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSimDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSimCodeSubmit}
              disabled={!simCode.trim() || simLoading}
              data-testid="button-submit-simulation-code"
            >
              {simLoading ? "Validating..." : "Continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
