import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import type { User } from "@shared/models/auth";

async function fetchUser(): Promise<User | null> {
  const response = await fetch("/api/auth/user", {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// Get landing page based on current app context
function getLogoutRedirect(): string {
  const path = window.location.pathname;
  if (path.startsWith("/driver")) return "/driver";
  if (path.startsWith("/admin")) return "/admin";
  return "/";
}

async function logout(): Promise<void> {
  sessionStorage.clear();
  const redirectPath = getLogoutRedirect();
  window.location.href = `/api/logout?redirect=${encodeURIComponent(redirectPath)}`;
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
    },
  });

  const heartbeatSent = useRef(false);
  useEffect(() => {
    if (user && !heartbeatSent.current) {
      heartbeatSent.current = true;
      fetch("/api/analytics/session-heartbeat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      }).catch(() => {});
    }
  }, [user]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}
