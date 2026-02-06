import { DriverLayout } from "@/components/driver/DriverLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { 
  DollarSign, 
  Star, 
  Shield, 
  Smartphone, 
  Gift, 
  HelpCircle, 
  AlertTriangle,
  ChevronRight,
  FileWarning,
  CheckCircle,
  Clock
} from "lucide-react";
import { useLocation } from "wouter";

const helpCategories = [
  { 
    id: "getting-paid", 
    title: "Getting Paid", 
    description: "Withdrawals, wallet, earnings breakdown",
    icon: DollarSign,
    color: "text-emerald-600"
  },
  { 
    id: "trips-ratings", 
    title: "Trips & Ratings", 
    description: "Trip issues, ratings, disputes",
    icon: Star,
    color: "text-yellow-600"
  },
  { 
    id: "safety", 
    title: "Safety", 
    description: "Emergency, incident reports, SOS",
    icon: Shield,
    color: "text-red-600"
  },
  { 
    id: "app-usage", 
    title: "App Usage", 
    description: "How to use the app, navigation, settings",
    icon: Smartphone,
    color: "text-blue-600"
  },
  { 
    id: "incentives", 
    title: "Incentives", 
    description: "Bonuses, promotions, rewards",
    icon: Gift,
    color: "text-purple-600"
  },
];

interface SafetyIncident {
  id: string;
  incidentType: string;
  severity: string;
  status: string;
  createdAt: string;
}

export default function DriverHelpPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: incidents = [] } = useQuery<SafetyIncident[]>({
    queryKey: ["/api/safety/incidents/mine"],
    enabled: !!user,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "resolved":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Resolved</Badge>;
      case "under_review":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Under Review</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">{status}</Badge>;
    }
  };

  return (
    <DriverLayout>
      <div className="p-4 space-y-6">
        <h1 className="text-xl font-bold" data-testid="text-help-title">Help Center</h1>

        <div className="space-y-3">
          {helpCategories.map((category) => {
            const Icon = category.icon;
            return (
              <Card 
                key={category.id} 
                className="hover-elevate cursor-pointer"
                data-testid={`card-help-${category.id}`}
              >
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <Icon className={`h-5 w-5 ${category.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{category.title}</p>
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card data-testid="card-safety-center">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-500" />
              Safety Center
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <span className="text-sm">Trip recording</span>
              </div>
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">Active</Badge>
            </div>

            <Button 
              variant="destructive" 
              className="w-full"
              onClick={() => setLocation("/driver/dashboard")}
              data-testid="button-sos-help"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              SOS - Emergency Help
            </Button>

            <Button 
              variant="outline" 
              className="w-full"
              data-testid="button-report-incident"
            >
              <FileWarning className="h-4 w-4 mr-2" />
              Report an Incident
            </Button>
          </CardContent>
        </Card>

        {incidents.length > 0 && (
          <Card data-testid="card-incident-history">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileWarning className="h-4 w-4" />
                Report History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {incidents.slice(0, 5).map((incident) => (
                <div key={incident.id} className="flex items-center justify-between gap-2" data-testid={`incident-${incident.id}`}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{incident.incidentType.replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(incident.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {getStatusBadge(incident.status)}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card className="hover-elevate cursor-pointer" data-testid="card-full-help-center">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <HelpCircle className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Full Help Center</p>
                <p className="text-sm text-muted-foreground">Browse all articles and FAQs</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>
    </DriverLayout>
  );
}
