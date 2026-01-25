import { Car } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
  linkToHome?: boolean;
}

export function Logo({ className, showText = true, size = "md", linkToHome = true }: LogoProps) {
  const sizeClasses = {
    sm: { icon: "h-5 w-5", text: "text-lg" },
    md: { icon: "h-7 w-7", text: "text-2xl" },
    lg: { icon: "h-10 w-10", text: "text-4xl" },
  };

  const logoContent = (
    <div className={cn("flex items-center gap-2", className)} data-testid="logo">
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
      <Link href="/" className="cursor-pointer" data-testid="logo-link">
        {logoContent}
      </Link>
    );
  }

  return logoContent;
}
