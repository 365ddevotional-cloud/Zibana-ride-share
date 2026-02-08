import { Car, CarFront, Sparkles, PawPrint, ShieldCheck, Crown, User } from "lucide-react";
import type { RideClassId, RideClassDefinition } from "@shared/ride-classes";

interface RideClassIconProps {
  rideClass: RideClassId | string;
  size?: "sm" | "md" | "lg";
  showBg?: boolean;
  color?: string;
  bgLight?: string;
  bgDark?: string;
  className?: string;
}

const SIZE_MAP = {
  sm: { container: "h-8 w-8", primary: "h-4 w-4", secondary: "h-2.5 w-2.5" },
  md: { container: "h-10 w-10", primary: "h-5 w-5", secondary: "h-3 w-3" },
  lg: { container: "h-12 w-12", primary: "h-6 w-6", secondary: "h-3.5 w-3.5" },
};

export function RideClassIcon({
  rideClass,
  size = "md",
  showBg = true,
  color,
  bgLight,
  className = "",
}: RideClassIconProps) {
  const s = SIZE_MAP[size];
  const iconColor = color || getDefaultColor(rideClass);

  const iconContent = renderIcon(rideClass, s, iconColor);

  if (!showBg) {
    return <span className={`inline-flex items-center justify-center ${className}`}>{iconContent}</span>;
  }

  const bg = bgLight || getDefaultBg(rideClass);

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full shrink-0 ${s.container} ${className}`}
      style={{ backgroundColor: bg }}
    >
      {iconContent}
    </span>
  );
}

function renderIcon(
  rideClass: string,
  s: { primary: string; secondary: string },
  color: string,
) {
  const style = { color };

  switch (rideClass) {
    case "go":
      return <Car className={s.primary} style={style} />;

    case "plus":
      return <CarFront className={s.primary} style={style} />;

    case "comfort":
      return (
        <span className="relative inline-flex items-center justify-center">
          <Car className={s.primary} style={style} />
          <Sparkles
            className={`${s.secondary} absolute -top-0.5 -right-1`}
            style={{ color, opacity: 0.85 }}
          />
        </span>
      );

    case "pet_ride":
      return (
        <span className="relative inline-flex items-center justify-center">
          <Car className={s.primary} style={style} />
          <PawPrint
            className={`${s.secondary} absolute -top-0.5 -right-1`}
            style={{ color, opacity: 0.85 }}
          />
        </span>
      );

    case "safe_teen":
      return (
        <span className="relative inline-flex items-center justify-center">
          <ShieldCheck className={s.primary} style={style} />
          <User
            className={`${s.secondary} absolute -bottom-0.5 -right-1`}
            style={{ color, opacity: 0.85 }}
          />
        </span>
      );

    case "elite":
      return (
        <span className="relative inline-flex items-center justify-center">
          <Car className={s.primary} style={style} />
          <Crown
            className={`${s.secondary} absolute -top-1 -right-1`}
            style={{ color, opacity: 0.85 }}
          />
        </span>
      );

    default:
      return <Car className={s.primary} style={style} />;
  }
}

function getDefaultColor(rideClass: string): string {
  const map: Record<string, string> = {
    go: "#7c3aed",
    plus: "#4338ca",
    comfort: "#0d9488",
    pet_ride: "#ea580c",
    safe_teen: "#16a34a",
    elite: "#b45309",
  };
  return map[rideClass] || "#7c3aed";
}

function getDefaultBg(rideClass: string): string {
  const map: Record<string, string> = {
    go: "rgba(124, 58, 237, 0.10)",
    plus: "rgba(67, 56, 202, 0.10)",
    comfort: "rgba(13, 148, 136, 0.10)",
    pet_ride: "rgba(234, 88, 12, 0.10)",
    safe_teen: "rgba(22, 163, 74, 0.10)",
    elite: "rgba(180, 83, 9, 0.10)",
  };
  return map[rideClass] || "rgba(124, 58, 237, 0.10)";
}

export function getRideClassLabel(rideClass: string): string {
  const map: Record<string, string> = {
    go: "ZIBA Go",
    plus: "ZIBA Plus",
    comfort: "ZIBA Comfort",
    pet_ride: "ZIBA PetRide",
    safe_teen: "ZIBA SafeTeen",
    elite: "ZIBA Elite",
  };
  return map[rideClass] || "ZIBA Go";
}
