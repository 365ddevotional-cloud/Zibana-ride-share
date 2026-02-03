import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Shield, Clock, MapPin, Users, CheckCircle, Navigation, Wallet, Star } from "lucide-react";
import { getAppName } from "@/lib/app-mode";

export default function LandingPage() {
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
                <Button size="lg" asChild className="text-base" data-testid="button-get-started">
                  <a href="/api/login">Get Started</a>
                </Button>
                <Button size="lg" variant="outline" className="text-base" data-testid="button-learn-more">
                  <a href="#features">Learn More</a>
                </Button>
              </div>
              
              <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Free to sign up</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Verified drivers</span>
                </div>
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
              <Card className="hover-elevate border-0 bg-card">
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
              
              <Card className="hover-elevate border-0 bg-card">
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
              
              <Card className="hover-elevate border-0 bg-card">
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
              <Card className="text-center">
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
              
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="mb-4 mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                    <Wallet className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="mb-2 font-semibold">Easy Payments</h3>
                  <p className="text-muted-foreground text-sm">
                    Pay securely with your wallet
                  </p>
                </CardContent>
              </Card>
              
              <Card className="text-center">
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
              
              <Card className="text-center">
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
              asChild 
              className="text-base"
              data-testid="button-join-now"
            >
              <a href="/api/login">Get Started</a>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <Logo size="sm" />
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} {appName}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
