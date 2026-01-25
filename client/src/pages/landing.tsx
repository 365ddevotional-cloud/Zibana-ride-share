import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Shield, Clock, MapPin, Users, Car, CheckCircle } from "lucide-react";

export default function LandingPage() {
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
                <Car className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Ride-hailing for emerging markets</span>
              </div>
              
              <h1 className="mb-6 font-serif text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl">
                Your ride,
                <br />
                <span className="text-primary">your way</span>
              </h1>
              
              <p className="mx-auto mb-8 max-w-xl text-lg text-muted-foreground md:text-xl">
                ZIBA connects you with trusted drivers for safe, reliable transportation. 
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
                Why choose ZIBA?
              </h2>
              <p className="text-muted-foreground">
                Built for reliability and trust in emerging markets
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
                    All drivers are vetted and approved by our admin team before they can accept rides.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="hover-elevate border-0 bg-card">
                <CardContent className="pt-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">Quick Response</h3>
                  <p className="text-muted-foreground text-sm">
                    Drivers receive your request instantly and can accept within seconds.
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
                    Simply enter your pickup and dropoff locations to request a ride.
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
                For riders & drivers
              </h2>
              <p className="text-muted-foreground">
                ZIBA serves everyone in the transportation ecosystem
              </p>
            </div>
            
            <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
              <Card className="relative overflow-hidden">
                <CardContent className="pt-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold">For Riders</h3>
                  <ul className="space-y-2 text-muted-foreground text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      Request rides with just pickup and dropoff
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      Track your ride status in real-time
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      Travel with verified, trusted drivers
                    </li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card className="relative overflow-hidden">
                <CardContent className="pt-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                    <Car className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold">For Drivers</h3>
                  <ul className="space-y-2 text-muted-foreground text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      Set your availability when you're ready
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      Choose which ride requests to accept
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      Manage your profile and vehicle info
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="font-serif text-3xl font-bold mb-4 md:text-4xl">
              Ready to get started?
            </h2>
            <p className="mb-8 text-primary-foreground/80 max-w-xl mx-auto">
              Join ZIBA today and experience reliable transportation at your fingertips.
            </p>
            <Button 
              size="lg" 
              variant="secondary" 
              asChild 
              className="text-base"
              data-testid="button-join-now"
            >
              <a href="/api/login">Join Now</a>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <Logo size="sm" />
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} ZIBA. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
