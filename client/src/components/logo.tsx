import { Car } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
  linkToHome?: boolean;
}

export function Logo({ className, showText = true, size = "md", linkToHome = true }: LogoProps) {
  const [, navigate] = useLocation();
  
  const sizeClasses = {
    sm: { icon: "h-5 w-5", text: "text-lg" },
    md: { icon: "h-7 w-7", text: "text-2xl" },
    lg: { icon: "h-10 w-10", text: "text-4xl" },
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate("/");
  };

  const logoContent = (
    <div className={cn("flex items-center gap-2 pointer-events-auto", className)} data-testid="logo">
      <div className="relative flex items-center justify-center rounded-lg bg-primary p-1.5">
        <Car className={cn("text-primary-foreground", sizeClasses[size].icon)} />
      </div>
      {showText && (
        <span className={cn("font-bold tracking-tight", sizeClasses[size].text)}>
          ZIBA
        </span>
      )}
    </div>
  );

  if (linkToHome) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="cursor-pointer pointer-events-auto relative z-10 hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
        data-testid="logo-link"
        aria-label="Go to home page"
      >
        {logoContent}
      </button>
    );
  }

  return logoContent;
}
