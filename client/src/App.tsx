import { lazy, Suspense } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ErrorBoundary } from "@/components/error-boundary";
import { NetworkStatusIndicator } from "@/components/network-status";
import { RiderAppGuard } from "@/components/rider-app-guard";
import { APP_MODE, isRoleAllowedInAppMode } from "@/config/appMode";
import { AppModeProvider, useAppMode } from "@/context/AppModeContext";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { FullPageLoading } from "@/components/loading-spinner";
import { DashboardSkeleton } from "@/components/loading-skeleton";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import RoleSelectionPage from "@/pages/role-selection";

if (APP_MODE !== "RIDER") {
  throw new Error("Invalid app mode: Rider App expected");
}

const RiderHomePage = lazy(() => import("@/pages/rider/home"));
const RiderTripsPage = lazy(() => import("@/pages/rider/trips"));
const RiderWalletPage = lazy(() => import("@/pages/rider/wallet"));
const RiderProfilePage = lazy(() => import("@/pages/rider/profile"));
const RiderSupportPage = lazy(() => import("@/pages/rider/support"));
const UnauthorizedPage = lazy(() => import("@/pages/unauthorized"));
const LegalPage = lazy(() => import("@/pages/legal"));
const ProfilePage = lazy(() => import("@/pages/profile"));
const TripsPage = lazy(() => import("@/pages/trips"));
const WalletPage = lazy(() => import("@/pages/wallet"));
const SettingsPage = lazy(() => import("@/pages/settings"));
const AppearancePage = lazy(() => import("@/pages/settings/appearance"));

function LazyComponent({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      {children}
    </Suspense>
  );
}

function AccessDeniedPage() {
  const { logout } = useAuth();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">Access Restricted</h1>
        <p className="text-muted-foreground mb-6">
          ZIBA Ride is exclusively for riders. If you're a driver, please download the ZIBA Driver app.
        </p>
        <button 
          onClick={() => logout?.()} 
          className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover-elevate"
          data-testid="button-logout-access-denied"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

function AuthenticatedRoutes() {
  const { user, isLoading: authLoading } = useAuth();
  
  const { data: userRole, isLoading: roleLoading } = useQuery<{ role: string } | null>({
    queryKey: ["/api/user/role"],
    enabled: !!user,
    retry: false,
  });

  if (authLoading) {
    return <FullPageLoading text="Loading..." />;
  }

  if (!user) {
    return <LandingPage />;
  }

  if (roleLoading) {
    return <FullPageLoading text="Loading your dashboard..." />;
  }

  if (!userRole?.role) {
    return <RoleSelectionPage />;
  }

  if (APP_MODE === "RIDER" && !isRoleAllowedInAppMode(userRole.role)) {
    return <AccessDeniedPage />;
  }

  return <Redirect to="/rider/home" />;
}

function ProtectedRoute({ 
  children, 
  allowedRoles,
  user,
  userRole,
  isLoading,
}: { 
  children: React.ReactNode;
  allowedRoles: string[];
  user: any;
  userRole: { role: string } | null | undefined;
  isLoading: boolean;
}) {
  if (!user) {
    return <Redirect to="/welcome" />;
  }
  
  if (isLoading) {
    return <FullPageLoading text="Verifying access..." />;
  }
  
  if (APP_MODE === "RIDER" && userRole?.role && !isRoleAllowedInAppMode(userRole.role)) {
    return <AccessDeniedPage />;
  }
  
  const hasAccess = userRole?.role && allowedRoles.includes(userRole.role);
  
  if (!hasAccess) {
    return <Redirect to="/unauthorized" />;
  }
  
  return <>{children}</>;
}

function Router() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: userRole, isLoading: roleLoading } = useQuery<{ role: string } | null>({
    queryKey: ["/api/user/role"],
    enabled: !!user,
    retry: false,
  });
  
  const isLoading = authLoading || (!!user && roleLoading);

  return (
    <Switch>
      <Route path="/" component={AuthenticatedRoutes} />
      
      <Route path="/welcome" component={LandingPage} />
      
      <Route path="/legal">
        <LazyComponent><LegalPage /></LazyComponent>
      </Route>
      
      <Route path="/role-select">
        {user ? <RoleSelectionPage /> : <Redirect to="/welcome" />}
      </Route>
      
      <Route path="/rider">
        <ProtectedRoute user={user} userRole={userRole} isLoading={isLoading} allowedRoles={["rider"]}>
          <LazyComponent><RiderHomePage /></LazyComponent>
        </ProtectedRoute>
      </Route>
      
      <Route path="/rider/home">
        <ProtectedRoute user={user} userRole={userRole} isLoading={isLoading} allowedRoles={["rider"]}>
          <LazyComponent><RiderHomePage /></LazyComponent>
        </ProtectedRoute>
      </Route>
      
      <Route path="/rider/trips">
        <ProtectedRoute user={user} userRole={userRole} isLoading={isLoading} allowedRoles={["rider"]}>
          <LazyComponent><RiderTripsPage /></LazyComponent>
        </ProtectedRoute>
      </Route>
      
      <Route path="/rider/wallet">
        <ProtectedRoute user={user} userRole={userRole} isLoading={isLoading} allowedRoles={["rider"]}>
          <LazyComponent><RiderWalletPage /></LazyComponent>
        </ProtectedRoute>
      </Route>
      
      <Route path="/rider/profile">
        <ProtectedRoute user={user} userRole={userRole} isLoading={isLoading} allowedRoles={["rider"]}>
          <LazyComponent><RiderProfilePage /></LazyComponent>
        </ProtectedRoute>
      </Route>
      
      <Route path="/rider/support">
        <ProtectedRoute user={user} userRole={userRole} isLoading={isLoading} allowedRoles={["rider"]}>
          <LazyComponent><RiderSupportPage /></LazyComponent>
        </ProtectedRoute>
      </Route>
      
      <Route path="/unauthorized">
        <LazyComponent><UnauthorizedPage /></LazyComponent>
      </Route>
      
      <Route path="/profile">
        {user ? <LazyComponent><ProfilePage /></LazyComponent> : <Redirect to="/welcome" />}
      </Route>
      
      <Route path="/trips">
        {user ? <LazyComponent><TripsPage /></LazyComponent> : <Redirect to="/welcome" />}
      </Route>
      
      <Route path="/wallet">
        {user ? <LazyComponent><WalletPage /></LazyComponent> : <Redirect to="/welcome" />}
      </Route>
      
      <Route path="/settings">
        {user ? <LazyComponent><SettingsPage /></LazyComponent> : <Redirect to="/welcome" />}
      </Route>
      
      <Route path="/settings/appearance">
        {user ? <LazyComponent><AppearancePage /></LazyComponent> : <Redirect to="/welcome" />}
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function AppModeGuard({ children }: { children: React.ReactNode }) {
  const appMode = useAppMode();
  
  if (appMode !== "RIDER") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">Invalid App Mode</h1>
          <p className="text-muted-foreground">This app is configured for riders only.</p>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="light" storageKey="ziba-ui-theme">
          <TooltipProvider>
            <AppModeProvider>
              <AppModeGuard>
                <RiderAppGuard>
                  <Toaster />
                  <NetworkStatusIndicator />
                  <Router />
                </RiderAppGuard>
              </AppModeGuard>
            </AppModeProvider>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
