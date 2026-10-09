import { createContext, useContext, useEffect, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";

import { isThemePreference, readTheme, savePreference, type ThemePreference as Theme } from "@/lib/preferences";

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
  storageKey = "zibana-ui-theme",
  ...props
}: ThemeProviderProps) {
  const queryClient = useQueryClient();
  const [theme, setThemeState] = useState<Theme>(
    () => readTheme(storageKey, defaultTheme)
  );
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() => resolveTheme(theme));

  const locallyChosenFor = useRef(new Set<string>());
  const { data: user } = useQuery<{ id: string } | null>({
    queryKey: ["/api/auth/user"], queryFn: getQueryFn({ on401: "returnNull" }), retry: false,
  });
  const { data: serverTheme, isLoading } = useQuery<{ themePreference: Theme }>({
    queryKey: ["/api/user/theme-preference", user?.id],
    queryFn: async () => (await apiRequest("GET", "/api/user/theme-preference")).json(),
    enabled: !!user,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const mutation = useMutation({
    scope: { id: "theme-preference" },
    mutationFn: async (newTheme: Theme) => {
      const response = await apiRequest("POST", "/api/user/theme-preference", { themePreference: newTheme });
      return response.json();
    },
    // A failed sync must not discard the locally saved preference.
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/theme-preference"] });
    },
  });

  useEffect(() => {
    if (user && !locallyChosenFor.current.has(user.id) && isThemePreference(serverTheme?.themePreference)) {
      setThemeState(serverTheme.themePreference);
      savePreference(storageKey, serverTheme.themePreference);
    }
  }, [serverTheme, storageKey, user?.id]);

  useEffect(() => {
    const root = window.document.documentElement;
    const resolved = resolveTheme(theme);
    
    // Add transitioning class for smooth theme change
    root.classList.add("transitioning");
    root.classList.remove("light", "dark");
    root.classList.add(resolved);
    root.style.colorScheme = resolved;
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
      root.style.colorScheme = resolved;
      setResolvedTheme(resolved);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    if (!isThemePreference(newTheme)) return;
    savePreference(storageKey, newTheme);
    setThemeState(newTheme);
    if (user) {
      locallyChosenFor.current.add(user.id);
      mutation.mutate(newTheme);
    }
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
