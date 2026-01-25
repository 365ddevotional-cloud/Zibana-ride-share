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

function ProtectedRoute({ 
  children, 
  allowedRoles,
  user,
  userRole,
  isLoading
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
  
  if (!userRole?.role || !allowedRoles.includes(userRole.role)) {
    return <Redirect to="/" />;
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
      
      <Route path="/role-select">
        {user ? <RoleSelectionPage /> : <Redirect to="/welcome" />}
      </Route>
      
      <Route path="/driver">
        <ProtectedRoute user={user} userRole={userRole} isLoading={isLoading} allowedRoles={["driver"]}>
          <LazyComponent><DriverDashboard /></LazyComponent>
        </ProtectedRoute>
      </Route>
      
      <Route path="/driver/setup">
        <ProtectedRoute user={user} userRole={userRole} isLoading={isLoading} allowedRoles={["driver"]}>
          <LazyComponent><DriverSetupPage /></LazyComponent>
        </ProtectedRoute>
      </Route>
      
      <Route path="/driver/profile">
        <ProtectedRoute user={user} userRole={userRole} isLoading={isLoading} allowedRoles={["driver"]}>
          <LazyComponent><DriverProfilePage /></LazyComponent>
        </ProtectedRoute>
      </Route>
      
      <Route path="/rider">
        <ProtectedRoute user={user} userRole={userRole} isLoading={isLoading} allowedRoles={["rider"]}>
          <LazyComponent><RiderDashboard /></LazyComponent>
        </ProtectedRoute>
      </Route>
      
      <Route path="/admin">
        <ProtectedRoute user={user} userRole={userRole} isLoading={isLoading} allowedRoles={["admin", "director"]}>
          <LazyComponent>
            <AdminDashboard userRole={(userRole?.role as "admin" | "director") || "admin"} />
          </LazyComponent>
        </ProtectedRoute>
      </Route>
      
      <Route path="/admin/setup">
        {user ? (
          <LazyComponent><AdminSetupPage /></LazyComponent>
        ) : <Redirect to="/welcome" />}
      </Route>
      
      <Route path="/coordinator">
        <ProtectedRoute user={user} userRole={userRole} isLoading={isLoading} allowedRoles={["trip_coordinator"]}>
          <LazyComponent><CoordinatorDashboard /></LazyComponent>
        </ProtectedRoute>
      </Route>
      
      <Route path="/support">
        <ProtectedRoute user={user} userRole={userRole} isLoading={isLoading} allowedRoles={["support_agent"]}>
          <LazyComponent><SupportDashboard /></LazyComponent>
        </ProtectedRoute>
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
