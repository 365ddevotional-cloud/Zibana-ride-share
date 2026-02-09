export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

// Get the current role context based on URL path
export function getCurrentRoleContext(): "rider" | "driver" | "admin" {
  const path = window.location.pathname;
  if (path.startsWith("/driver")) return "driver";
  if (path.startsWith("/admin")) return "admin";
  return "rider";
}

// Redirect to login with a toast notification
export function redirectToLogin(toast?: (options: { title: string; description: string; variant: string }) => void) {
  if (toast) {
    toast({
      title: "Unauthorized",
      description: "You are logged out. Logging in again...",
      variant: "destructive",
    });
  }
  setTimeout(() => {
    window.location.href = `/api/login`;
  }, 500);
}
