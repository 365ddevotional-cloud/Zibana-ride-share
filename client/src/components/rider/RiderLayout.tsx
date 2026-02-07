import { Link, useLocation } from "wouter";
import { Home, Clock, Wallet, BookOpen, Mail, User, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";

interface RiderLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: "/rider/home", label: "Home", icon: Home },
  { path: "/rider/trips", label: "Trips", icon: Clock },
  { path: "/rider/wallet", label: "Wallet", icon: Wallet },
  { path: "/rider/inbox", label: "Inbox", icon: Mail },
  { path: "/rider/profile", label: "Profile", icon: User },
];

export function RiderLayout({ children }: RiderLayoutProps) {
  const [location] = useLocation();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/rider/inbox/unread-count"],
    refetchInterval: 30000,
  });
  const unreadCount = unreadData?.count ?? 0;

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <Link href="/rider/home">
            <div className="flex items-center gap-1.5 cursor-pointer" data-testid="logo-ziba">
              <span className="text-xl font-bold tracking-tight">ZIBA</span>
              <span className="text-xs font-medium opacity-80">Rider</span>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-primary-foreground hover:bg-primary-foreground/10"
              data-testid="button-theme-toggle"
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
              (item.path === "/rider/home" && location === "/rider") ||
              (item.path === "/rider/inbox" && location.startsWith("/rider/inbox"));
            const Icon = item.icon;
            const showBadge = item.label === "Inbox" && unreadCount > 0;
            
            return (
              <Link key={item.path} href={item.path}>
                <button
                  className={cn(
                    "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[64px] relative",
                    isActive 
                      ? "text-primary" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <div className="relative">
                    <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
                    {showBadge && (
                      <span
                        className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1"
                        data-testid="badge-inbox-unread"
                      >
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </div>
                  <span className={cn(
                    "text-xs",
                    isActive && "font-medium"
                  )}>
                    {item.label}
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
