import { lazy, Suspense } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ErrorBoundary } from "@/components/error-boundary";
import { NetworkStatusIndicator } from "@/components/network-status";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { FullPageLoading } from "@/components/loading-spinner";
import { DashboardSkeleton } from "@/components/loading-skeleton";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import RoleSelectionPage from "@/pages/role-selection";

const DriverDashboard = lazy(() => import("@/pages/driver/index"));
const DriverSetupPage = lazy(() => import("@/pages/driver/setup"));
const DriverProfilePage = lazy(() => import("@/pages/driver/profile"));
const RiderDashboard = lazy(() => import("@/pages/rider/index"));
const AdminDashboard = lazy(() => import("@/pages/admin/index"));
const AdminSetupPage = lazy(() => import("@/pages/admin-setup"));
const CoordinatorDashboard = lazy(() => import("@/pages/coordinator/index"));
const SupportDashboard = lazy(() => import("@/pages/support/index"));

function LazyComponent({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      {children}
    </Suspense>
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

  if (userRole.role === "admin") {
    return (
      <LazyComponent>
        <AdminDashboard userRole="admin" />
      </LazyComponent>
    );
  }

  if (userRole.role === "director") {
    return (
      <LazyComponent>
        <AdminDashboard userRole="director" />
      </LazyComponent>
    );
  }

  if (userRole.role === "driver") {
    return (
      <LazyComponent>
        <DriverDashboard />
      </LazyComponent>
    );
  }

  if (userRole.role === "trip_coordinator") {
    return (
      <LazyComponent>
        <CoordinatorDashboard />
      </LazyComponent>
    );
  }

  if (userRole.role === "support_agent") {
    return (
      <LazyComponent>
        <SupportDashboard />
      </LazyComponent>
    );
  }

  return (
    <LazyComponent>
      <RiderDashboard />
    </LazyComponent>
  );
}

function Router() {
  const { user } = useAuth();
  const { data: userRole } = useQuery<{ role: string } | null>({
    queryKey: ["/api/user/role"],
    enabled: !!user,
    retry: false,
  });

  return (
    <Switch>
      <Route path="/" component={AuthenticatedRoutes} />
      
      <Route path="/role-select">
        {user ? <RoleSelectionPage /> : <Redirect to="/" />}
      </Route>
      
      <Route path="/driver">
        {user && userRole?.role === "driver" ? (
          <LazyComponent><DriverDashboard /></LazyComponent>
        ) : <Redirect to="/" />}
      </Route>
      
      <Route path="/driver/setup">
        {user && userRole?.role === "driver" ? (
          <LazyComponent><DriverSetupPage /></LazyComponent>
        ) : <Redirect to="/" />}
      </Route>
      
      <Route path="/driver/profile">
        {user && userRole?.role === "driver" ? (
          <LazyComponent><DriverProfilePage /></LazyComponent>
        ) : <Redirect to="/" />}
      </Route>
      
      <Route path="/rider">
        {user && userRole?.role === "rider" ? (
          <LazyComponent><RiderDashboard /></LazyComponent>
        ) : <Redirect to="/" />}
      </Route>
      
      <Route path="/admin">
        {user && (userRole?.role === "admin" || userRole?.role === "director") ? (
          <LazyComponent>
            <AdminDashboard userRole={userRole?.role || "admin"} />
          </LazyComponent>
        ) : <Redirect to="/" />}
      </Route>
      
      <Route path="/admin/setup">
        {user ? (
          <LazyComponent><AdminSetupPage /></LazyComponent>
        ) : <Redirect to="/" />}
      </Route>
      
      <Route path="/coordinator">
        {user && userRole?.role === "trip_coordinator" ? (
          <LazyComponent><CoordinatorDashboard /></LazyComponent>
        ) : <Redirect to="/" />}
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="light" storageKey="ziba-ui-theme">
          <TooltipProvider>
            <Toaster />
            <NetworkStatusIndicator />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
