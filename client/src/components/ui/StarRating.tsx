import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  size?: "sm" | "md" | "lg";
  showNumber?: boolean;
  className?: string;
}

const sizeMap = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

export function StarRating({ rating, size = "sm", showNumber = true, className = "" }: StarRatingProps) {
  const rounded = Math.round(Math.min(5, Math.max(0, rating)));
  const iconSize = sizeMap[size];

  return (
    <div className={`flex items-center gap-0.5 ${className}`} data-testid="star-rating">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`${iconSize} ${
            i < rounded
              ? "fill-yellow-400 text-yellow-400"
              : "fill-none text-muted-foreground/40"
          }`}
        />
      ))}
      {showNumber && (
        <span className="ml-1 text-sm font-medium" data-testid="text-rating-value">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
