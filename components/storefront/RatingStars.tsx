import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function RatingStars({
  rating,
  count,
  size = "sm",
}: {
  rating: number;
  count?: number;
  size?: "sm" | "md";
}) {
  const full = Math.round(rating);
  const iconClass = size === "md" ? "h-5 w-5" : "h-4 w-4";

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            iconClass,
            i < full ? "fill-amber-400 text-amber-400" : "text-border",
          )}
        />
      ))}
      {count != null && (
        <span className="ml-1 text-xs text-text-secondary">({count})</span>
      )}
    </div>
  );
}
