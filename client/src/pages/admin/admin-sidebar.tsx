import { Link } from "wouter";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Activity,
  HeartPulse,
  Rocket,
  CheckSquare,
  Car,
  Users,
  Briefcase,
  UserCheck,
  Shield,
  UserPlus,
  TestTube,
  BookOpen,
  Award,
  Ban,
  MapPin,
  Calendar,
  Layers,
  Settings2,
  Building,
  Zap,
  Play,
  Percent,
  DollarSign,
  Wallet,
  ArrowLeftRight,
  Banknote,
  CreditCard,
  ShieldAlert,
  AlertTriangle,
  FileText,
  Star,
  Mail,
  Headphones,
  ScrollText,
  Package,
  Heart,
  Gift,
  BarChart3,
  TrendingUp,
  Target,
  Globe,
  Settings,
  MessageCircle,
  Brain,
} from "lucide-react";

const sidebarSections = [
  {
    label: "Control Center",
    items: [
      { value: "overview", label: "Overview", icon: LayoutDashboard, route: "/admin/control/overview" },
      { value: "monitoring", label: "Monitoring", icon: Activity, route: "/admin/control/monitoring" },
      { value: "health-alerts", label: "Health Alerts", icon: HeartPulse, route: "/admin/control/alerts" },
      { value: "launch-readiness", label: "Launch Readiness", icon: Rocket, route: "/admin/control/launch" },
      { value: "ops-readiness", label: "Ops Readiness", icon: CheckSquare, route: "/admin/control/ops" },
      { value: "qa-monitor", label: "QA Monitor", icon: TestTube, route: "/admin/control/qa-monitor" },
      { value: "system-stability", label: "System Stability", icon: HeartPulse, route: "/admin/control/stability" },
    ],
  },
  {
    label: "Users & People",
    items: [
      { value: "drivers", label: "Drivers", icon: Car, route: "/admin/users/drivers" },
      { value: "riders", label: "Riders", icon: Users, route: "/admin/users/riders" },
      { value: "directors", label: "Directors", icon: Briefcase, route: "/admin/users/directors" },
      { value: "my-drivers", label: "My Drivers", icon: UserCheck, route: "/admin/users/my-drivers" },
      { value: "admin-management", label: "Admin Management", icon: Shield, route: "/admin/users/admin-management" },
      { value: "role-appointments", label: "Role Appointments", icon: UserPlus, route: "/admin/users/role-appointments" },
      { value: "training-mode", label: "Training Mode", icon: TestTube, route: "/admin/users/training-mode" },
      { value: "training-center", label: "Training Center", icon: BookOpen, route: "/admin/users/training-center" },
      { value: "rider-trust", label: "Rider Trust", icon: Award, route: "/admin/users/rider-trust" },
      { value: "pairing-blocks", label: "Pairing Blocks", icon: Ban, route: "/admin/users/pairing-blocks" },
    ],
  },
  {
    label: "Trips & Operations",
    items: [
      { value: "trips", label: "Trips", icon: MapPin, route: "/admin/trips" },
      { value: "reservations", label: "Reservations", icon: Calendar, route: "/admin/reservations" },
      { value: "ride-classes", label: "Ride Classes", icon: Layers, route: "/admin/ride-classes" },
      { value: "driver-prefs", label: "Driver Preferences", icon: Settings2, route: "/admin/driver-prefs" },
      { value: "corporate", label: "Corporate Rides", icon: Building, route: "/admin/corporate" },
      { value: "special-rides", label: "Special Rides", icon: Zap, route: "/admin/special-rides" },
      { value: "simulation", label: "Simulation", icon: Play, route: "/admin/simulation" },
      { value: "fee-settings", label: "Fee Settings", icon: Percent, route: "/admin/fee-settings" },
    ],
  },
  {
    label: "Finance & Wallets",
    items: [
      { value: "payouts", label: "Payouts", icon: DollarSign, route: "/admin/finance/payouts" },
      { value: "wallets", label: "Wallets", icon: Wallet, route: "/admin/finance/wallets" },
      { value: "wallet-funding", label: "Wallet Funding", icon: ArrowLeftRight, route: "/admin/finance/funding" },
      { value: "director-funding", label: "Director Funding", icon: Banknote, route: "/admin/finance/director-funding" },
      { value: "third-party-funding", label: "Third-Party Funding", icon: Users, route: "/admin/finance/third-party" },
      { value: "refunds", label: "Refunds", icon: CreditCard, route: "/admin/finance/refunds" },
      { value: "chargebacks", label: "Chargebacks", icon: ShieldAlert, route: "/admin/finance/chargebacks" },
      { value: "bank-transfers", label: "Bank Transfers", icon: ArrowLeftRight, route: "/admin/finance/bank-transfers" },
      { value: "cash-settlements", label: "Cash Settlements", icon: Banknote, route: "/admin/finance/cash-settlements" },
      { value: "cash-disputes", label: "Cash Disputes", icon: AlertTriangle, route: "/admin/finance/cash-disputes" },
      { value: "tax-documents", label: "Tax Documents", icon: FileText, route: "/admin/finance/tax-documents" },
    ],
  },
  {
    label: "Ratings & Support",
    items: [
      { value: "ratings", label: "Ratings", icon: Star, route: "/admin/support/ratings" },
      { value: "disputes", label: "Disputes", icon: AlertTriangle, route: "/admin/support/disputes" },
      { value: "inbox", label: "Inbox", icon: Mail, route: "/admin/support/inbox" },
      { value: "help-center", label: "Help Center", icon: Headphones, route: "/admin/support/help-center" },
      { value: "support-logs", label: "Support Logs", icon: ScrollText, route: "/admin/support/logs" },
    ],
  },
  {
    label: "Safety & Compliance",
    items: [
      { value: "fraud", label: "Fraud Detection", icon: ShieldAlert, route: "/admin/safety/fraud" },
      { value: "safety", label: "Safety", icon: Shield, route: "/admin/safety/overview" },
      { value: "lost-items", label: "Lost Items", icon: Package, route: "/admin/safety/lost-items" },
      { value: "lost-item-fraud", label: "Lost Item Fraud", icon: AlertTriangle, route: "/admin/safety/lost-item-fraud" },
      { value: "accident-reports", label: "Accident Reports", icon: FileText, route: "/admin/safety/accident-reports" },
      { value: "insurance", label: "Insurance", icon: Heart, route: "/admin/safety/insurance" },
      { value: "relief-fund", label: "Relief Fund", icon: Gift, route: "/admin/safety/relief-fund" },
      { value: "compliance-logs", label: "Compliance Logs", icon: ScrollText, route: "/admin/safety/compliance-logs" },
      { value: "store-compliance", label: "Store Compliance", icon: CheckSquare, route: "/admin/safety/store-compliance" },
      { value: "chat-logs", label: "Chat Logs", icon: MessageCircle, route: "/admin/safety/chat-logs" },
    ],
  },
  {
    label: "Growth & Intelligence",
    items: [
      { value: "reports", label: "Reports", icon: BarChart3, route: "/admin/growth/reports" },
      { value: "growth", label: "Growth", icon: TrendingUp, route: "/admin/growth/overview" },
      { value: "user-growth", label: "User Growth", icon: UserPlus, route: "/admin/growth/user-growth" },
      { value: "incentives", label: "Incentives", icon: Gift, route: "/admin/growth/incentives" },
      { value: "acquisition", label: "Acquisition", icon: Target, route: "/admin/growth/acquisition" },
      { value: "countries", label: "Countries", icon: Globe, route: "/admin/growth/countries" },
      { value: "contracts", label: "Contracts", icon: FileText, route: "/admin/growth/contracts" },
      { value: "overrides", label: "Overrides", icon: Settings, route: "/admin/growth/overrides" },
      { value: "zibra-insights", label: "ZIBRA Insights", icon: Activity, route: "/admin/growth/zibra-insights" },
      { value: "welcome-insights", label: "Welcome Insights", icon: Zap, route: "/admin/growth/welcome-insights" },
      { value: "zibra-governance", label: "ZIBRA Governance", icon: Shield, route: "/admin/growth/zibra-governance" },
      { value: "director-settings", label: "Director Settings", icon: Settings2, route: "/admin/growth/director-settings" },
      { value: "director-performance", label: "Director Performance", icon: Award, route: "/admin/growth/director-performance" },
      { value: "ai-audit", label: "AI Audit Log", icon: Brain, route: "/admin/growth/ai-audit" },
    ],
  },
];

interface AdminSidebarProps {
  activeTab?: string;
}

export function AdminSidebar({ activeTab }: AdminSidebarProps) {
  return (
    <SidebarContent>
      {sidebarSections.map((section) => (
        <SidebarGroup key={section.label}>
          <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {section.items.map((item) => (
                <SidebarMenuItem key={item.value}>
                  <SidebarMenuButton
                    asChild
                    isActive={activeTab === item.value}
                    data-testid={`nav-${item.value}`}
                  >
                    <Link href={item.route}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </SidebarContent>
  );
}

export { sidebarSections };
