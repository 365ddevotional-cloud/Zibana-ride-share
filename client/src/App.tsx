import { lazy, Suspense } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ErrorBoundary } from "@/components/error-boundary";
import { NetworkStatusIndicator } from "@/components/network-status";
import { RiderAppGuard } from "@/components/rider-app-guard";
import { DriverAppGuard } from "@/components/driver-app-guard";
import { APP_MODE, isRoleAllowedInAppMode } from "@/config/appMode";
import { AppModeProvider, useAppMode } from "@/context/AppModeContext";
import { SimulationProvider, SimulationBanner } from "@/context/SimulationContext";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { FullPageLoading } from "@/components/loading-spinner";
import { DashboardSkeleton } from "@/components/loading-skeleton";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import RoleSelectionPage from "@/pages/role-selection";

const RiderHomePage = lazy(() => import("@/pages/rider/home"));
const RiderTripsPage = lazy(() => import("@/pages/rider/trips"));
const RiderWalletPage = lazy(() => import("@/pages/rider/wallet"));
const RiderPaymentsPage = lazy(() => import("@/pages/rider/payments"));
const RiderFundUserPage = lazy(() => import("@/pages/rider/fund-user"));
const DirectorFundDriverPage = lazy(() => import("@/pages/director/fund-driver"));
const DirectorReportsPage = lazy(() => import("@/pages/director/reports"));
const DirectorTrainingPage = lazy(() => import("@/pages/director/training"));
const RiderProfilePage = lazy(() => import("@/pages/rider/profile"));
const RiderSupportPage = lazy(() => import("@/pages/rider/support"));
const UnauthorizedPage = lazy(() => import("@/pages/unauthorized"));
const LegalPage = lazy(() => import("@/pages/legal"));
const ProfilePage = lazy(() => import("@/pages/profile"));
const TripsPage = lazy(() => import("@/pages/trips"));
const WalletPage = lazy(() => import("@/pages/wallet"));
const SettingsPage = lazy(() => import("@/pages/settings"));
const AppearancePage = lazy(() => import("@/pages/settings/appearance"));

const AdminDashboard = lazy(() => import("@/pages/admin/index"));
const ApprovalsPage = lazy(() => import("@/pages/admin/approvals"));

const DriverDashboard = lazy(() => import("@/pages/driver/dashboard"));
const DriverTripsPage = lazy(() => import("@/pages/driver/trips"));
const DriverEarningsPage = lazy(() => import("@/pages/driver/earnings"));
const DriverProfilePage = lazy(() => import("@/pages/driver/profile"));
const DriverSettingsPage = lazy(() => import("@/pages/driver/settings"));
const DriverWalletPage = lazy(() => import("@/pages/driver/wallet"));
const DriverHelpPage = lazy(() => import("@/pages/driver/help"));
const DriverStatementsPage = lazy(() => import("@/pages/driver/statements"));
const DriverAnnualStatementPage = lazy(() => import("@/pages/driver/annual-statement"));
const DriverWelcomePage = lazy(() => import("@/pages/driver/welcome"));
const DriverRegisterPage = lazy(() => import("@/pages/driver/register"));
const DriverWelcomeBackPage = lazy(() => import("@/pages/driver/welcome-back"));
const DriverLostItemsPage = lazy(() => import("@/pages/driver/lost-items"));
const DriverReliefFundPage = lazy(() => import("@/pages/driver/relief-fund"));
const DriverTrainingPage = lazy(() => import("@/pages/driver/training"));
const DriverAccountPage = lazy(() => import("@/pages/driver/account"));
const DriverVehiclePage = lazy(() => import("@/pages/driver/vehicle"));
const DriverDocumentsPage = lazy(() => import("@/pages/driver/documents"));
const DriverInboxPage = lazy(() => import("@/pages/driver/inbox"));
const DriverTermsPrivacyPage = lazy(() => import("@/pages/driver/terms-privacy"));
const DriverDataUsagePage = lazy(() => import("@/pages/driver/data-usage"));
const DriverEmergencyContactsPage = lazy(() => import("@/pages/driver/emergency-contacts"));
const RiderSchedulePage = lazy(() => import("@/pages/rider/schedule"));
const RiderInboxPage = lazy(() => import("@/pages/rider/inbox"));
const RiderActivityPage = lazy(() => import("@/pages/rider/activity"));
const RiderServicesPage = lazy(() => import("@/pages/rider/services"));
const RiderCorporateRidesPage = lazy(() => import("@/pages/rider/corporate-rides"));
const RiderCorporateRidesJoinPage = lazy(() => import("@/pages/rider/corporate-rides-join"));
const RiderCorporateRidesLearnPage = lazy(() => import("@/pages/rider/corporate-rides-learn"));
const RiderSpecialRidesPage = lazy(() => import("@/pages/rider/special-rides"));
const RiderSpecialRideDetailPage = lazy(() => import("@/pages/rider/special-ride-detail"));
const RiderAccountPage = lazy(() => import("@/pages/rider/account"));
const RiderAccountEmailPage = lazy(() => import("@/pages/rider/account-email"));
const RiderAccountPhonePage = lazy(() => import("@/pages/rider/account-phone"));
const RiderAccountSavedPlacesPage = lazy(() => import("@/pages/rider/account-saved-places"));
const RiderAccountNotificationsPage = lazy(() => import("@/pages/rider/account-notifications"));
const RiderAccountMarketingPage = lazy(() => import("@/pages/rider/account-marketing"));
const RiderAccountDataUsagePage = lazy(() => import("@/pages/rider/account-data-usage"));
const RiderAccountRidePinPage = lazy(() => import("@/pages/rider/account-ride-pin"));
const RiderAccountEmergencyPage = lazy(() => import("@/pages/rider/account-emergency"));
const RiderSettingsPage = lazy(() => import("@/pages/rider/settings"));
const RiderTermsPrivacyPage = lazy(() => import("@/pages/rider/terms-privacy"));
const RiderWelcomeBackPage = lazy(() => import("@/pages/rider/welcome-back"));
const HelpCenterPage = lazy(() => import("@/pages/help-center"));
const TrustedContactsPage = lazy(() => import("@/pages/rider/trusted-contacts"));
const SafetyHubPage = lazy(() => import("@/pages/rider/safety-hub"));
const TripSharePage = lazy(() => import("@/pages/trip-share"));
const SimulationEntryPage = lazy(() => import("@/pages/simulation-entry"));
const SavedPlaceFormPage = lazy(() => import("@/pages/rider/saved-place-form"));
const DirectorDashboardPage = lazy(() => import("@/pages/director-dashboard"));
const AboutPage = lazy(() => import("@/pages/public/about"));
const HowItWorksPage = lazy(() => import("@/pages/public/how-it-works"));
const SafetyPage = lazy(() => import("@/pages/public/safety"));
const VerifiedDriversPage = lazy(() => import("@/pages/public/verified-drivers"));
const FeatureLiveTrackingPage = lazy(() => import("@/pages/public/feature-live-tracking"));
const FeaturePaymentsPage = lazy(() => import("@/pages/public/feature-payments"));
const FeatureRatingsPage = lazy(() => import("@/pages/public/feature-ratings"));

const ADMIN_ROLES = ["super_admin", "admin", "finance_admin", "support_agent", "trip_coordinator", "director"];

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

function AdminAccessDenied() {
  const { logout } = useAuth();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">Admin Access Required</h1>
        <p className="text-muted-foreground mb-6">
          You don't have permission to access the admin dashboard. Please contact a super admin if you believe this is an error.
        </p>
        <button 
          onClick={() => logout?.()} 
          className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover-elevate"
          data-testid="button-logout-admin-denied"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

function AdminLoginRequired() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">ZIBA Admin Dashboard</h1>
        <p className="text-muted-foreground mb-6">
          Please sign in with your admin account to access the dashboard.
        </p>
        <a 
          href="/api/login?role=admin"
          className="inline-block px-6 py-2 bg-primary text-primary-foreground rounded-md hover-elevate"
          data-testid="button-admin-login"
        >
          Sign In
        </a>
      </div>
    </div>
  );
}

function DriverAccessDenied() {
  const { logout } = useAuth();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">Driver Access Required</h1>
        <p className="text-muted-foreground mb-6">
          ZIBA Driver is exclusively for registered drivers. If you're a rider, please use the ZIBA Rider app.
        </p>
        <button 
          onClick={() => logout?.()} 
          className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover-elevate"
          data-testid="button-logout-driver-denied"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

function DriverRouter() {
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
    return (
      <LazyComponent>
        <DriverWelcomePage />
      </LazyComponent>
    );
  }

  if (roleLoading) {
    return <FullPageLoading text="Verifying driver access..." />;
  }

  const role = userRole?.role;

  // No role yet - show registration page for new users
  if (!role) {
    return (
      <LazyComponent>
        <DriverRegisterPage />
      </LazyComponent>
    );
  }

  // Has a role but not driver - show access denied
  if (role !== "driver") {
    return <DriverAccessDenied />;
  }

  const welcomeShown = typeof window !== "undefined" && sessionStorage.getItem("ziba-driver-welcome-shown") === "true";

  return (
    <Switch>
      <Route path="/driver">
        {welcomeShown 
          ? <LazyComponent><DriverDashboard /></LazyComponent>
          : <LazyComponent><DriverWelcomeBackPage /></LazyComponent>
        }
      </Route>
      <Route path="/driver/dashboard">
        <LazyComponent><DriverDashboard /></LazyComponent>
      </Route>
      <Route path="/driver/welcome-back">
        <LazyComponent><DriverWelcomeBackPage /></LazyComponent>
      </Route>
      <Route path="/driver/trips">
        <LazyComponent><DriverTripsPage /></LazyComponent>
      </Route>
      <Route path="/driver/earnings">
        <LazyComponent><DriverEarningsPage /></LazyComponent>
      </Route>
      <Route path="/driver/profile">
        <LazyComponent><DriverProfilePage /></LazyComponent>
      </Route>
      <Route path="/driver/settings">
        <LazyComponent><DriverSettingsPage /></LazyComponent>
      </Route>
      <Route path="/driver/welcome">
        <LazyComponent><DriverWelcomePage /></LazyComponent>
      </Route>
      <Route path="/driver/register">
        <LazyComponent><DriverRegisterPage /></LazyComponent>
      </Route>
      <Route path="/driver/wallet">
        <LazyComponent><DriverWalletPage /></LazyComponent>
      </Route>
      <Route path="/driver/statements/annual">
        <LazyComponent><DriverAnnualStatementPage /></LazyComponent>
      </Route>
      <Route path="/driver/statements">
        <LazyComponent><DriverStatementsPage /></LazyComponent>
      </Route>
      <Route path="/driver/help">
        <LazyComponent><DriverHelpPage /></LazyComponent>
      </Route>
      <Route path="/driver/lost-items">
        <LazyComponent><DriverLostItemsPage /></LazyComponent>
      </Route>
      <Route path="/driver/relief-fund">
        <LazyComponent><DriverReliefFundPage /></LazyComponent>
      </Route>
      <Route path="/driver/training">
        <LazyComponent><DriverTrainingPage /></LazyComponent>
      </Route>
      <Route path="/driver/account">
        <LazyComponent><DriverAccountPage /></LazyComponent>
      </Route>
      <Route path="/driver/vehicle">
        <LazyComponent><DriverVehiclePage /></LazyComponent>
      </Route>
      <Route path="/driver/documents">
        <LazyComponent><DriverDocumentsPage /></LazyComponent>
      </Route>
      <Route path="/driver/inbox">
        <LazyComponent><DriverInboxPage /></LazyComponent>
      </Route>
      <Route path="/driver/terms-privacy">
        <LazyComponent><DriverTermsPrivacyPage /></LazyComponent>
      </Route>
      <Route path="/driver/data-usage">
        <LazyComponent><DriverDataUsagePage /></LazyComponent>
      </Route>
      <Route path="/driver/emergency-contacts">
        <LazyComponent><DriverEmergencyContactsPage /></LazyComponent>
      </Route>
      <Route>
        <Redirect to="/driver/dashboard" />
      </Route>
    </Switch>
  );
}

function AdminRouter() {
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
    return <AdminLoginRequired />;
  }

  if (roleLoading) {
    return <FullPageLoading text="Verifying admin access..." />;
  }

  const role = userRole?.role;
  const hasAdminAccess = role && ADMIN_ROLES.includes(role);

  if (!hasAdminAccess) {
    return <AdminAccessDenied />;
  }

  return (
    <Switch>
      <Route path="/admin">
        <LazyComponent><AdminDashboard userRole={role as "super_admin" | "admin" | "director" | "finance" | "trip_coordinator"} /></LazyComponent>
      </Route>
      <Route path="/admin/approvals">
        <LazyComponent><ApprovalsPage /></LazyComponent>
      </Route>
      <Route path="/admin/profile">
        <LazyComponent><ProfilePage /></LazyComponent>
      </Route>
      <Route path="/admin/settings">
        <LazyComponent><SettingsPage /></LazyComponent>
      </Route>
      <Route path="/admin/director-dashboard">
        <LazyComponent><DirectorDashboardPage /></LazyComponent>
      </Route>
      <Route path="/director/dashboard">
        <LazyComponent><DirectorDashboardPage /></LazyComponent>
      </Route>
      <Route path="/director/drivers">
        <LazyComponent><DirectorDashboardPage /></LazyComponent>
      </Route>
      <Route path="/director/funding">
        <LazyComponent><DirectorDashboardPage /></LazyComponent>
      </Route>
      <Route path="/director/wallet/fund-driver">
        <LazyComponent><DirectorFundDriverPage /></LazyComponent>
      </Route>
      <Route path="/director/staff">
        <LazyComponent><DirectorDashboardPage /></LazyComponent>
      </Route>
      <Route path="/director/activity">
        <LazyComponent><DirectorDashboardPage /></LazyComponent>
      </Route>
      <Route path="/director/earnings">
        <LazyComponent><DirectorDashboardPage /></LazyComponent>
      </Route>
      <Route path="/director/reports">
        <LazyComponent><DirectorReportsPage /></LazyComponent>
      </Route>
      <Route path="/director/training">
        <LazyComponent><DirectorTrainingPage /></LazyComponent>
      </Route>
      <Route>
        <Redirect to="/admin" />
      </Route>
    </Switch>
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

  const role = userRole.role;

  // Role-based redirect after login
  if (role === "driver") {
    return <Redirect to="/driver/dashboard" />;
  }
  
  if (role === "director") {
    return <Redirect to="/director/dashboard" />;
  }

  if (ADMIN_ROLES.includes(role)) {
    return <Redirect to="/admin" />;
  }
  
  if (APP_MODE === "RIDER" && !isRoleAllowedInAppMode(role)) {
    return <AccessDeniedPage />;
  }

  const riderWelcomeShown = typeof window !== "undefined" && sessionStorage.getItem("ziba-rider-welcome-shown") === "true";
  if (!riderWelcomeShown) {
    return <Redirect to="/rider/welcome-back" />;
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

function RiderRouter() {
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
      
      <Route path="/about">
        <LazyComponent><AboutPage /></LazyComponent>
      </Route>
      
      <Route path="/how-it-works">
        <LazyComponent><HowItWorksPage /></LazyComponent>
      </Route>
      
      <Route path="/safety">
        <LazyComponent><SafetyPage /></LazyComponent>
      </Route>
      
      <Route path="/safety/verified-drivers">
        <LazyComponent><VerifiedDriversPage /></LazyComponent>
      </Route>
      
      <Route path="/features/live-tracking">
        <LazyComponent><FeatureLiveTrackingPage /></LazyComponent>
      </Route>
      
      <Route path="/features/payments">
        <LazyComponent><FeaturePaymentsPage /></LazyComponent>
      </Route>
      
      <Route path="/features/ratings">
        <LazyComponent><FeatureRatingsPage /></LazyComponent>
      </Route>
      
      <Route path="/legal">
        <LazyComponent><LegalPage /></LazyComponent>
      </Route>
      
      <Route path="/terms">
        <LazyComponent><LegalPage /></LazyComponent>
      </Route>
      
      <Route path="/privacy">
        <LazyComponent><LegalPage /></LazyComponent>
      </Route>
      
      <Route path="/guidelines">
        <LazyComponent><LegalPage /></LazyComponent>
      </Route>
      
      <Route path="/refund-policy">
        <LazyComponent><LegalPage /></LazyComponent>
      </Route>
      
      <Route path="/role-select">
        {user ? <RoleSelectionPage /> : <Redirect to="/welcome" />}
      </Route>
      
      <Route path="/rider/welcome-back">
        <ProtectedRoute user={user} userRole={userRole} isLoading={isLoading} allowedRoles={["rider"]}>
          <LazyComponent><RiderWelcomeBackPage /></LazyComponent>
        </ProtectedRoute>
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
      
      <Route path="/rider/saved-places/:type">
        <ProtectedRoute user={user} userRole={userRole} isLoading={isLoading} allowedRoles={["rider"]}>
          <LazyComponent><SavedPlaceFormPage /></LazyComponent>
        </ProtectedRoute>
      </Route>

      <Route path="/rider/schedule">
        <ProtectedRoute user={user} userRole={userRole} isLoading={isLoading} allowedRoles={["rider"]}>
          <LazyComponent><RiderSchedulePage /></LazyComponent>
        </ProtectedRoute>
      </Route>
      
      <Route path="/rider/trips">
        <ProtectedRoute user={user} userRole={userRole} isLoading={isLoading} allowedRoles={["rider"]}>
          <LazyComponent><RiderTripsPage /></LazyComponent>
        </ProtectedRoute>
      </Route>
      
      <Route path="/rider/activity">
        <ProtectedRoute user={user} userRole={userRole} isLoading={isLoading} allowedRoles={["rider"]}>
          <LazyComponent><RiderActivityPage /></LazyComponent>
        </ProtectedRoute>
      </Route>
      
      <Route path="/rider/services">
        <ProtectedRoute user={user} userRole={userRole} isLoading={isLoading} allowedRoles={["rider"]}>
          <LazyComponent><RiderServicesPage /></LazyComponent>
        </ProtectedRoute>
      </Route>

      <Route path="/rider/services/corporate/join">
        <ProtectedRoute user={user} userRole={userRole} isLoading={isLoading} allowedRoles={["rider"]}>
          <LazyComponent><RiderCorporateRidesJoinPage /></LazyComponent>
        </ProtectedRoute>
      </Route>
      <Route path="/rider/services/corporate/learn">
        <ProtectedRoute user={user} userRole={userRole} isLoading={isLoading} allowedRoles={["rider"]}>
          <LazyComponent><RiderCorporateRidesLearnPage /></LazyComponent>
        </ProtectedRoute>
      </Route>
      <Route path="/rider/services/corporate">
        <ProtectedRoute user={user} userRole={userRole} isLoading={isLoading} allowedRoles={["rider"]}>
          <LazyComponent><RiderCorporateRidesPage /></LazyComponent>
        </ProtectedRoute>
      </Route>

      <Route path="/rider/services/special/:type">
        <ProtectedRoute user={user} userRole={userRole} isLoading={isLoading} allowedRoles={["rider"]}>
          <LazyComponent><RiderSpecialRideDetailPage /></LazyComponent>
        </ProtectedRoute>
      </Route>
      <Route path="/rider/services/special">
        <ProtectedRoute user={user} userRole={userRole} isLoading={isLoading} allowedRoles={["rider"]}>
          <LazyComponent><RiderSpecialRidesPage /></LazyComponent>
        </ProtectedRoute>
      </Route>
      
      <Route path="/rider/account">
        <ProtectedRoute user={user} userRole={userRole} isLoading={isLoading} allowedRoles={["rider"]}>
          <LazyComponent><RiderAccountPage /></LazyComponent>
        </ProtectedRoute>
      </Route>

      <Route path="/rider/account-email">
        <ProtectedRoute user={user} userRole={userRole} isLoading={isLoading} allowedRoles={["rider"]}>
          <LazyComponent><RiderAccountEmailPage /></LazyComponent>
        </ProtectedRoute>
      </Route>

      <Route path="/rider/account-phone">
        <ProtectedRoute user={user} userRole={userRole} isLoading={isLoading} allowedRoles={["rider"]}>
          <LazyComponent><RiderAccountPhonePage /></LazyComponent>
        </ProtectedRoute>
      </Route>

      <Route path="/rider/account-saved-places">
        <ProtectedRoute user={user} userRole={userRole} isLoading={isLoading} allowedRoles={["rider"]}>
          <LazyComponent><RiderAccountSavedPlacesPage /></LazyComponent>
        </ProtectedRoute>
      </Route>

      <Route path="/rider/account-notifications">
        <ProtectedRoute user={user} userRole={userRole} isLoading={isLoading} allowedRoles={["rider"]}>
          <LazyComponent><RiderAccountNotificationsPage /></LazyComponent>
        </ProtectedRoute>
      </Route>

      <Route path="/rider/account-marketing">
        <ProtectedRoute user={user} userRole={userRole} isLoading={isLoading} allowedRoles={["rider"]}>
          <LazyComponent><RiderAccountMarketingPage /></LazyComponent>
        </ProtectedRoute>
      </Route>

      <Route path="/rider/account-data-usage">
        <ProtectedRoute user={user} userRole={userRole} isLoading={isLoading} allowedRoles={["rider"]}>
          <LazyComponent><RiderAccountDataUsagePage /></LazyComponent>
        </ProtectedRoute>
      </Route>

      <Route path="/rider/account-ride-pin">
        <ProtectedRoute user={user} userRole={userRole} isLoading={isLoading} allowedRoles={["rider"]}>
          <LazyComponent><RiderAccountRidePinPage /></LazyComponent>
        </ProtectedRoute>
      </Route>

      <Route path="/rider/account-emergency">
        <ProtectedRoute user={user} userRole={userRole} isLoading={isLoading} allowedRoles={["rider"]}>
          <LazyComponent><RiderAccountEmergencyPage /></LazyComponent>
        </ProtectedRoute>
      </Route>
      
      <Route path="/rider/settings">
        <ProtectedRoute user={user} userRole={userRole} isLoading={isLoading} allowedRoles={["rider"]}>
          <LazyComponent><RiderSettingsPage /></LazyComponent>
        </ProtectedRoute>
      </Route>
      
      <Route path="/rider/terms-privacy">
        <ProtectedRoute user={user} userRole={userRole} isLoading={isLoading} allowedRoles={["rider"]}>
          <LazyComponent><RiderTermsPrivacyPage /></LazyComponent>
        </ProtectedRoute>
      </Route>
      
      <Route path="/rider/wallet">
        <ProtectedRoute user={user} userRole={userRole} isLoading={isLoading} allowedRoles={["rider"]}>
          <LazyComponent><RiderWalletPage /></LazyComponent>
        </ProtectedRoute>
      </Route>
      
      <Route path="/rider/payments/fund-user">
        <ProtectedRoute user={user} userRole={userRole} isLoading={isLoading} allowedRoles={["rider"]}>
          <LazyComponent><RiderFundUserPage /></LazyComponent>
        </ProtectedRoute>
      </Route>
      <Route path="/rider/payments">
        <ProtectedRoute user={user} userRole={userRole} isLoading={isLoading} allowedRoles={["rider"]}>
          <LazyComponent><RiderPaymentsPage /></LazyComponent>
        </ProtectedRoute>
      </Route>
      
      <Route path="/rider/profile">
        <ProtectedRoute user={user} userRole={userRole} isLoading={isLoading} allowedRoles={["rider"]}>
          <LazyComponent><RiderProfilePage /></LazyComponent>
        </ProtectedRoute>
      </Route>
      
      <Route path="/rider/inbox">
        <ProtectedRoute user={user} userRole={userRole} isLoading={isLoading} allowedRoles={["rider"]}>
          <LazyComponent><RiderInboxPage /></LazyComponent>
        </ProtectedRoute>
      </Route>
      
      <Route path="/rider/support">
        <ProtectedRoute user={user} userRole={userRole} isLoading={isLoading} allowedRoles={["rider"]}>
          <LazyComponent><RiderSupportPage /></LazyComponent>
        </ProtectedRoute>
      </Route>
      
      <Route path="/rider/help">
        <ProtectedRoute user={user} userRole={userRole} isLoading={isLoading} allowedRoles={["rider"]}>
          <LazyComponent><HelpCenterPage audience="RIDER" /></LazyComponent>
        </ProtectedRoute>
      </Route>
      
      <Route path="/rider/safety">
        <ProtectedRoute user={user} userRole={userRole} isLoading={isLoading} allowedRoles={["rider"]}>
          <LazyComponent><SafetyHubPage /></LazyComponent>
        </ProtectedRoute>
      </Route>
      
      <Route path="/rider/trusted-contacts">
        <ProtectedRoute user={user} userRole={userRole} isLoading={isLoading} allowedRoles={["rider"]}>
          <LazyComponent><TrustedContactsPage /></LazyComponent>
        </ProtectedRoute>
      </Route>
      
      <Route path="/trip-share/:token">
        <LazyComponent><TripSharePage /></LazyComponent>
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
  const [location] = useLocation();
  
  if (location.startsWith("/admin") || location.startsWith("/driver")) {
    return <>{children}</>;
  }
  
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

function MainRouter() {
  const [location] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  
  const { data: userRole, isLoading: roleLoading } = useQuery<{ role: string } | null>({
    queryKey: ["/api/user/role"],
    enabled: !!user,
    retry: false,
  });
  
  // Handle role-based redirect from root path BEFORE guards
  if (location === "/") {
    if (authLoading) {
      return <FullPageLoading text="Loading..." />;
    }
    
    if (user) {
      if (roleLoading) {
        return <FullPageLoading text="Loading your dashboard..." />;
      }
      
      if (userRole?.role) {
        const role = userRole.role;
        
        // Role-based redirect BEFORE guards can block
        if (role === "driver") {
          return <Redirect to="/driver/dashboard" />;
        }
        
        if (role === "director") {
          return <Redirect to="/director/dashboard" />;
        }

        if (ADMIN_ROLES.includes(role)) {
          return <Redirect to="/admin" />;
        }
      }
    }
  }
  
  if (location === "/simulation") {
    return (
      <LazyComponent>
        <SimulationEntryPage />
      </LazyComponent>
    );
  }

  if (location.startsWith("/admin") || location.startsWith("/director")) {
    return <AdminRouter />;
  }
  
  if (location.startsWith("/driver")) {
    return (
      <DriverAppGuard>
        <DriverRouter />
      </DriverAppGuard>
    );
  }
  
  return (
    <RiderAppGuard>
      <RiderRouter />
    </RiderAppGuard>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="light" storageKey="ziba-ui-theme">
          <TooltipProvider>
            <AppModeProvider>
              <AppModeGuard>
                <SimulationProvider>
                  <SimulationBanner />
                  <Toaster />
                  <NetworkStatusIndicator />
                  <MainRouter />
                </SimulationProvider>
              </AppModeGuard>
            </AppModeProvider>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
