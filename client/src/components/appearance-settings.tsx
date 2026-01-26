import { Sun, Moon, Monitor, Check } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ThemeOption = {
  value: "light" | "dark" | "system";
  label: string;
  description: string;
  icon: typeof Sun;
};

const themeOptions: ThemeOption[] = [
  {
    value: "light",
    label: "Light",
    description: "Soft neutral colors for daytime use",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Eye-safe dark mode for night driving",
    icon: Moon,
  },
  {
    value: "system",
    label: "System (Auto)",
    description: "Automatically follows your device settings",
    icon: Monitor,
  },
];

export function AppearanceSettings() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          Choose how the app looks. Dark mode is recommended for night driving to reduce eye strain.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {themeOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = theme === option.value;
            
            return (
              <button
                key={option.value}
                onClick={() => setTheme(option.value)}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-lg border transition-all duration-200",
                  "hover-elevate",
                  isSelected
                    ? "border-primary bg-accent"
                    : "border-border bg-card"
                )}
                data-testid={`theme-select-${option.value}`}
              >
                <div className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium">{option.label}</div>
                  <div className="text-sm text-muted-foreground">{option.description}</div>
                </div>
                {isSelected && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </button>
            );
          })}
        </div>
        
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            Currently using: <span className="font-medium text-foreground capitalize">{resolvedTheme}</span> theme
            {theme === "system" && " (following your device)"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
