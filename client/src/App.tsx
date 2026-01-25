import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { FullPageLoading } from "@/components/loading-spinner";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import RoleSelectionPage from "@/pages/role-selection";
import DriverDashboard from "@/pages/driver/index";
import DriverSetupPage from "@/pages/driver/setup";
import DriverProfilePage from "@/pages/driver/profile";
import RiderDashboard from "@/pages/rider/index";
import AdminDashboard from "@/pages/admin/index";
import AdminSetupPage from "@/pages/admin-setup";
import CoordinatorDashboard from "@/pages/coordinator/index";

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
    return <AdminDashboard userRole="admin" />;
  }

  if (userRole.role === "director") {
    return <AdminDashboard userRole="director" />;
  }

  if (userRole.role === "driver") {
    return <DriverDashboard />;
  }

  if (userRole.role === "trip_coordinator") {
    return <CoordinatorDashboard />;
  }

  return <RiderDashboard />;
}

function Router() {
  const { user, isLoading } = useAuth();
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
        {user && userRole?.role === "driver" ? <DriverDashboard /> : <Redirect to="/" />}
      </Route>
      
      <Route path="/driver/setup">
        {user && userRole?.role === "driver" ? <DriverSetupPage /> : <Redirect to="/" />}
      </Route>
      
      <Route path="/driver/profile">
        {user && userRole?.role === "driver" ? <DriverProfilePage /> : <Redirect to="/" />}
      </Route>
      
      <Route path="/rider">
        {user && userRole?.role === "rider" ? <RiderDashboard /> : <Redirect to="/" />}
      </Route>
      
      <Route path="/admin">
        {user && (userRole?.role === "admin" || userRole?.role === "director") 
          ? <AdminDashboard userRole={userRole?.role || "admin"} /> 
          : <Redirect to="/" />}
      </Route>
      
      <Route path="/admin/setup">
        {user ? <AdminSetupPage /> : <Redirect to="/" />}
      </Route>
      
      <Route path="/coordinator">
        {user && userRole?.role === "trip_coordinator" ? <CoordinatorDashboard /> : <Redirect to="/" />}
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="ziba-ui-theme">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
