import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link } from "wouter";
import { Navigation, MapPin, Share2, Bell, Eye, Clock } from "lucide-react";
import { getAppName } from "@/config/appMode";

export default function FeatureLiveTrackingPage() {
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
              <Navigation className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Know where you are, always</span>
            </div>
            <h1 className="font-serif text-4xl font-bold tracking-tight mb-4 md:text-5xl" data-testid="text-tracking-heading">
              Live Tracking
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Follow every moment of your ride in real-time. From the moment your driver accepts
              to the second you arrive, you're always in the loop.
            </p>
          </div>
        </section>

        <section className="container mx-auto px-4 mb-16">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            <Card data-testid="card-realtime-map">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <MapPin className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Real-Time Map</h3>
                <p className="text-muted-foreground text-sm">
                  Watch your driver approach on a live map. See their exact location and estimated time of arrival.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-trip-sharing">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                  <Share2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Trip Sharing</h3>
                <p className="text-muted-foreground text-sm">
                  Share your ride progress with friends or family. They can follow along in real-time without the app.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-arrival-alerts">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Bell className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Arrival Alerts</h3>
                <p className="text-muted-foreground text-sm">
                  Get notified when your driver is nearby, so you're ready to go when they arrive.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-route-visibility">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Eye className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Route Visibility</h3>
                <p className="text-muted-foreground text-sm">
                  See the planned route your driver is taking and know if there are any unexpected detours.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-eta-updates">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Live ETA Updates</h3>
                <p className="text-muted-foreground text-sm">
                  Arrival time updates as conditions change, so you always know exactly when to expect your ride.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-trip-history">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Navigation className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Trip History</h3>
                <p className="text-muted-foreground text-sm">
                  Review past trips with route details, fare breakdown, and driver information anytime.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="py-16 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="font-serif text-3xl font-bold mb-4">Track every ride</h2>
            <p className="mb-8 text-primary-foreground/80 max-w-xl mx-auto">
              Sign up and experience real-time tracking on your very first ride.
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
            <Link href="/safety" className="text-sm text-muted-foreground hover:underline" data-testid="link-safety">Safety</Link>
            <Link href="/legal" className="text-sm text-muted-foreground hover:underline" data-testid="link-legal">Legal</Link>
          </div>
          <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} {appName}</p>
        </div>
      </footer>
    </div>
  );
}