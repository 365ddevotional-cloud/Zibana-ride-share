import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link } from "wouter";
import { Users, Globe, Heart, Shield, Target, Zap } from "lucide-react";
import { getAppName } from "@/config/appMode";

export default function AboutPage() {
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
            <h1 className="font-serif text-4xl font-bold tracking-tight mb-4 md:text-5xl" data-testid="text-about-heading">
              About {appName}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="text-about-description">
              {appName} is a ride-hailing platform built for emerging markets, connecting riders with
              trusted drivers for safe and reliable transportation.
            </p>
          </div>
        </section>

        <section className="container mx-auto px-4 mb-16">
          <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
            <Card data-testid="card-mission">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Our Mission</h3>
                <p className="text-muted-foreground text-sm">
                  To provide accessible, affordable, and safe mobility solutions that enhance daily
                  life and foster economic opportunities in emerging markets.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-vision">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Globe className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Our Vision</h3>
                <p className="text-muted-foreground text-sm">
                  To become a leading mobility platform across multiple emerging economies, known for
                  reliability, safety, and positive socio-economic impact.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-values">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Heart className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Our Values</h3>
                <p className="text-muted-foreground text-sm">
                  We believe in transparency, community empowerment, and building technology that
                  works for everyone, regardless of location or income.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="container mx-auto px-4 mb-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="font-serif text-2xl font-bold mb-6 text-center md:text-3xl">What makes {appName} different</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-start gap-3 p-4">
                <Shield className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1">Safety First</h4>
                  <p className="text-sm text-muted-foreground">Every driver is verified. Every ride is tracked. SOS support is always available.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4">
                <Users className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1">Community Focused</h4>
                  <p className="text-sm text-muted-foreground">We create jobs and opportunities for drivers while providing riders with affordable transportation.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4">
                <Globe className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1">Built for Local Markets</h4>
                  <p className="text-sm text-muted-foreground">Our platform adapts to local currencies, payment methods, and regulations in each market we serve.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4">
                <Zap className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-semibold mb-1">Modern Technology</h4>
                  <p className="text-sm text-muted-foreground">Real-time tracking, digital wallets, and intelligent matching ensure a smooth ride experience.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="font-serif text-3xl font-bold mb-4">Ready to experience {appName}?</h2>
            <p className="mb-8 text-primary-foreground/80 max-w-xl mx-auto">
              Join thousands of riders and drivers who trust {appName} for safe, reliable transportation.
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
            <Link href="/how-it-works" className="text-sm text-muted-foreground hover:underline" data-testid="link-how-it-works">How It Works</Link>
            <Link href="/safety" className="text-sm text-muted-foreground hover:underline" data-testid="link-safety">Safety</Link>
            <Link href="/legal" className="text-sm text-muted-foreground hover:underline" data-testid="link-legal">Legal</Link>
          </div>
          <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} {appName}</p>
        </div>
      </footer>
    </div>
  );
}