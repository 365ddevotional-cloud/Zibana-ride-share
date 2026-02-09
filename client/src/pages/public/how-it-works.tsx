import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link } from "wouter";
import { MapPin, Search, Car, CheckCircle, Clock, CreditCard } from "lucide-react";
import { getAppName } from "@/config/appMode";

export default function HowItWorksPage() {
  const appName = getAppName();

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Logo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild data-testid="button-login">
              <a href="/api/login">Sign In</a>
            </Button>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-20">
        <section className="container mx-auto px-4 mb-16">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="font-serif text-4xl font-bold tracking-tight mb-4 md:text-5xl" data-testid="text-how-heading">
              How {appName} Works
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Getting a ride with {appName} is simple, safe, and fast. Here's how it works from start to finish.
            </p>
          </div>
        </section>

        <section id="booking" className="container mx-auto px-4 mb-16">
          <h2 className="font-serif text-2xl font-bold mb-8 text-center md:text-3xl">Booking a Ride</h2>
          <div className="grid gap-8 md:grid-cols-3 max-w-4xl mx-auto">
            <Card data-testid="card-step-1">
              <CardContent className="pt-6 text-center">
                <div className="mb-4 mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-xl font-bold text-primary">1</span>
                </div>
                <div className="mb-3 mx-auto flex h-12 w-12 items-center justify-center">
                  <MapPin className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mb-2 font-semibold text-lg">Set Your Destination</h3>
                <p className="text-muted-foreground text-sm">
                  Open the app and enter where you want to go. Your pickup location is detected automatically.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-step-2">
              <CardContent className="pt-6 text-center">
                <div className="mb-4 mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-xl font-bold text-primary">2</span>
                </div>
                <div className="mb-3 mx-auto flex h-12 w-12 items-center justify-center">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mb-2 font-semibold text-lg">Confirm and Request</h3>
                <p className="text-muted-foreground text-sm">
                  Review the fare estimate, choose your payment method, and request your ride with one tap.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-step-3">
              <CardContent className="pt-6 text-center">
                <div className="mb-4 mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-xl font-bold text-primary">3</span>
                </div>
                <div className="mb-3 mx-auto flex h-12 w-12 items-center justify-center">
                  <Car className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mb-2 font-semibold text-lg">Ride and Arrive</h3>
                <p className="text-muted-foreground text-sm">
                  A verified driver will pick you up. Track your ride in real-time and arrive at your destination safely.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="pickup" className="container mx-auto px-4 mb-16 bg-muted/30 py-16 -mx-4 px-8 rounded-lg">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-serif text-2xl font-bold mb-8 text-center md:text-3xl">Quick Pickup</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1">Instant Matching</h4>
                  <p className="text-sm text-muted-foreground">Our system finds the nearest available driver the moment you request a ride.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1">Real-Time ETA</h4>
                  <p className="text-sm text-muted-foreground">See exactly when your driver will arrive with live tracking updates.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1">Smart Location</h4>
                  <p className="text-sm text-muted-foreground">Your pickup location is detected automatically for a faster request process.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CreditCard className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1">Upfront Pricing</h4>
                  <p className="text-sm text-muted-foreground">Know the fare before you confirm. No hidden charges or surprises.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="font-serif text-3xl font-bold mb-4">Ready to try it?</h2>
            <p className="mb-8 text-primary-foreground/80 max-w-xl mx-auto">
              Sign up in seconds and request your first ride.
            </p>
            <Button size="lg" variant="secondary" asChild className="text-base" data-testid="button-get-started">
              <a href="/api/login">Get Started</a>
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