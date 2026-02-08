import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link } from "wouter";
import { UserCheck, FileCheck, Car, BadgeCheck, Shield, ClipboardCheck } from "lucide-react";
import { getAppName } from "@/config/appMode";

export default function VerifiedDriversPage() {
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
              <UserCheck className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Trusted drivers only</span>
            </div>
            <h1 className="font-serif text-4xl font-bold tracking-tight mb-4 md:text-5xl" data-testid="text-verified-heading">
              Verified Drivers
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Every driver on {appName} is thoroughly vetted before they can accept rides.
              Your safety starts before you even request a trip.
            </p>
          </div>
        </section>

        <section className="container mx-auto px-4 mb-16">
          <h2 className="font-serif text-2xl font-bold mb-8 text-center md:text-3xl">Our Verification Process</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            <Card data-testid="card-identity">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <UserCheck className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Identity Verification</h3>
                <p className="text-muted-foreground text-sm">
                  Drivers submit government-issued ID and undergo identity checks to confirm who they are.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-license">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <FileCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">License Validation</h3>
                <p className="text-muted-foreground text-sm">
                  Valid driver's licenses are verified to ensure every driver is legally authorized to operate.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-vehicle">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                  <Car className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Vehicle Inspection</h3>
                <p className="text-muted-foreground text-sm">
                  Vehicles must meet safety and condition standards before a driver can start accepting rides.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-background">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <ClipboardCheck className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Background Screening</h3>
                <p className="text-muted-foreground text-sm">
                  Applicants are screened against available records as part of the approval process.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-training">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <BadgeCheck className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Safety Training</h3>
                <p className="text-muted-foreground text-sm">
                  Drivers complete safety training modules covering rider safety, incident protocols, and best practices.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-ongoing">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                  <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Ongoing Monitoring</h3>
                <p className="text-muted-foreground text-sm">
                  Driver performance, ratings, and behavior are continuously monitored to maintain quality standards.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="py-16 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="font-serif text-3xl font-bold mb-4">Ride with verified drivers</h2>
            <p className="mb-8 text-primary-foreground/80 max-w-xl mx-auto">
              Every {appName} driver has been approved and verified. Your safety is our priority.
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
            <Link href="/safety" className="text-sm text-muted-foreground hover:underline" data-testid="link-safety">Safety</Link>
            <Link href="/about" className="text-sm text-muted-foreground hover:underline" data-testid="link-about">About</Link>
            <Link href="/legal" className="text-sm text-muted-foreground hover:underline" data-testid="link-legal">Legal</Link>
          </div>
          <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} {appName}</p>
        </div>
      </footer>
    </div>
  );
}