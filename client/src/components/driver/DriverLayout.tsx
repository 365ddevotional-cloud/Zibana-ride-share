import { Link, useLocation } from "wouter";
import { Home, Car, TrendingUp, Wallet, HelpCircle, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";

interface DriverLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: "/driver/dashboard", label: "Home", icon: Home },
  { path: "/driver/trips", label: "Trips", icon: Car },
  { path: "/driver/earnings", label: "Earnings", icon: TrendingUp },
  { path: "/driver/wallet", label: "Wallet", icon: Wallet },
  { path: "/driver/help", label: "Help", icon: HelpCircle },
];

export function DriverLayout({ children }: DriverLayoutProps) {
  const [location] = useLocation();
  const { setTheme, resolvedTheme } = useTheme();
  const { t } = useTranslation();

  const navLabels: Record<string, string> = {
    "Home": t("nav.home"),
    "Trips": t("driver.trips"),
    "Earnings": t("driver.earnings"),
    "Wallet": t("driver.wallet"),
    "Help": t("driver.help"),
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-emerald-600 text-white px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <Link href="/driver/dashboard">
            <div className="flex items-center gap-1.5 cursor-pointer" data-testid="logo-zibana-driver">
              <span className="text-xl font-bold tracking-tight">{t("driver.appName")}</span>
              <span className="text-xs font-medium opacity-80">{t("driver.appRole")}</span>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-white"
              data-testid="button-driver-theme-toggle"
            >
              {resolvedTheme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-lg mx-auto">
          {children}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t z-50">
        <div className="max-w-lg mx-auto flex items-center justify-around py-2">
          {navItems.map((item) => {
            const isActive = location === item.path || 
              (item.path === "/driver/dashboard" && location === "/driver");
            const Icon = item.icon;
            
            return (
              <Link key={item.path} href={item.path}>
                <button
                  className={cn(
                    "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[64px]",
                    isActive 
                      ? "text-emerald-600" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  data-testid={`nav-driver-${item.label.toLowerCase()}`}
                >
                  <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
                  <span className={cn(
                    "text-xs",
                    isActive && "font-medium"
                  )}>
                    {navLabels[item.label] || item.label}
                  </span>
                </button>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
