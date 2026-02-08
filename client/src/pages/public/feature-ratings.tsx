import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link } from "wouter";
import { Star, MessageSquare, TrendingUp, Shield, ThumbsUp, Users } from "lucide-react";
import { getAppName } from "@/config/appMode";

export default function FeatureRatingsPage() {
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
              <Star className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Your voice matters</span>
            </div>
            <h1 className="font-serif text-4xl font-bold tracking-tight mb-4 md:text-5xl" data-testid="text-ratings-heading">
              Rate Your Trip
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Your feedback helps us maintain high service quality. Rate drivers after each trip
              and help the {appName} community thrive.
            </p>
          </div>
        </section>

        <section className="container mx-auto px-4 mb-16">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            <Card data-testid="card-star-rating">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Star className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Star Ratings</h3>
                <p className="text-muted-foreground text-sm">
                  Rate your driver from 1 to 5 stars after each trip. Quick, simple, and meaningful.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-feedback">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <MessageSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Detailed Feedback</h3>
                <p className="text-muted-foreground text-sm">
                  Add comments or specific feedback tags to help drivers understand what they did well or can improve.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-mutual">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                  <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Mutual Ratings</h3>
                <p className="text-muted-foreground text-sm">
                  Both riders and drivers rate each other, creating a community of mutual respect and accountability.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-quality">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Quality Standards</h3>
                <p className="text-muted-foreground text-sm">
                  Ratings help maintain service quality. Drivers with consistently high ratings are recognized.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-safety-reporting">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                  <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Safety Reports</h3>
                <p className="text-muted-foreground text-sm">
                  Beyond ratings, report any safety concerns directly. Our team reviews every report seriously.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-appreciation">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <ThumbsUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Show Appreciation</h3>
                <p className="text-muted-foreground text-sm">
                  Had a great ride? A 5-star rating and kind words go a long way in recognizing excellent service.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="py-16 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="font-serif text-3xl font-bold mb-4">Help build a better ride community</h2>
            <p className="mb-8 text-primary-foreground/80 max-w-xl mx-auto">
              Your ratings and feedback directly shape the {appName} experience for everyone.
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