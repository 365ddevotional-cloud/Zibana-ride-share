import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link } from "wouter";
import { Wallet, Banknote, CreditCard, Shield, Receipt, RefreshCw } from "lucide-react";
import { getAppName } from "@/config/appMode";

export default function FeaturePaymentsPage() {
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
              <Wallet className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Pay your way</span>
            </div>
            <h1 className="font-serif text-4xl font-bold tracking-tight mb-4 md:text-5xl" data-testid="text-payments-heading">
              Flexible Payments
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {appName} supports multiple payment methods so you can pay however works best for you.
              Cash, wallet, or card - the choice is yours.
            </p>
          </div>
        </section>

        <section className="container mx-auto px-4 mb-16">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            <Card data-testid="card-cash">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                  <Banknote className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Cash Payment</h3>
                <p className="text-muted-foreground text-sm">
                  Pay your driver in cash at the end of each ride. Simple and straightforward.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-wallet">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Digital Wallet</h3>
                <p className="text-muted-foreground text-sm">
                  Fund your {appName} wallet and pay for rides instantly. No cash needed at the point of pickup.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-card-payments">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <CreditCard className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Card & Bank Transfer</h3>
                <p className="text-muted-foreground text-sm">
                  Fund your wallet via card or bank transfer. Multiple funding channels are available depending on your location.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-upfront">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Receipt className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Upfront Pricing</h3>
                <p className="text-muted-foreground text-sm">
                  See the fare before you confirm. Know exactly what you'll pay with no surprises.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-secure">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                  <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Secure Transactions</h3>
                <p className="text-muted-foreground text-sm">
                  All digital payments are processed through secure, encrypted channels to protect your financial information.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-history">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <RefreshCw className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Transaction History</h3>
                <p className="text-muted-foreground text-sm">
                  View your complete payment history, including ride fares, wallet top-ups, and receipts.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="py-16 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="font-serif text-3xl font-bold mb-4">Pay the way you prefer</h2>
            <p className="mb-8 text-primary-foreground/80 max-w-xl mx-auto">
              Sign up and choose the payment method that suits you best.
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