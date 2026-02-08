import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link } from "wouter";
import { Shield, Phone, MapPin, UserCheck, AlertTriangle, Eye, Lock, BadgeCheck } from "lucide-react";
import { getAppName } from "@/config/appMode";

export default function SafetyPage() {
  const appName = getAppName();

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Logo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild data-testid="button-login">
              <a href="/api/login?role=rider">Sign In</a>
            </Button>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-20">
        <section className="container mx-auto px-4 mb-16">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Your safety matters most</span>
            </div>
            <h1 className="font-serif text-4xl font-bold tracking-tight mb-4 md:text-5xl" data-testid="text-safety-heading">
              Safety at {appName}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Every ride on {appName} is designed with your safety in mind. From verified drivers to in-app
              safety tools, we've built multiple layers of protection into every trip.
            </p>
          </div>
        </section>

        <section className="container mx-auto px-4 mb-16">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            <Link href="/safety/verified-drivers">
              <Card className="hover-elevate cursor-pointer h-full" data-testid="card-verified-drivers">
                <CardContent className="pt-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <UserCheck className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">Verified Drivers</h3>
                  <p className="text-muted-foreground text-sm">
                    Every driver goes through identity verification and background screening before joining {appName}.
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Card data-testid="card-sos">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                  <Phone className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">SOS Emergency Button</h3>
                <p className="text-muted-foreground text-sm">
                  Tap the SOS button during any ride to alert our safety team and your emergency contacts immediately.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-trip-tracking">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <MapPin className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Real-Time Trip Tracking</h3>
                <p className="text-muted-foreground text-sm">
                  Every ride is GPS-tracked in real-time. Share your trip status with trusted contacts for added peace of mind.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-incident-reporting">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Incident Reporting</h3>
                <p className="text-muted-foreground text-sm">
                  Report any safety concern through the app. Our support team reviews every report and takes action.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-ride-monitoring">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                  <Eye className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Ride Monitoring</h3>
                <p className="text-muted-foreground text-sm">
                  Our systems monitor rides for unusual route deviations or unexpected stops to keep you safe.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-data-privacy">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Lock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Data Privacy</h3>
                <p className="text-muted-foreground text-sm">
                  Your personal information is encrypted and never shared with third parties without your consent.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="container mx-auto px-4 mb-16">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-serif text-2xl font-bold mb-6 text-center md:text-3xl">Safety Tips for Riders</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                <BadgeCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">Verify your driver's name, photo, and vehicle details before getting in.</p>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                <BadgeCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">Share your trip with a trusted contact so someone always knows where you are.</p>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                <BadgeCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">Sit in the back seat for your own comfort and safety.</p>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30">
                <BadgeCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">Use the in-app SOS button if you ever feel uncomfortable during a ride.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="font-serif text-3xl font-bold mb-4">Ride with confidence</h2>
            <p className="mb-8 text-primary-foreground/80 max-w-xl mx-auto">
              {appName} is committed to keeping you safe on every ride.
            </p>
            <Button size="lg" variant="secondary" asChild className="text-base" data-testid="button-get-started">
              <a href="/api/login?role=rider">Get Started</a>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t py-6">
        <div className="container mx-auto px-4 flex flex-col items-center justify-between gap-4 md:flex-row">
          <Logo size="sm" />
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <Link href="/welcome" className="text-sm text-muted-foreground hover:underline" data-testid="link-home">Home</Link>
            <Link href="/about" className="text-sm text-muted-foreground hover:underline" data-testid="link-about">About</Link>
            <Link href="/how-it-works" className="text-sm text-muted-foreground hover:underline" data-testid="link-how-it-works">How It Works</Link>
            <Link href="/legal" className="text-sm text-muted-foreground hover:underline" data-testid="link-legal">Legal</Link>
          </div>
          <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} {appName}</p>
        </div>
      </footer>
    </div>
  );
}