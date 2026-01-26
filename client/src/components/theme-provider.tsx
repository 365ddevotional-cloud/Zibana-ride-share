import { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  isLoading: boolean;
};

const initialState: ThemeProviderState = {
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => null,
  isLoading: true,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    return getSystemTheme();
  }
  return theme;
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "ziba-ui-theme",
  ...props
}: ThemeProviderProps) {
  const queryClient = useQueryClient();
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  );
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() => resolveTheme(theme));

  const { data: serverTheme, isLoading } = useQuery<{ themePreference: Theme }>({
    queryKey: ["/api/user/theme-preference"],
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const mutation = useMutation({
    mutationFn: async (newTheme: Theme) => {
      const response = await apiRequest("POST", "/api/user/theme-preference", { themePreference: newTheme });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/theme-preference"] });
    },
  });

  useEffect(() => {
    if (serverTheme?.themePreference && serverTheme.themePreference !== theme) {
      setThemeState(serverTheme.themePreference);
      localStorage.setItem(storageKey, serverTheme.themePreference);
    }
  }, [serverTheme, storageKey]);

  useEffect(() => {
    const root = window.document.documentElement;
    const resolved = resolveTheme(theme);
    
    // Add transitioning class for smooth theme change
    root.classList.add("transitioning");
    root.classList.remove("light", "dark");
    root.classList.add(resolved);
    setResolvedTheme(resolved);
    
    // Remove transitioning class after animation completes
    const timeout = setTimeout(() => {
      root.classList.remove("transitioning");
    }, 300);
    
    return () => clearTimeout(timeout);
  }, [theme]);

  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const root = window.document.documentElement;
      const resolved = getSystemTheme();
      root.classList.remove("light", "dark");
      root.classList.add(resolved);
      setResolvedTheme(resolved);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    localStorage.setItem(storageKey, newTheme);
    setThemeState(newTheme);
    mutation.mutate(newTheme);
  };

  const value = {
    theme,
    resolvedTheme,
    setTheme,
    isLoading,
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
