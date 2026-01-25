import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { User } from "@shared/models/auth";

interface UserAvatarProps {
  user?: User | null;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function UserAvatar({ user, className, size = "md" }: UserAvatarProps) {
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-lg",
  };

  const getInitials = () => {
    if (!user) return "?";
    const first = user.firstName?.charAt(0) || "";
    const last = user.lastName?.charAt(0) || "";
    if (first || last) return (first + last).toUpperCase();
    return user.email?.charAt(0).toUpperCase() || "?";
  };

  return (
    <Avatar className={cn(sizeClasses[size], className)} data-testid="user-avatar">
      <AvatarImage 
        src={user?.profileImageUrl || undefined} 
        alt={user?.firstName || "User"} 
      />
      <AvatarFallback className="bg-primary/10 text-primary font-medium">
        {getInitials()}
      </AvatarFallback>
    </Avatar>
  );
}
