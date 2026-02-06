import { Link, useLocation } from "wouter";
import { Home, Clock, Wallet, User, HelpCircle, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface RiderLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: "/rider/home", label: "Home", icon: Home },
  { path: "/rider/trips", label: "Trips", icon: Clock },
  { path: "/rider/wallet", label: "Wallet", icon: Wallet },
  { path: "/rider/help", label: "Help", icon: BookOpen },
  { path: "/rider/profile", label: "Profile", icon: User },
];

export function RiderLayout({ children }: RiderLayoutProps) {
  const [location] = useLocation();

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
              (item.path === "/rider/home" && location === "/rider");
            const Icon = item.icon;
            
            return (
              <Link key={item.path} href={item.path}>
                <button
                  className={cn(
                    "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[64px]",
                    isActive 
                      ? "text-primary" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
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
